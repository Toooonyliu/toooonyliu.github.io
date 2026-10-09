import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelEngine } from '../src/engine.js';

const FRAME = 1 / 60;
function advance(engine, seconds, input = {}) {
  for (let remaining = seconds; remaining > 1e-8; remaining -= FRAME) {
    engine.tick(Math.min(FRAME, remaining), input);
  }
  return engine.snapshot();
}

function isolatedDuel() {
  const engine = new DuelEngine({ seed: 42 });
  advance(engine, 2.4);
  // Collision/action fixtures isolate the independently tested computer policy.
  engine._opponentIntent = () => 0;
  return engine;
}

function closeDuel(distance = 115) {
  const engine = isolatedDuel();
  engine._player.x = 400;
  engine._opponent.x = 400 + distance;
  return engine;
}

function active(engine, fighter, aim = 'mid', timer = 0, charge = 0) {
  fighter.stance = fighter.attackDirection = aim;
  fighter.attackId = ++engine._attackSerial;
  fighter.charge = charge;
  fighter.attackKind = charge ? 'charged' : 'normal';
  engine._setState(fighter, 'active', aim === 'mid' ? 0.13 : 0.15);
  fighter.timer = timer;
}

function tap(engine, input = {}) {
  engine.tick(FRAME, { ...input, attack: true });
  return engine.tick(FRAME, { ...input, attack: false });
}

test('countdown ignores movement and cannot carry a held attack into combat', () => {
  const engine = new DuelEngine();
  advance(engine, 2.3, { right: true, attack: true });
  assert.equal(engine.snapshot().player.x, 260);
  assert.equal(engine.snapshot().player.state, 'idle');
  advance(engine, 0.2, { attack: true });
  assert.equal(engine.snapshot().phase, 'playing');
  assert.equal(engine.snapshot().player.state, 'idle');
  engine.tick(FRAME, {});
  engine.tick(FRAME, { attack: true });
  assert.equal(engine.snapshot().player.state, 'charge');
});

test('high, mid and low stances latch after release and produce separate hit zones', () => {
  const heights = new Set();
  for (const aim of ['high', 'mid', 'low']) {
    const engine = isolatedDuel();
    engine.tick(FRAME, { aim });
    engine.tick(FRAME, {});
    assert.equal(engine.snapshot().player.stance, aim);
    tap(engine);
    assert.equal(engine.snapshot().player.attackDirection, aim);
    const snapshot = advance(engine, 0.20);
    const slash = snapshot.effects.find(effect => effect.type === 'slash');
    assert.equal(slash.direction, aim);
    heights.add(slash.y);
  }
  assert.equal(heights.size, 3);
});

test('aim can change during charge, but an already released blade keeps its direction', () => {
  const engine = isolatedDuel();
  advance(engine, 0.3, { attack: true, aim: 'low' });
  engine.tick(FRAME, { attack: true, aim: 'high' });
  assert.equal(engine.snapshot().player.attackDirection, 'high');
  engine.tick(FRAME, {});
  engine.tick(FRAME, { aim: 'mid' });
  assert.equal(engine.snapshot().player.attackDirection, 'high');
  assert.equal(engine.snapshot().player.stance, 'mid');
});

test('holding attack delays the strike, reaches a capped charge, and release strikes once', () => {
  const engine = isolatedDuel();
  let snapshot = advance(engine, 1.2, { attack: true });
  assert.equal(snapshot.player.state, 'charge');
  assert.equal(snapshot.player.charge, 1);
  assert.equal(snapshot.effects.some(effect => effect.type === 'slash'), false);
  snapshot = engine.tick(FRAME, {});
  assert.equal(snapshot.player.state, 'windup');
  assert.equal(snapshot.player.attackKind, 'charged');
  advance(engine, 0.7);
  assert.equal(engine.snapshot().player.state, 'idle');
  assert.equal(engine._playerAttackSerial, 1);
});

test('a quick attack tap remains responsive and has less lunge than a full charge', () => {
  const normal = isolatedDuel();
  const charged = isolatedDuel();
  tap(normal);
  advance(charged, 0.75, { attack: true });
  charged.tick(FRAME);
  assert.equal(normal.snapshot().player.attackKind, 'normal');
  assert.ok(charged.snapshot().player.stateDuration < normal.snapshot().player.stateDuration);
  advance(normal, 0.4);
  advance(charged, 0.4);
  assert.ok(charged.snapshot().player.x - normal.snapshot().player.x > 25);
});

test('a correct directional guard blocks and earns a fast counter; wrong direction is lethal', () => {
  for (const aim of ['high', 'mid', 'low']) {
    const correct = closeDuel();
    correct._player.stance = aim;
    correct._parry(correct._player);
    active(correct, correct._opponent, aim);
    const snapshot = correct.tick(FRAME, { parry: true });
    assert.equal(snapshot.result, null);
    assert.equal(snapshot.opponent.state, 'stunned');
    assert.equal(snapshot.player.recoveryKind, 'parry');
    assert.equal(snapshot.player.counterReady, true);
    assert.ok(snapshot.effects.some(effect => effect.type === 'parry' && effect.direction === aim));

    const wrong = closeDuel();
    wrong._player.stance = aim === 'mid' ? 'high' : 'mid';
    wrong._parry(wrong._player);
    active(wrong, wrong._opponent, aim);
    assert.equal(wrong.tick(FRAME, { parry: true }).result, 'defeat');
  }
});

test('a held guard stays up while attack requires a fresh release cycle', () => {
  const engine = isolatedDuel();
  advance(engine, 1.0, { parry: true, aim: 'low' });
  assert.equal(engine.snapshot().player.state, 'parry');
  assert.equal(engine.snapshot().player.guardDirection, 'low');
  advance(engine, 0.2);
  assert.equal(engine.snapshot().player.state, 'idle');
});

test('same-direction swings clash before body damage even at different animation phases', () => {
  for (const aim of ['high', 'mid', 'low']) {
    const engine = closeDuel();
    active(engine, engine._player, aim, 0.005);
    active(engine, engine._opponent, aim, 0.10);
    const snapshot = engine.tick(FRAME);
    assert.equal(snapshot.result, null);
    assert.equal(snapshot.player.state, 'stunned');
    assert.equal(snapshot.opponent.state, 'stunned');
    assert.equal(snapshot.player.knockback, -snapshot.opponent.knockback);
    assert.ok(snapshot.effects.some(effect => effect.type === 'clash'));
    const x = [snapshot.player.x, snapshot.opponent.x];
    const later = advance(engine, 0.16);
    assert.ok(later.player.x < x[0] && later.opponent.x > x[1]);
  }
});

test('charged clash advantage reduces own recoil and extends the other fighter stun', () => {
  const engine = closeDuel();
  active(engine, engine._player, 'high', 0, 1);
  active(engine, engine._opponent, 'high', 0, 0);
  const snapshot = engine.tick(FRAME);
  assert.equal(snapshot.result, null);
  assert.ok(Math.abs(snapshot.player.knockback) < snapshot.opponent.knockback);
  assert.ok(snapshot.player.stateDuration < snapshot.opponent.stateDuration);
});

test('different-direction simultaneous body hits draw without first-fighter bias', () => {
  const engine = closeDuel();
  active(engine, engine._player, 'high');
  active(engine, engine._opponent, 'low');
  const snapshot = engine.tick(FRAME);
  assert.equal(snapshot.result, 'draw');
  assert.equal(snapshot.phase, 'result');
  assert.equal(snapshot.postVictoryRemaining, 0);
  assert.equal(snapshot.player.dead, true);
  assert.equal(snapshot.opponent.dead, true);
  assert.equal(snapshot.player.hitDirection, 'low');
  assert.equal(snapshot.opponent.hitDirection, 'high');
});

test('one clean hit starts a five-second aftermath and the defeated body finishes falling in place', () => {
  for (const expected of ['victory', 'defeat']) {
    const engine = closeDuel();
    active(engine, expected === 'victory' ? engine._player : engine._opponent, 'low');
    const snapshot = engine.tick(FRAME);
    assert.equal(snapshot.result, expected);
    assert.equal(snapshot.phase, 'postVictory');
    assert.equal(snapshot.postVictoryRemaining, 5);
    const dead = expected === 'victory' ? snapshot.opponent : snapshot.player;
    assert.equal(dead.dead, true);
    assert.equal(dead.hitDirection, 'low');
    assert.equal(dead.deathTimer, 0);
    const x = [snapshot.player.x, snapshot.opponent.x];
    // The fall now takes 1.3 s: a held stagger, then the eased collapse.
    const later = advance(engine, 1.45);
    const corpse = expected === 'victory' ? later.opponent : later.player;
    assert.equal(corpse.stateDuration, 1.3);
    assert.equal(corpse.deathTimer, corpse.stateDuration);
    assert.deepEqual([later.player.x, later.opponent.x], x);
    assert.equal(later.result, expected);
  }
});

test('a victorious player can pass the corpse, turn and strike again without AI or new collisions', () => {
  const engine = closeDuel();
  active(engine, engine._player, 'low');
  engine.tick(FRAME);
  const corpseX = engine.snapshot().opponent.x;
  engine._opponentIntent = () => assert.fail('AI must stop after a decisive hit');
  engine._collide = () => assert.fail('aftermath attacks must not resolve new damage');
  let snapshot = advance(engine, 1.0, { right: true });
  assert.ok(snapshot.player.x > corpseX);
  assert.equal(snapshot.opponent.x, corpseX);
  assert.equal(snapshot.opponent.dead, true);
  assert.equal(snapshot.player.facing, 1);
  snapshot = advance(engine, 0.10, { left: true });
  assert.equal(snapshot.player.facing, -1);
  tap(engine, { aim: 'high' });
  snapshot = advance(engine, 0.20);
  assert.ok(snapshot.effects.some(effect => effect.type === 'slash' && effect.facing === -1 && effect.direction === 'high'));
  assert.equal(snapshot.result, 'victory');
  assert.equal(snapshot.phase, 'postVictory');
  assert.equal(snapshot.opponent.dead, true);
});

test('the defeated player cannot move or attack during aftermath', () => {
  const engine = closeDuel();
  active(engine, engine._opponent, 'low');
  engine.tick(FRAME);
  const x = [engine._player.x, engine._opponent.x];
  const attacks = engine._playerAttackSerial;
  const snapshot = advance(engine, 1.0, { right: true, attack: true, parry: true, dodge: true });
  assert.deepEqual([snapshot.player.x, snapshot.opponent.x], x);
  assert.equal(engine._playerAttackSerial, attacks);
  assert.equal(snapshot.player.dead, true);
  assert.equal(snapshot.result, 'defeat');
  assert.equal(snapshot.phase, 'postVictory');
});

test('aftermath timer pauses with the game and only shows result after the full interval', () => {
  const engine = closeDuel();
  active(engine, engine._player, 'low');
  engine.tick(FRAME);
  // Isolate the aftermath interval from the independently tested impact freeze.
  engine.hitstop = 0;
  let snapshot = advance(engine, 4.5);
  assert.equal(snapshot.phase, 'postVictory');
  assert.ok(Math.abs(snapshot.postVictoryRemaining - 0.5) < 1e-8);
  engine.setPaused(true);
  const paused = engine.snapshot();
  advance(engine, 2, { right: true });
  assert.deepEqual(engine.snapshot(), paused);
  engine.setPaused(false);
  snapshot = advance(engine, 0.49);
  assert.equal(snapshot.phase, 'postVictory');
  snapshot = advance(engine, 0.01);
  assert.equal(snapshot.phase, 'result');
  assert.equal(snapshot.postVictoryRemaining, 0);
  const x = snapshot.player.x;
  advance(engine, 1, { right: true, attack: true });
  assert.equal(engine.snapshot().player.x, x);
  assert.equal(engine.snapshot().result, 'victory');
  assert.equal(engine.reset().postVictoryRemaining, 0);
});

test('forward duck avoids only mid strikes during its real evasion window', () => {
  for (const aim of ['high', 'mid', 'low']) {
    const engine = closeDuel(100);
    engine._evade(engine._player, 'duck');
    engine._player.timer = 0.08;
    active(engine, engine._opponent, aim);
    const x = engine._player.x;
    const snapshot = engine.tick(FRAME);
    assert.equal(snapshot.result, aim === 'mid' ? null : 'defeat');
    if (aim === 'mid') {
      assert.ok(snapshot.player.x > x);
      assert.equal(snapshot.player.counterReady, true);
    }
  }
});

test('duck startup and end are vulnerable rather than granting permanent invulnerability', () => {
  for (const timer of [0, 0.29]) {
    const engine = closeDuel(100);
    engine._evade(engine._player, 'duck');
    engine._player.timer = timer;
    active(engine, engine._opponent, 'mid');
    assert.equal(engine.tick(1 / 120).result, 'defeat');
  }
});

test('holding duck sustains the low posture; releasing lets its get-up frames finish', () => {
  const engine = isolatedDuel();
  const held = advance(engine, 0.75, { duck: true });
  assert.equal(held.player.state, 'duck');
  assert.equal(held.player.duckHeld, true);
  assert.equal(held.player.timer, 0.17);
  assert.ok(held.player.x > 260);
  const released = engine.tick(FRAME);
  assert.equal(released.player.duckHeld, false);
  assert.ok(released.player.timer > 0.17);
  assert.equal(advance(engine, 0.3).player.state, 'idle');
});

test('duck can keep a directional guard against a vertical cut', () => {
  const engine = closeDuel(100);
  advance(engine, 0.06, { duck: true });
  active(engine, engine._opponent, 'high');
  const snapshot = engine.tick(FRAME, { duck: true, parry: true, aim: 'high' });
  assert.equal(snapshot.result, null);
  assert.equal(snapshot.player.counterReady, true);
  assert.equal(snapshot.opponent.state, 'stunned');
  assert.ok(snapshot.effects.some(effect => effect.type === 'parry'));
});

test('attack during a held duck gets up and preserves the requested strike', () => {
  const engine = isolatedDuel();
  advance(engine, 0.3, { duck: true });
  engine.tick(FRAME, { duck: true, attack: true, aim: 'low' });
  const snapshot = advance(engine, 0.38, { duck: true });
  assert.equal(snapshot.player.duckHeld, false);
  assert.equal(snapshot.player.attackDirection, 'low');
  assert.equal(engine._playerAttackSerial, 1);
  assert.ok(['windup', 'active', 'recovery'].includes(snapshot.player.state));
});

test('back evade moves away and avoids vertical cuts while a nearby mid cut still lands', () => {
  for (const aim of ['high', 'mid', 'low']) {
    const engine = closeDuel(100);
    engine._evade(engine._player, 'dodge');
    engine._player.timer = 0.08;
    active(engine, engine._opponent, aim);
    const x = engine._player.x;
    const snapshot = engine.tick(FRAME);
    assert.equal(snapshot.result, aim === 'mid' ? 'defeat' : null);
    assert.ok(snapshot.player.x < x);
  }
});

test('dodge cancels a held charge without releasing a ghost attack afterward', () => {
  const engine = isolatedDuel();
  advance(engine, 0.5, { attack: true });
  const snapshot = engine.tick(FRAME, { attack: true, dodge: true });
  assert.equal(snapshot.player.state, 'dodge');
  assert.equal(snapshot.player.charge, 0);
  advance(engine, 0.65, { attack: true });
  assert.equal(engine.snapshot().player.state, 'idle');
  assert.equal(engine._playerAttackSerial, 0);
});

test('counter cannot be performed without a successful defensive window', () => {
  const engine = isolatedDuel();
  advance(engine, 0.2, { counter: true });
  assert.equal(engine.snapshot().player.state, 'idle');
  assert.equal(engine._playerAttackSerial, 0);
});

test('a block counter starts sooner and can strike the stunned attacker first', () => {
  const engine = closeDuel(110);
  engine._parry(engine._player);
  active(engine, engine._opponent, 'mid');
  engine.tick(FRAME, { parry: true });
  engine.tick(FRAME, { counter: true });
  advance(engine, 0.06, { counter: true });
  assert.equal(engine.snapshot().player.attackKind, 'counter');
  assert.ok(engine.snapshot().player.stateDuration <= 0.065);
  const later = advance(engine, 0.2);
  assert.equal(later.result, 'victory');
});

test('a successful duck opens a protected backslash only against the actually evaded blade', () => {
  const engine = closeDuel(100);
  engine._evade(engine._player, 'duck');
  engine._player.timer = 0.08;
  active(engine, engine._opponent, 'mid');
  assert.equal(engine.tick(FRAME).player.counterReady, true);
  const snapshot = engine.tick(FRAME, { counter: true, aim: 'high' });
  assert.equal(snapshot.player.attackKind, 'counter');
  assert.equal(snapshot.result, null);
  assert.equal(advance(engine, 0.1).result, 'victory');
});

test('counter advantage expires when the follow-up is delayed', () => {
  const engine = closeDuel();
  engine._parry(engine._player);
  active(engine, engine._opponent, 'mid');
  engine.tick(FRAME, { parry: true });
  engine._opponent.x = 700;
  advance(engine, 0.7);
  assert.equal(engine.snapshot().player.counterReady, false);
  engine.tick(FRAME, { counter: true });
  assert.equal(engine.snapshot().player.state, 'idle');
});

test('close shove interrupts a counter, removes its window, pushes back and stays nonlethal', () => {
  const engine = closeDuel(65);
  engine._opponent.counterWindow = 0.4;
  engine._opponent.counterReady = true;
  engine._opponent.attackKind = 'counter';
  engine._setState(engine._opponent, 'windup', 0.14);
  const snapshot = advance(engine, 0.10, { shove: true });
  assert.equal(snapshot.result, null);
  assert.equal(snapshot.opponent.state, 'stunned');
  assert.equal(snapshot.opponent.counterReady, false);
  assert.ok(snapshot.opponent.x > 465);
  assert.ok(snapshot.effects.some(effect => effect.type === 'shove'));
  assert.ok(snapshot.player.shoveCooldown > 0);
});

test('shove misses outside arm reach and does not repeat from a held button', () => {
  const engine = isolatedDuel();
  advance(engine, 1.2, { shove: true });
  assert.equal(engine.snapshot().opponent.state, 'idle');
  assert.equal(engine.snapshot().opponent.x, 700);
  assert.equal(engine.snapshot().effects.some(effect => effect.type === 'shove'), false);
  assert.equal(engine.snapshot().player.state, 'idle');
});

test('backward shove input pulls the opponent closer and gives the recipient fatigue', () => {
  const engine = closeDuel(78);
  const snapshot = advance(engine, 0.11, { shove: true, left: true });
  assert.equal(snapshot.player.shoveKind, 'pull');
  assert.ok(snapshot.opponent.x < 478);
  assert.ok(snapshot.opponent.fatigue > 0.18);
  assert.ok(snapshot.opponent.x - snapshot.player.x >= 36);
  assert.ok(snapshot.effects.some(effect => effect.type === 'shove' && effect.shoveKind === 'pull'));
});

test('a fully charged strike still respects a correct block but changes its recoil advantage', () => {
  const engine = closeDuel(115);
  engine._parry(engine._player);
  active(engine, engine._opponent, 'mid', 0, 1);
  const snapshot = engine.tick(FRAME, { parry: true });
  assert.equal(snapshot.result, null);
  assert.equal(snapshot.player.counterReady, true);
  assert.ok(Math.abs(snapshot.opponent.knockback) < Math.abs(snapshot.player.knockback));
  assert.ok(snapshot.opponent.stateDuration < 0.20);
});

test('missed swings build fatigue, fatigue slows preparation, and resting recovers it', () => {
  const rested = isolatedDuel();
  const tired = isolatedDuel();
  tired._player.fatigue = 0.9;
  tap(rested);
  tap(tired);
  assert.ok(tired.snapshot().player.stateDuration > rested.snapshot().player.stateDuration + 0.035);
  const miss = advance(rested, 0.45);
  assert.ok(miss.player.fatigue > 0.15);
  const fatigue = miss.player.fatigue;
  const recovered = advance(rested, 1.2);
  assert.ok(recovered.player.fatigue < fatigue);
  assert.equal(recovered.player.fatigue, 0);
});

test('hitstop freezes fighters and simulation time while effects age and impact shake decays', () => {
  const engine = closeDuel();
  active(engine, engine._player);
  active(engine, engine._opponent);
  const impact = engine.tick(1 / 120);
  assert.ok(impact.hitstop > 0);
  assert.ok(impact.shake > 0);
  const frozen = engine.tick(0.02);
  assert.equal(frozen.time, impact.time);
  assert.equal(frozen.player.x, impact.player.x);
  assert.equal(frozen.player.timer, impact.player.timer);
  assert.ok(frozen.effects[0].age > impact.effects[0].age);
  assert.ok(frozen.hitstop < impact.hitstop);
  assert.ok(frozen.shake < impact.shake);
});

test('an attack pressed during hitstop buffers through the final recovery frames', () => {
  const engine = isolatedDuel();
  engine._setState(engine._player, 'recovery', 0.08);
  engine._impact(0.05, 0.5);
  engine.tick(FRAME, { attack: true });
  const snapshot = advance(engine, 0.16, { attack: true });
  assert.equal(snapshot.player.state, 'charge');
  assert.ok(snapshot.player.charge > 0);
});

test('fighters cannot cross or leave the arena under sustained footwork and impacts', () => {
  const engine = isolatedDuel();
  advance(engine, 8, { right: true });
  let snapshot = engine.snapshot();
  assert.ok(snapshot.player.x >= 54 && snapshot.opponent.x <= 906);
  assert.ok(snapshot.opponent.x - snapshot.player.x >= 36 - 1e-8);
  engine._player.knockback = -800;
  advance(engine, 8, { left: true });
  snapshot = engine.snapshot();
  assert.equal(snapshot.player.x, 54);
  assert.ok(snapshot.opponent.x - snapshot.player.x >= 36);
});

test('pausing freezes everything, cancels held charge, and requires fresh releases', () => {
  const engine = isolatedDuel();
  advance(engine, 0.4, { attack: true });
  engine._effect('clash', 480, 350);
  engine.setPaused(true);
  const paused = engine.snapshot();
  engine.tick(0.2, { attack: true });
  assert.deepEqual(engine.snapshot(), paused);
  assert.equal(paused.effects.length, 0);
  assert.equal(paused.player.state, 'idle');
  engine.setPaused(false);
  engine.tick(FRAME, { attack: true });
  assert.equal(engine.snapshot().player.state, 'idle');
  engine.tick(FRAME, {});
  engine.tick(FRAME, { attack: true });
  assert.equal(engine.snapshot().player.state, 'charge');
});

test('same seed and full directional controls reproduce AI, and reset removes all duel state', () => {
  const first = new DuelEngine({ seed: 'kyoto', difficulty: 'normal' });
  const second = new DuelEngine({ seed: 'kyoto', difficulty: 'normal' });
  for (let frame = 0; frame < 1000; frame++) {
    const input = {
      right: frame % 180 < 55, left: frame % 180 > 120,
      attack: frame % 93 < 18, parry: frame % 71 < 12,
      aim: ['high', 'mid', 'low'][Math.floor(frame / 70) % 3],
      dodge: frame % 113 === 0, duck: frame % 157 === 0,
      counter: frame % 83 === 0, shove: frame % 139 === 0
    };
    assert.deepEqual(first.tick(FRAME, input), second.tick(FRAME, input));
  }
  assert.notEqual(first.snapshot().phase, 'countdown');
  const initial = first.reset();
  assert.equal(initial.phase, 'countdown');
  assert.equal(initial.player.charge, 0);
  assert.equal(initial.player.fatigue, 0);
  assert.equal(initial.player.counterReady, false);
  assert.equal(initial.hitstop, 0);
  assert.deepEqual(initial, new DuelEngine({ seed: 'kyoto', difficulty: 'normal' }).snapshot());
});

test('snapshot copies and invalid elapsed times cannot corrupt combat state', () => {
  const engine = new DuelEngine();
  const before = engine.snapshot();
  const copy = engine.snapshot();
  copy.player.x = 0;
  copy.player.stance = 'low';
  copy.effects.push({ type: 'hit' });
  for (const invalid of [NaN, Infinity, -1, 0]) engine.tick(invalid, { attack: true });
  assert.deepEqual(engine.snapshot(), before);
  assert.equal(Object.keys(before.player).some(key => key.startsWith('_')), false);
});

test('effect snapshots preserve stable unique ids, directional metadata and isolated copies', () => {
  const engine = isolatedDuel();
  engine._effect('slash', 400, 360, 1, 0.3, { direction: 'low', attackKind: 'counter' });
  engine._effect('clash', 480, 350);
  const first = engine.snapshot();
  const next = engine.tick(FRAME);
  assert.deepEqual(first.effects.map(effect => effect.id), [1, 2]);
  assert.deepEqual(next.effects.map(effect => effect.id), [1, 2]);
  assert.notStrictEqual(first.effects[0], next.effects[0]);
  assert.equal(next.effects[0].direction, 'low');
  first.effects[0].direction = 'high';
  assert.equal(engine.snapshot().effects[0].direction, 'low');
  advance(engine, 1);
  engine._effect('hit', 520, 364);
  assert.equal(engine.snapshot().effects[0].id, 3);
  engine.reset();
  engine._effect('slash', 400, 360);
  assert.equal(engine.snapshot().effects[0].id, 1);
});

test('beginner AI visibly telegraphs its chosen blade direction before it can hit', () => {
  const engine = new DuelEngine({ seed: 1 });
  advance(engine, 2.4);
  engine._player.x = 400;
  engine._opponent.x = 550;
  engine._nextDecisionAt = engine.time;
  let snapshot;
  for (let frame = 0; frame < 300; frame++) {
    snapshot = engine.tick(FRAME);
    if (snapshot.opponent.state === 'windup') break;
  }
  assert.equal(snapshot.opponent.state, 'windup');
  assert.ok(snapshot.opponent.stateDuration >= 0.35);
  assert.ok(['high', 'mid', 'low'].includes(snapshot.opponent.attackDirection));
  assert.equal(snapshot.result, null);
  assert.equal(advance(engine, 0.15, { left: true }).result, null);
});

test('seeded AI varies high/mid/low attacks, charges, guards and both evasions', () => {
  const directions = new Set();
  const actions = new Set();
  const temperaments = new Set();
  for (let seed = 0; seed < 18; seed++) {
    const engine = new DuelEngine({ seed, difficulty: 'normal' });
    advance(engine, 2.4);
    engine._player.x = 400;
    engine._opponent.x = 540;
    // Keep the observation duel alive while leaving the entire AI policy intact.
    engine._hitsBody = () => false;
    temperaments.add(engine.snapshot().opponentTactic);
    for (let frame = 0; frame < 900; frame++) {
      const snapshot = engine.tick(FRAME);
      actions.add(snapshot.opponent.state);
      if (snapshot.opponent.state === 'windup') directions.add(snapshot.opponent.attackDirection);
    }
  }
  assert.deepEqual([...directions].sort(), ['high', 'low', 'mid']);
  for (const action of ['charge', 'parry', 'dodge', 'duck']) assert.ok(actions.has(action), action);
  assert.equal(temperaments.size, 3);
});
