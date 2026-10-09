import { WORLD } from './shared.js';

// Original duel rules inspired by directional swordplay. Art never determines
// collision: all durations are seconds and all geometry uses WORLD coordinates.
const BODY_HALF = 18;
const MIN_X = 54;
const MAX_X = WORLD.width - MIN_X;
const STEP = 1 / 120;
const MAX_CHARGE = 0.72;
const POST_VICTORY_SECONDS = 5;
const DIRECTIONS = ['high', 'mid', 'low'];
const ACTIONS = ['attack', 'parry', 'dodge', 'duck', 'counter', 'shove'];
// Contact sparks follow the authored head/chest/shin blade positions.
const HEIGHT = { high: WORLD.ground - 104, mid: WORLD.ground - 89, low: WORLD.ground - 29 };
const DIRECTION_NAME = { high: 'HIGH', mid: 'MID', low: 'LOW' };
// A quick cut can be withdrawn by switching to an adjacent line this early in its wind-up.
const FEINT_WINDOW = 0.13;
// How often each difficulty aims at the line the player is not guarding.
const OPEN_LINE = { beginner: 0.35, normal: 0.55, hard: 0.75 };
const PROFILES = {
  beginner: { speed: 145, windup: 0.40, reaction: 0.28, attackChance: 0.47, parryChance: 0.18, evadeChance: 0.16 },
  normal: { speed: 172, windup: 0.30, reaction: 0.22, attackChance: 0.56, parryChance: 0.30, evadeChance: 0.25 },
  hard: { speed: 195, windup: 0.23, reaction: 0.16, attackChance: 0.63, parryChance: 0.40, evadeChance: 0.32 }
};

function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  let hash = 2166136261;
  for (const character of String(seed ?? 113)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fighter(x, facing) {
  return {
    x, facing, state: 'idle', previousState: 'idle', recoveryKind: null,
    timer: 0, stateDuration: 0, dead: false, deathTimer: 0,
    stance: 'mid', guardDirection: 'mid', attackDirection: 'mid',
    attackKind: 'normal', attackId: 0, charge: 0, chargeTime: 0,
    counterWindow: 0, counterReady: false, moveDirection: 0, evadeMode: null, duckHeld: false,
    fatigue: 0, knockback: 0, shoveCooldown: 0, shoveKind: 'push', guarding: false,
    hitDirection: null, hitLevel: null,
    _contact: false, _evadedAttack: 0, _protectedAttack: 0,
    _buffer: null, _bufferTime: 0, _shoveResolved: false,
    _aiChargeDuration: 0, _aiGuardDuration: 0, _guardArmed: false, _leaveDuck: false, _feintUsed: false
  };
}

function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
function ready(f) { return f.state === 'idle' || f.state === 'walk'; }
function overlaps(a, b) { return a[0] <= b[1] && a[1] >= b[0]; }
function direction(value) { return DIRECTIONS.includes(value) ? value : 'mid'; }
function visibleFighter(f) {
  // Internal buffering/contact bookkeeping does not belong in renderer snapshots.
  return Object.fromEntries(Object.entries(f).filter(([key]) => !key.startsWith('_')));
}

/**
 * tick(seconds, input): left/right move; aim ('high'|'mid'|'low') latches the
 * stance. up/down are optional aim aliases. attack is hold-to-charge/release-to-
 * strike; parry holds a directional guard; dodge backsteps against vertical
 * cuts; duck advances under mid cuts; counter spends a real block/evade window;
 * shove interrupts at close range. Fresh actions can buffer for 0.14 seconds.
 *
 * Fighter timer/deathTimer are elapsed. attackDirection is locked at release,
 * while stance/guardDirection can still change. charge and fatigue are 0..1.
 * Effects: {id,type,x,y,facing,age,duration,direction,attackKind,strength}.
 * hitstop freezes simulation, but advances impact effects and accepts buffers.
 * A decisive hit fixes result immediately, then phase='postVictory' retains
 * five seconds of winner control. postVictoryRemaining pauses with simulation;
 * AI/collisions stop, and phase='result' signals that the result UI may open.
 */
export class DuelEngine {
  constructor({ seed = 113, difficulty = 'beginner' } = {}) {
    this.difficulty = difficulty === 'easy' ? 'beginner' : (PROFILES[difficulty] ? difficulty : 'beginner');
    this._profile = PROFILES[this.difficulty];
    this._seed = hashSeed(seed);
    this.reset();
  }

  reset(seed) {
    if (seed !== undefined) this._seed = hashSeed(seed);
    this._rngState = this._seed;
    this._player = fighter(260, 1);
    this._opponent = fighter(700, -1);
    this.phase = 'countdown';
    this.countdown = 2.4;
    this.time = 0;
    this.result = null;
    this.postVictoryRemaining = 0;
    this.paused = false;
    this.hitstop = 0;
    this.shake = 0;
    this.message = 'Ready · One cut wins';
    this._effects = [];
    this._effectSerial = 0;
    this._attackSerial = 0;
    this._held = Object.fromEntries(ACTIONS.map(action => [action, false]));
    this._releaseRequired = { ...this._held };
    this._playerAttackSerial = 0;
    this._playerFeintSerial = 0;
    this._seenPlayerFeintSerial = 0;
    this._seenPlayerAttackSerial = 0;
    this._pendingThreatAt = Infinity;
    this._nextDecisionAt = 2.8;
    this._retreatUntil = 0;
    this._aiMove = 0;
    this._aiTemperament = ['measured', 'aggressive', 'tricky'][Math.floor(this._random() * 3)];
    return this.snapshot();
  }

  setPaused(paused) {
    const next = Boolean(paused);
    if (next !== this.paused) {
      this.paused = next;
      this._effects = [];
      this._held = Object.fromEntries(ACTIONS.map(action => [action, false]));
      // Focus loss must never release a held charge into an unexpected strike.
      this._releaseRequired = Object.fromEntries(ACTIONS.map(action => [action, true]));
      this._player._buffer = null;
      this._player._bufferTime = 0;
      this._player._guardArmed = false;
      if (this._player.state === 'charge' || this._player.state === 'parry') {
        this._player.charge = this._player.chargeTime = 0;
        this._setState(this._player, 'idle');
      }
      this._aiMove = 0;
      this._pendingThreatAt = Infinity;
      this._nextDecisionAt = this.time + 0.30;
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      phase: this.phase, countdown: Math.max(0, this.countdown), time: this.time,
      player: visibleFighter(this._player), opponent: visibleFighter(this._opponent),
      result: this.result, postVictoryRemaining: this.postVictoryRemaining,
      effects: this._effects.map(effect => ({ ...effect })),
      message: this.message, paused: this.paused, hitstop: this.hitstop, shake: this.shake,
      opponentTactic: this._aiTemperament
    };
  }

  tick(seconds, input = {}) {
    if (this.paused || !Number.isFinite(seconds) || seconds <= 0) return this.snapshot();
    const elapsed = Math.min(seconds, 0.25);
    const controls = Object.fromEntries(ACTIONS.map(action => [action, Boolean(input[action])]));
    controls.left = Boolean(input.left);
    controls.right = Boolean(input.right);
    controls.aim = DIRECTIONS.includes(input.aim) ? input.aim : input.up ? 'high' : input.down ? 'low' : null;
    const edges = {};
    for (const action of ACTIONS) {
      if (!controls[action]) this._releaseRequired[action] = false;
      edges[action] = controls[action] && !this._held[action] && !this._releaseRequired[action];
      this._held[action] = controls[action];
      if (this._releaseRequired[action]) controls[action] = false;
    }
    // Only a living player can act during the winner's aftermath. Inputs held
    // through countdown still do not become queued combat actions.
    if (!this._playerCanAct()) for (const action of ACTIONS) edges[action] = false;
    const steps = Math.ceil(elapsed / STEP);
    const dt = elapsed / steps;
    for (let i = 0; i < steps; i++) this._step(dt, controls, i === 0 ? edges : {});
    return this.snapshot();
  }

  _playerCanAct() {
    return this.phase === 'playing' || this.phase === 'postVictory' && this.result === 'victory';
  }

  _random() {
    this._rngState = (this._rngState + 0x6d2b79f5) >>> 0;
    let value = this._rngState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  _setState(f, state, duration = 0) {
    const oldState = f.state;
    f.previousState = oldState;
    if (state === 'recovery') {
      f.recoveryKind = ['windup', 'active', 'charge'].includes(oldState) ? 'attack' : oldState;
    } else if (state !== 'recovery') f.recoveryKind = null;
    f.state = state;
    f.timer = 0;
    f.stateDuration = duration;
    f.dead = state === 'dead';
    if (state !== 'dodge' && state !== 'duck') f.evadeMode = null;
    if (state !== 'duck') f.duckHeld = false;
    if (state !== 'parry' && state !== 'duck') f.guarding = false;
    if (state === 'dead') f.deathTimer = 0;
  }

  _effect(type, x, y, facing = 1, duration = 0.38, details = {}) {
    this._effects.push({ id: ++this._effectSerial, type, x, y, facing, age: 0, duration, ...details });
  }

  _impact(seconds, strength) {
    this.hitstop = Math.max(this.hitstop, seconds);
    this.shake = Math.max(this.shake, strength);
  }

  _startCharge(f, duration = MAX_CHARGE) {
    if (!ready(f) && f.state !== 'parry') return false;
    f.charge = 0;
    f.chargeTime = 0;
    f.attackDirection = f.stance;
    f.attackKind = 'normal';
    f._aiChargeDuration = duration;
    this._setState(f, 'charge', MAX_CHARGE);
    if (f === this._opponent) this.message = `Rival winds up ${DIRECTION_NAME[f.stance]}`;
    return true;
  }

  _canCounter(f) {
    return f.counterWindow > 0 && !f.dead &&
      ['idle', 'walk', 'parry', 'recovery', 'dodge', 'duck', 'charge'].includes(f.state);
  }

  _attack(f, kind = 'normal', charge = 0) {
    const counter = kind === 'counter';
    if (counter ? !this._canCounter(f) : !ready(f) && f.state !== 'charge' && f.state !== 'parry') return false;
    f.attackDirection = direction(f.stance);
    f.attackKind = counter ? 'counter' : charge >= 0.18 ? 'charged' : 'normal';
    f.charge = counter ? 0 : clamp(charge, 0, 1);
    f.attackId = ++this._attackSerial;
    f._contact = false;
    f._protectedAttack = counter ? f._evadedAttack : 0;
    f.counterWindow = 0;
    f.counterReady = false;
    const isPlayer = f === this._player;
    const base = isPlayer ? (f.attackDirection === 'mid' ? 0.13 : 0.19) : this._profile.windup + (f.attackDirection === 'mid' ? 0 : 0.06);
    const windup = counter ? (isPlayer ? 0.065 : 0.14) : Math.max(0.085, base - f.charge * 0.045) + f.fatigue * 0.055;
    f.fatigue = clamp(f.fatigue + 0.10 + f.charge * 0.08, 0, 1);
    this._setState(f, 'windup', windup);
    if (isPlayer) this._playerAttackSerial++;
    else this.message = `${DIRECTION_NAME[f.attackDirection]} cut · ${f.attackDirection === 'mid' ? 'Duck / match guard' : 'Backstep / match guard'}`;
    return true;
  }

  /** Switching to an adjacent line early in a quick cut withdraws it: a feint. Once per committed swing. */
  _feint(f, previous) {
    if (f.state !== 'windup' || f.timer > FEINT_WINDOW || f._feintUsed || f.attackKind !== 'normal' ||
        Math.abs(DIRECTIONS.indexOf(previous) - DIRECTIONS.indexOf(f.stance)) !== 1) return false;
    f._feintUsed = true;
    f.charge = f.chargeTime = 0;
    this._setState(f, 'recovery', 0.15);
    f.recoveryKind = 'feint';
    if (f === this._player) {
      this._playerFeintSerial++;
      this.message = 'Feint · Read the reaction';
    }
    this._effect('feint', f.x, WORLD.ground - 150, f.facing, 0.4, { direction: f.stance, strength: 0.5 });
    return true;
  }

  _parry(f, aiDuration = 0.38) {
    if (!ready(f) && f.state !== 'charge' && f.state !== 'duck') return false;
    f.guardDirection = f.stance;
    f.guarding = true;
    if (f.state === 'duck') return true;
    f.charge = f.chargeTime = 0;
    f._aiGuardDuration = aiDuration;
    this._setState(f, 'parry', 0.24);
    return true;
  }

  _evade(f, kind) {
    const cancellable = ready(f) || ['charge', 'windup', 'parry'].includes(f.state) ||
      (f.state === 'recovery' && f.timer >= f.stateDuration * 0.45);
    if (!cancellable) return false;
    f.charge = f.chargeTime = 0;
    f._protectedAttack = 0;
    f._leaveDuck = false;
    this._setState(f, kind === 'duck' ? 'duck' : 'dodge', kind === 'duck' ? 0.34 : 0.32);
    f.evadeMode = kind === 'duck' ? 'duck' : 'back';
    this._effect('evade', f.x, WORLD.ground - 20, f.facing, 0.28, { direction: kind, strength: 0.4 });
    return true;
  }

  _shove(f, kind = 'push') {
    if (f.shoveCooldown > 0 || f.dead) return false;
    const allowed = ready(f) || ['charge', 'parry'].includes(f.state) ||
      (f.state === 'recovery' && f.timer >= 0.07);
    if (!allowed) return false;
    f.charge = f.chargeTime = 0;
    f.fatigue = clamp(f.fatigue + 0.13, 0, 1);
    f.shoveCooldown = 0.60;
    f.shoveKind = kind;
    f._shoveResolved = false;
    this._setState(f, 'shove', 0.25);
    return true;
  }

  _bufferPlayer(edges) {
    const action = ['dodge', 'duck', 'shove', 'counter', 'parry', 'attack'].find(name => edges[name]);
    if (action) {
      this._player._buffer = action;
      this._player._bufferTime = action === 'attack' && ['duck', 'dodge'].includes(this._player.state) ? 0.38 : 0.14;
    }
  }

  _playerIntent(input) {
    const f = this._player;
    if (!input.parry) f._guardArmed = false;
    if (input.aim) {
      const previous = f.stance;
      f.stance = input.aim;
      f.guardDirection = f.stance;
      if (f.state === 'charge') f.attackDirection = f.stance;
      else if (previous !== f.stance) this._feint(f, previous);
    }
    const action = f._buffer;
    let accepted = false;
    if (action === 'dodge') accepted = this._evade(f, 'dodge');
    else if (action === 'duck') accepted = this._evade(f, 'duck');
    else if (action === 'shove') accepted = this._shove(f, input.left ? 'pull' : 'push');
    else if (action === 'counter') accepted = this._attack(f, 'counter');
    else if (action === 'parry') {
      accepted = this._parry(f);
      if (accepted) f._guardArmed = true;
    }
    else if (action === 'attack') {
      accepted = this._canCounter(f) ? this._attack(f, 'counter') : this._startCharge(f);
      if (!accepted && f.state === 'duck') f._leaveDuck = true;
    }
    if (accepted) f._buffer = null;
    // A held guard remains deliberate, but never manufactures an attack edge.
    if (!f._buffer && input.parry && f._guardArmed && (ready(f) || f.state === 'duck')) this._parry(f);
    if (f.state === 'duck') {
      f.guarding = input.parry && f._guardArmed;
      f.duckHeld = input.duck && !f._leaveDuck;
    }
    if (f.state === 'charge' && !input.attack) this._attack(f, 'normal', f.charge);
  }

  _advanceState(f, dt, guardHeld = false, duckHeld = false) {
    f.counterWindow = Math.max(0, f.counterWindow - dt);
    f.counterReady = f.counterWindow > 0;
    f.shoveCooldown = Math.max(0, f.shoveCooldown - dt);
    f._bufferTime = Math.max(0, f._bufferTime - dt);
    if (!f._bufferTime) f._buffer = null;
    f.fatigue = Math.max(0, f.fatigue - dt * (ready(f) ? 0.22 : 0.035));
    if (f.dead) {
      f.timer = Math.min(f.stateDuration, f.timer + dt);
      f.deathTimer = f.timer;
      return;
    }
    if (ready(f)) return;
    f.timer += dt;
    if (f.state === 'charge') {
      f.chargeTime += dt;
      f.charge = clamp(f.chargeTime / MAX_CHARGE, 0, 1);
      if (f === this._opponent && f.chargeTime >= f._aiChargeDuration) this._attack(f, 'normal', f.charge);
      return;
    }
    if (f.state === 'parry') {
      const holding = f === this._player ? guardHeld : f.timer < f._aiGuardDuration;
      if (holding) return;
      this._setState(f, 'recovery', 0.09);
      return;
    }
    // A held duck stays in its established posture, not in startup/end frames.
    // Attack input requests getting up, preserving its buffered follow-up.
    if (f.state === 'duck' && f === this._player && duckHeld && !f._leaveDuck && f.timer >= 0.17) {
      f.timer = 0.17;
      return;
    }
    if (f.timer + 1e-9 < f.stateDuration) return;
    const isPlayer = f === this._player;
    switch (f.state) {
      case 'windup': {
        f._feintUsed = false;
        this._setState(f, 'active', f.attackDirection === 'mid' ? 0.13 : 0.15);
        this._effect('slash', f.x + f.facing * 70, HEIGHT[f.attackDirection], f.facing, 0.3,
          { direction: f.attackDirection, attackKind: f.attackKind, strength: 0.55 + f.charge * 0.45 });
        break;
      }
      case 'active': {
        if (!f._contact) f.fatigue = clamp(f.fatigue + 0.11, 0, 1);
        const duration = (isPlayer ? 0.23 : 0.30) + f.fatigue * 0.07 + (f.attackDirection === 'mid' ? 0 : 0.035);
        this._setState(f, 'recovery', duration);
        break;
      }
      case 'dodge': case 'duck': this._setState(f, 'recovery', 0.075); break;
      case 'shove': this._setState(f, 'recovery', 0.10); break;
      case 'stunned': this._setState(f, 'recovery', 0.07); break;
      case 'recovery': this._setState(f, 'idle'); break;
      default: this._setState(f, 'idle');
    }
  }

  _pickDirection() {
    const roll = this._random();
    return roll < 0.34 ? 'high' : roll < 0.72 ? 'mid' : 'low';
  }

  _opponentIntent() {
    const enemy = this._opponent;
    const player = this._player;
    const distance = enemy.x - player.x;
    if (this._seenPlayerFeintSerial !== this._playerFeintSerial) {
      this._seenPlayerFeintSerial = this._playerFeintSerial;
      // Weaker opponents bite on the feint; stronger ones sometimes hold.
      if (this._random() < { beginner: 0.15, normal: 0.35, hard: 0.55 }[this.difficulty]) this._pendingThreatAt = Infinity;
    }
    if (this._seenPlayerAttackSerial !== this._playerAttackSerial) {
      this._seenPlayerAttackSerial = this._playerAttackSerial;
      this._pendingThreatAt = this.time + this._profile.reaction + this._random() * 0.065;
    }
    if (this.time >= this._pendingThreatAt) {
      this._pendingThreatAt = Infinity;
      if (distance < 215 && ['windup', 'active'].includes(player.state)) {
        const choice = this._random();
        if (choice < this._profile.parryChance && ready(enemy)) {
          enemy.stance = enemy.guardDirection = player.attackDirection;
          this._parry(enemy);
        } else if (choice < this._profile.parryChance + this._profile.evadeChance) {
          this._evade(enemy, player.attackDirection === 'mid' ? 'duck' : 'dodge');
        } else this._retreatUntil = this.time + 0.22;
      }
    }
    if (this._canCounter(enemy) && this.time >= this._nextDecisionAt && distance < 182) {
      this._nextDecisionAt = this.time + 0.30;
      enemy.stance = this._pickDirection();
      if (this._random() < 0.68) this._attack(enemy, 'counter');
    }
    if (enemy.state === 'charge') return distance > 132 ? -1 : 0;
    if (!ready(enemy)) return 0;
    if (this.time < this._retreatUntil) return 1;
    if (this.time >= this._nextDecisionAt) {
      this._nextDecisionAt = this.time + 0.23 + this._random() * 0.19;
      const comfortable = this._aiTemperament === 'aggressive' ? 138 : 164;
      if (distance > comfortable) this._aiMove = -1;
      else if (distance < 73) {
        if (this._random() < 0.38 && this._shove(enemy)) this._aiMove = 0;
        else this._aiMove = 1;
      } else {
        const choice = this._random();
        enemy.stance = enemy.guardDirection = this._pickDirection();
        if (choice < this._profile.attackChance) {
          // Attack the line the player is not holding, more often at higher difficulty.
          if (this._random() < OPEN_LINE[this.difficulty]) {
            const open = DIRECTIONS.filter(line => line !== player.stance);
            enemy.stance = enemy.guardDirection = open[Math.floor(this._random() * open.length)];
          }
          if (this._random() < 0.30) this._startCharge(enemy, 0.24 + this._random() * 0.34);
          else this._attack(enemy);
          this._aiMove = 0;
        } else if (choice < this._profile.attackChance + 0.16) {
          if (this._random() < 0.60) enemy.stance = enemy.guardDirection = player.stance;
          this._parry(enemy, 0.28 + this._random() * 0.20);
          this._aiMove = 0;
        } else if (choice < this._profile.attackChance + 0.28) {
          this._evade(enemy, this._random() < 0.5 ? 'duck' : 'dodge');
          this._aiMove = 0;
        } else this._aiMove = this._random() < 0.65 ? 1 : 0;
      }
    }
    return ready(enemy) ? this._aiMove : 0;
  }

  _movement(f, intent, dt, speed) {
    let delta = 0;
    f.moveDirection = intent;
    if (f.dead) return 0;
    if (ready(f)) {
      f.state = intent ? 'walk' : 'idle';
      delta = intent * speed * (1 - f.fatigue * 0.08) * dt;
    } else if (f.state === 'charge') delta = intent * speed * 0.68 * dt;
    else if (f.state === 'windup') delta = intent * speed * 0.35 * dt;
    else if (f.state === 'recovery') delta = intent * speed * 0.62 * dt;
    else if (f.state === 'parry') delta = intent * speed * 0.36 * dt;
    else if (f.state === 'dodge') {
      const strength = f.timer < 0.24 ? 1 : 0.25;
      delta = -f.facing * 410 * strength * dt;
      f.moveDirection = -f.facing;
    } else if (f.state === 'duck') {
      delta = f.facing * (f.timer < 0.25 ? 255 : 75) * dt;
      f.moveDirection = f.facing;
    } else if (f.state === 'active' && f.timer < 0.08) {
      delta = f.facing * (245 + f.charge * 440 + (f.attackKind === 'counter' ? 45 : 0)) * dt;
      f.moveDirection = f.facing;
    }
    delta += f.knockback * dt;
    f.knockback *= Math.exp(-13 * dt);
    if (Math.abs(f.knockback) < 0.5) f.knockback = 0;
    return delta;
  }

  _constrainBodies(playerDelta = 0, enemyDelta = 0) {
    let px = clamp(this._player.x + playerDelta, MIN_X, MAX_X);
    let ex = clamp(this._opponent.x + enemyDelta, MIN_X, MAX_X);
    if (ex - px < BODY_HALF * 2) {
      const middle = clamp((px + ex) / 2, MIN_X + BODY_HALF, MAX_X - BODY_HALF);
      px = middle - BODY_HALF;
      ex = middle + BODY_HALF;
    }
    this._player.x = px;
    this._opponent.x = ex;
    this._player.facing = 1;
    this._opponent.facing = -1;
  }

  _blade(f) {
    const base = f.x + f.facing * BODY_HALF;
    const reach = (f.attackDirection === 'mid' ? 103 : 92) + f.charge * 20;
    const tip = base + f.facing * reach;
    return [Math.min(base, tip), Math.max(base, tip)];
  }

  _bladeY(f) { return HEIGHT[direction(f.attackDirection)]; }

  _evades(attacker, defender) {
    if (defender.attackKind === 'counter' && defender._protectedAttack === attacker.attackId &&
        ['windup', 'active'].includes(defender.state)) return true;
    const inWindow = defender.timer >= 0.035 && defender.timer < defender.stateDuration - 0.055;
    if (!inWindow) return false;
    return (defender.state === 'duck' && attacker.attackDirection === 'mid') ||
      (defender.state === 'dodge' && attacker.attackDirection !== 'mid');
  }

  _hitsBody(attacker, defender) {
    if (attacker.state !== 'active' || defender.dead ||
        !overlaps(this._blade(attacker), [defender.x - BODY_HALF, defender.x + BODY_HALF])) return false;
    if (this._evades(attacker, defender)) {
      if (defender._evadedAttack !== attacker.attackId) {
        defender._evadedAttack = attacker.attackId;
        defender.counterWindow = 0.38;
        defender.counterReady = true;
        this._effect('evade', defender.x, this._bladeY(attacker), defender.facing, 0.25,
          { direction: attacker.attackDirection, strength: 0.7 });
        if (defender === this._player) this.message = 'Evaded · L to counter';
      }
      return false;
    }
    return true;
  }

  _deflect(attacker, defender) {
    // A held guard (K) parries hard. Simply standing in the matching line is a passive guard:
    // the cut is stopped, but with a smaller opening, as in classic one-hit duels.
    const active = defender.state === 'parry' || defender.state === 'duck' && defender.guarding;
    const passive = !active && ready(defender) && !defender.dead && defender.stance === attacker.attackDirection;
    if (attacker.state !== 'active' || !(active || passive) ||
        attacker.attackDirection !== (active ? defender.guardDirection : defender.stance)) return false;
    const near = defender.x + defender.facing * BODY_HALF;
    const far = near + defender.facing * 42;
    if (!overlaps(this._blade(attacker), [Math.min(near, far), Math.max(near, far)])) return false;
    if (passive) {
      attacker._contact = true;
      attacker.knockback = -attacker.facing * 190;
      defender.knockback = -defender.facing * 110;
      this._setState(attacker, 'stunned', 0.22);
      this._setState(defender, 'recovery', 0.12);
      defender.recoveryKind = 'parry';
      defender.counterWindow = 0.2;
      defender.counterReady = true;
      this._effect('parry', defender.x + defender.facing * 37, this._bladeY(attacker), defender.facing, 0.3,
        { direction: attacker.attackDirection, strength: 0.5, passive: true });
      this._impact(0.04, 0.22);
      this.message = defender === this._player ? 'Guarded · Your stance held the line' : 'Guarded · Strike the open line';
      return true;
    }
    const strong = attacker.charge >= 0.85;
    attacker._contact = true;
    defender.fatigue = clamp(defender.fatigue + 0.12 + attacker.charge * 0.10, 0, 1);
    attacker.knockback = -attacker.facing * (strong ? 100 : 215);
    defender.knockback = -defender.facing * (strong ? 235 : 75);
    this._setState(attacker, 'stunned', strong ? 0.17 : 0.31);
    this._setState(defender, 'recovery', 0.075);
    defender.recoveryKind = 'parry';
    defender.counterWindow = strong ? 0.23 : 0.43;
    defender.counterReady = true;
    defender._evadedAttack = 0;
    this._effect('parry', defender.x + defender.facing * 37, this._bladeY(attacker), defender.facing, 0.38,
      { direction: attacker.attackDirection, strength: strong ? 1 : 0.65 });
    this._impact(strong ? 0.065 : 0.045, strong ? 0.55 : 0.28);
    this.message = defender === this._player ? 'Parried · J / L to counter' : 'Blocked · Reset your distance';
    return true;
  }

  _resolveShove(attacker, defender) {
    if (attacker.state !== 'shove' || attacker._shoveResolved || attacker.timer < 0.055) return;
    attacker._shoveResolved = true;
    if (Math.abs(attacker.x - defender.x) > 82 || defender.dead) {
      attacker.fatigue = clamp(attacker.fatigue + 0.05, 0, 1);
      return;
    }
    defender.counterWindow = 0;
    defender.counterReady = false;
    defender.charge = defender.chargeTime = 0;
    defender.fatigue = clamp(defender.fatigue + 0.20, 0, 1);
    defender.knockback = attacker.facing * (attacker.shoveKind === 'pull' ? -340 : 495);
    if (attacker.shoveKind === 'pull') attacker.knockback = -attacker.facing * 95;
    this._setState(defender, 'stunned', 0.26);
    this._effect('shove', (attacker.x + defender.x) / 2, WORLD.ground - 62, attacker.facing, 0.30,
      { direction: 'mid', shoveKind: attacker.shoveKind, strength: 0.7 });
    this._impact(0.025, 0.25);
    this.message = attacker === this._player ? `${attacker.shoveKind === 'pull' ? 'Pull' : 'Push'} · Reset your distance` : 'Shoved · Recover';
  }

  _collide() {
    const player = this._player;
    const enemy = this._opponent;
    // Same-direction blades always resolve before body hits, regardless of
    // different animation frames. Charged advantage changes recoil, not lethality.
    if (player.state === 'active' && enemy.state === 'active' &&
        player.attackDirection === enemy.attackDirection && overlaps(this._blade(player), this._blade(enemy))) {
      const advantage = player.charge - enemy.charge;
      player._contact = enemy._contact = true;
      player.knockback = -(295 - advantage * 125);
      enemy.knockback = 295 + advantage * 125;
      this._effect('clash', (player.x + enemy.x) / 2, this._bladeY(player), 1, 0.42,
        { direction: player.attackDirection, strength: 0.75 + Math.max(player.charge, enemy.charge) * 0.25 });
      this._setState(player, 'stunned', 0.19 - advantage * 0.065);
      this._setState(enemy, 'stunned', 0.19 + advantage * 0.065);
      this._impact(0.065, 0.65);
      this.message = Math.abs(advantage) > 0.5 ? 'Charged clash · Take ground' : 'Clash · Find an opening';
      return;
    }
    this._deflect(player, enemy);
    this._deflect(enemy, player);
    const playerHit = this._hitsBody(player, enemy);
    const enemyHit = this._hitsBody(enemy, player);
    if (!playerHit && !enemyHit) return;
    if (playerHit) this._kill(enemy, player);
    if (enemyHit) this._kill(player, enemy);
    this.result = playerHit && enemyHit ? 'draw' : playerHit ? 'victory' : 'defeat';
    this.phase = this.result === 'draw' ? 'result' : 'postVictory';
    this.postVictoryRemaining = this.result === 'draw' ? 0 : POST_VICTORY_SECONDS;
    // The winner holds the follow-through pose before relaxing, as in the reference duel.
    if (!player.dead) this._setState(player, 'recovery', 0.72);
    if (!enemy.dead) this._setState(enemy, 'recovery', 0.72);
    for (const f of [player, enemy]) {
      f.counterWindow = 0;
      f.counterReady = false;
      f._buffer = null;
      f._bufferTime = 0;
    }
    this._aiMove = 0;
    this._pendingThreatAt = Infinity;
    this._impact(0.16, 1);
    this.message = { victory: 'Victory · Keep moving', defeat: 'Defeat · Try again', draw: 'Double hit · Draw' }[this.result];
  }

  _kill(defender, attacker) {
    attacker._contact = true;
    defender.hitDirection = defender.hitLevel = attacker.attackDirection;
    defender.knockback = attacker.facing * 160;
    // Stagger, then fall: the renderer holds the first hit frame for the opening third.
    this._setState(defender, 'dead', 1.3);
    this._effect('hit', defender.x, HEIGHT[attacker.attackDirection], attacker.facing, 0.72,
      { direction: attacker.attackDirection, attackKind: attacker.attackKind, strength: 1 });
  }

  _step(dt, input, edges) {
    for (const effect of this._effects) effect.age += dt;
    this._effects = this._effects.filter(effect => effect.age < effect.duration);
    this.shake = Math.max(0, this.shake - dt * 4);
    if (this._playerCanAct()) this._bufferPlayer(edges);
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }
    this.time += dt;
    if (this.phase === 'result') {
      this._advanceState(this._player, dt);
      this._advanceState(this._opponent, dt);
      return;
    }
    if (this.phase === 'postVictory') {
      this.postVictoryRemaining = Math.max(0, this.postVictoryRemaining - dt);
      if (this.result === 'victory') {
        const move = Number(input.right) - Number(input.left);
        // The corpse no longer separates the arena. Free footwork can turn the
        // winner, while a released swing keeps its facing through recovery.
        if (move && ready(this._player)) this._player.facing = Math.sign(move);
        this._playerIntent(input);
        this._advanceState(this._player, dt, input.parry, input.duck);
        this._player.x = clamp(this._player.x + this._movement(this._player, move, dt, 235), MIN_X, MAX_X);
      } else this._advanceState(this._player, dt);
      this._advanceState(this._opponent, dt);
      // No AI, shoves or sword collisions are resolved after the decisive hit.
      if (this.postVictoryRemaining < 1e-8) {
        this.postVictoryRemaining = 0;
        this.phase = 'result';
      }
      return;
    }
    if (this.phase === 'countdown') {
      this.countdown = Math.max(0, this.countdown - dt);
      if (this.countdown < 1e-8) {
        this.countdown = 0;
        this.phase = 'playing';
        this.message = 'Fight!';
      }
      return;
    }
    this._playerIntent(input);
    const enemyDirection = this._opponentIntent();
    this._advanceState(this._player, dt, input.parry, input.duck);
    this._advanceState(this._opponent, dt);
    this._constrainBodies(
      this._movement(this._player, Number(input.right) - Number(input.left), dt, 235),
      this._movement(this._opponent, enemyDirection, dt, this._profile.speed)
    );
    this._resolveShove(this._player, this._opponent);
    this._resolveShove(this._opponent, this._player);
    this._collide();
  }
}
