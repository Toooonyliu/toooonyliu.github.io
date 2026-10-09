import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelEngine } from '../src/engine.js';

const FRAME = 1 / 60;
function advance(engine, seconds, player1 = {}, player2 = {}) {
  for (let remaining = seconds; remaining > 1e-8; remaining -= FRAME) {
    engine.tick(Math.min(FRAME, remaining), player1, player2);
  }
  return engine.snapshot();
}

function localDuel(options = {}) {
  const engine = new DuelEngine({ seed: 42, mode: 'local', ...options });
  advance(engine, 2.4);
  return engine;
}

function active(engine, fighter, aim = 'low') {
  fighter.stance = fighter.attackDirection = aim;
  fighter.attackId = ++engine._attackSerial;
  engine._setState(fighter, 'active', aim === 'mid' ? 0.13 : 0.15);
}

test('solo remains the default; local mode persists through reset and is visible in snapshots', () => {
  assert.equal(new DuelEngine().snapshot().mode, 'solo');
  assert.equal(new DuelEngine({ mode: 'unknown' }).snapshot().mode, 'solo');
  const engine = localDuel();
  assert.equal(engine.snapshot().mode, 'local');
  assert.equal(engine.snapshot().opponentTactic, null);
  engine.tick(FRAME, { attack: true }, { attack: true });
  const reset = engine.reset(44);
  assert.equal(reset.mode, 'local');
  assert.equal(reset.phase, 'countdown');
  assert.equal(reset.player.state, 'idle');
  assert.equal(reset.opponent.state, 'idle');
  assert.equal(reset.opponent.charge, 0);
});

test('a local rival never invokes AI and stays still without player 2 input', () => {
  const engine = localDuel({ difficulty: 'hard' });
  engine._opponentIntent = () => { throw new Error('Local play must not run AI'); };
  const before = engine.snapshot();
  const after = advance(engine, 10);
  assert.equal(after.opponent.x, before.opponent.x);
  assert.equal(after.opponent.state, 'idle');
  assert.equal(after.opponent.stance, 'mid');
  assert.equal(after.result, null);
});

test('both humans use equal movement speed regardless of computer difficulty', () => {
  for (const difficulty of ['beginner', 'normal', 'hard']) {
    const engine = localDuel({ difficulty });
    const snapshot = advance(engine, 0.3, { right: true }, { left: true });
    assert.ok(Math.abs(snapshot.player.x - 260 - (700 - snapshot.opponent.x)) < 1e-8);
    assert.ok(Math.abs(snapshot.player.x - 330.5) < 1e-8);
    assert.equal(snapshot.player.facing, 1);
    assert.equal(snapshot.opponent.facing, -1);
  }
});

test('both humans get identical quick-cut, counter and recovery timings', () => {
  for (const difficulty of ['beginner', 'normal', 'hard']) {
    for (const aim of ['high', 'mid', 'low']) {
      const engine = localDuel({ difficulty });
      engine.tick(FRAME, { attack: true, aim }, { attack: true, aim });
      const windup = engine.tick(FRAME);
      assert.equal(windup.player.state, 'windup');
      assert.equal(windup.player.stateDuration, windup.opponent.stateDuration);
      const recovery = advance(engine, 0.36);
      assert.equal(recovery.player.state, 'recovery');
      assert.equal(recovery.player.stateDuration, recovery.opponent.stateDuration);
      advance(engine, 0.5);
      engine._player.counterWindow = engine._opponent.counterWindow = 0.3;
      const counter = engine.tick(FRAME, { counter: true }, { counter: true });
      assert.equal(counter.player.attackKind, 'counter');
      assert.equal(counter.opponent.attackKind, 'counter');
      assert.equal(counter.player.stateDuration, counter.opponent.stateDuration);
    }
  }
});

test('local attack charges stay held indefinitely and release independently', () => {
  const engine = localDuel();
  let snapshot = advance(engine, 1.3, { attack: true, aim: 'high' }, { attack: true, aim: 'low' });
  for (const f of [snapshot.player, snapshot.opponent]) {
    assert.equal(f.state, 'charge');
    assert.equal(f.charge, 1);
  }
  snapshot = engine.tick(FRAME, {}, { attack: true });
  assert.equal(snapshot.player.state, 'windup');
  assert.equal(snapshot.player.attackDirection, 'high');
  assert.equal(snapshot.opponent.state, 'charge');
  snapshot = engine.tick(FRAME);
  assert.equal(snapshot.opponent.state, 'windup');
  assert.equal(snapshot.opponent.attackDirection, 'low');
  assert.equal(snapshot.opponent.attackKind, 'charged');
});

test('player 2 actions held across countdown do not become queued attacks or guards', () => {
  const engine = new DuelEngine({ mode: 'local' });
  advance(engine, 2.6, { attack: true }, { attack: true, parry: true, left: true });
  assert.equal(engine.snapshot().player.state, 'idle');
  assert.equal(engine.snapshot().opponent.state, 'walk');
  engine.tick(FRAME);
  const fresh = engine.tick(FRAME, {}, { attack: true });
  assert.equal(fresh.opponent.state, 'charge');
  assert.equal(fresh.player.state, 'idle');
});

test('local directional guards are independently latched and held', () => {
  const engine = localDuel();
  let snapshot = advance(engine, 1, { parry: true, aim: 'high' }, { parry: true, aim: 'low' });
  assert.equal(snapshot.player.state, 'parry');
  assert.equal(snapshot.opponent.state, 'parry');
  assert.equal(snapshot.player.guardDirection, 'high');
  assert.equal(snapshot.opponent.guardDirection, 'low');
  snapshot = advance(engine, 0.2, { parry: true }, {});
  assert.equal(snapshot.player.state, 'parry');
  assert.equal(snapshot.opponent.state, 'idle');
  assert.equal(snapshot.opponent.stance, 'low');
});

test('player 2 can hold a guarded duck and buffer a strike while getting up', () => {
  const engine = localDuel();
  engine.tick(FRAME, {}, { parry: true, aim: 'low' });
  let snapshot = advance(engine, 0.8, {}, { parry: true, duck: true });
  assert.equal(snapshot.opponent.state, 'duck');
  assert.equal(snapshot.opponent.timer, 0.17);
  assert.equal(snapshot.opponent.guarding, true);
  assert.equal(snapshot.opponent.duckHeld, true);
  snapshot = advance(engine, 0.3, {}, { duck: true, attack: true });
  assert.equal(snapshot.opponent.state, 'charge');
  assert.equal(snapshot.opponent.duckHeld, false);
  assert.equal(snapshot.player.state, 'idle');
});

test('player 2 can feint a quick cut by switching to an adjacent line', () => {
  const engine = localDuel();
  engine.tick(FRAME, {}, { attack: true, aim: 'high' });
  engine.tick(FRAME);
  const snapshot = engine.tick(FRAME, {}, { aim: 'mid' });
  assert.equal(snapshot.opponent.state, 'recovery');
  assert.equal(snapshot.opponent.recoveryKind, 'feint');
  assert.equal(snapshot.opponent.stance, 'mid');
  assert.ok(snapshot.effects.some(effect => effect.type === 'feint' && effect.facing === -1));
});

test('player 2 pull uses movement away from the opponent, not the left arrow', () => {
  const engine = localDuel();
  let snapshot = engine.tick(FRAME, { left: true, shove: true }, { right: true, shove: true });
  assert.equal(snapshot.player.shoveKind, 'pull');
  assert.equal(snapshot.opponent.shoveKind, 'pull');
  advance(engine, 0.8);
  snapshot = engine.tick(FRAME, { right: true, shove: true }, { left: true, shove: true });
  assert.equal(snapshot.player.shoveKind, 'push');
  assert.equal(snapshot.opponent.shoveKind, 'push');
});

test('pause cancels both human charges and requires fresh releases from both devices', () => {
  const engine = localDuel();
  advance(engine, 0.4, { attack: true }, { attack: true });
  engine.setPaused(true);
  assert.equal(engine.snapshot().player.state, 'idle');
  assert.equal(engine.snapshot().opponent.state, 'idle');
  const paused = engine.snapshot();
  engine.tick(0.2, { attack: true }, { attack: true });
  assert.deepEqual(engine.snapshot(), paused);
  engine.setPaused(false);
  let snapshot = advance(engine, 0.2, { attack: true }, { attack: true });
  assert.equal(snapshot.player.state, 'idle');
  assert.equal(snapshot.opponent.state, 'idle');
  engine.tick(FRAME, {}, { attack: true });
  snapshot = engine.tick(FRAME, { attack: true }, { attack: true });
  assert.equal(snapshot.player.state, 'charge');
  assert.equal(snapshot.opponent.state, 'idle');
  engine.tick(FRAME, { attack: true }, {});
  snapshot = engine.tick(FRAME, { attack: true }, { attack: true });
  assert.equal(snapshot.opponent.state, 'charge');
});

test('simultaneous local shoves trade symmetrically instead of giving player 1 priority', () => {
  for (const pull of [false, true]) {
    const engine = localDuel();
    engine._player.x = 400;
    engine._opponent.x = 470;
    const snapshot = advance(engine, 0.065,
      { shove: true, left: pull }, { shove: true, right: pull });
    assert.equal(snapshot.player.state, 'stunned');
    assert.equal(snapshot.opponent.state, 'stunned');
    assert.equal(snapshot.player.fatigue, snapshot.opponent.fatigue);
    assert.equal(snapshot.player.knockback, -snapshot.opponent.knockback);
    assert.equal(snapshot.effects.filter(effect => effect.type === 'shove').length, 2);
    assert.equal(snapshot.result, null);
  }
});

test('player 2 gets a real counter opening from a matching guard', () => {
  const engine = localDuel();
  engine._player.x = 400;
  engine._opponent.x = 515;
  active(engine, engine._player, 'low');
  const block = engine.tick(FRAME, {}, { parry: true, aim: 'low' });
  assert.equal(block.result, null);
  assert.equal(block.opponent.counterReady, true);
  assert.equal(block.player.state, 'stunned');
  // A button pressed in hitstop is buffered for this human, just as for P1.
  engine.tick(FRAME, {}, { counter: true });
  const counter = advance(engine, 0.08, {}, { counter: true });
  assert.equal(counter.opponent.attackKind, 'counter');
  assert.ok(['windup', 'active'].includes(counter.opponent.state));
});

test('a player 2 win retains defeat result and grants only that winner aftermath control', () => {
  const engine = localDuel();
  engine._player.x = 400;
  engine._opponent.x = 515;
  active(engine, engine._opponent, 'low');
  const win = engine.tick(FRAME);
  assert.equal(win.result, 'defeat');
  assert.equal(win.phase, 'postVictory');
  assert.equal(win.player.dead, true);
  assert.equal(win.opponent.dead, false);
  engine._opponentIntent = () => { throw new Error('Aftermath must not run AI'); };
  const corpseX = win.player.x;
  advance(engine, 1.2);
  let snapshot = advance(engine, 0.8, { right: true, attack: true }, { left: true });
  assert.equal(snapshot.player.x, corpseX);
  assert.ok(snapshot.opponent.x < corpseX);
  assert.equal(snapshot.opponent.facing, -1);
  snapshot = engine.tick(FRAME, {}, { right: true });
  assert.equal(snapshot.opponent.facing, 1);
  engine.tick(FRAME, {}, { attack: true });
  snapshot = engine.tick(FRAME);
  assert.equal(snapshot.opponent.state, 'windup');
  assert.equal(snapshot.result, 'defeat');
  snapshot = advance(engine, 4);
  assert.equal(snapshot.phase, 'result');
  assert.equal(snapshot.postVictoryRemaining, 0);
});

test('local simultaneous different-line hits remain a draw without first-player bias', () => {
  const engine = localDuel();
  engine._player.x = 400;
  engine._opponent.x = 515;
  active(engine, engine._player, 'high');
  active(engine, engine._opponent, 'low');
  const snapshot = engine.tick(FRAME);
  assert.equal(snapshot.result, 'draw');
  assert.equal(snapshot.phase, 'result');
  assert.equal(snapshot.player.dead, true);
  assert.equal(snapshot.opponent.dead, true);
});
