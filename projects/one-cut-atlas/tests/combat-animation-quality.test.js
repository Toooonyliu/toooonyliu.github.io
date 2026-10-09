import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DuelEngine } from '../src/engine.js';
import { resolveClassicAnimation } from '../src/classic-fighter.js';

function framesFor(state, duration, samples, extra = {}) {
  return Array.from({ length: samples }, (_, index) => resolveClassicAnimation({
    state,
    timer: duration * index / Math.max(1, samples - 1),
    stateDuration: duration,
    stance: 'high',
    attackDirection: 'high',
    attackKind: 'normal',
    facing: 1,
    dead: false,
    ...extra,
  }, index / 60));
}

test('walking uses the complete 16-frame source cycle', () => {
  const frames = framesFor('walk', 1, 90);
  assert.equal(new Set(frames.map(frame => `${frame.name}:${frame.index}`)).size, 16);
});

test('a cut advances monotonically across the authored 12-frame animation', () => {
  const phases = [
    ...framesFor('windup', .19, 12),
    ...framesFor('active', .15, 10),
    ...framesFor('recovery', .30, 19, { recoveryKind: 'attack' }),
  ];
  assert.equal(new Set(phases.map(frame => `${frame.name}:${frame.index}`)).size, 12);
  assert.deepEqual([...new Set(phases.map(frame => frame.index))], [...Array(12).keys()]);
});

test('death holds the last of 25 synchronized source frames', () => {
  const frames = framesFor('dead', 1.1, 80, { dead: true });
  assert.equal(new Set(frames.map(frame => frame.index)).size, 25);
  assert.equal(frames.at(-1).index, 24);
});

test('live stance changes update idle and walking art before the next attack', () => {
  const game = new DuelEngine({ seed: 113 });
  for (let index = 0; index < 150; index++) game.tick(1 / 60, {});
  const idle = game.tick(1 / 60, { aim: 'high' });
  assert.equal(idle.player.attackDirection, 'mid');
  assert.equal(resolveClassicAnimation(idle.player, idle.time).name, 'idlehigh');
  const walking = game.tick(1 / 60, { aim: 'low', left: true });
  assert.equal(resolveClassicAnimation(walking.player, walking.time).name, 'walkidlelow');
});

test('guard animation never requests a frame absent from the supplied atlas', () => {
  const manifest = JSON.parse(readFileSync(new URL('../assets/classic/game-assets.json', import.meta.url), 'utf8'));
  for (const guardDirection of ['high', 'mid', 'low']) {
    for (const frame of framesFor('parry', .24, 20, { guardDirection })) {
      const body = manifest.sprites[manifest.animations[frame.name].body];
      // Shorter clothing layers hold their last pose; the body sets the cached sequence length.
      assert.ok(frame.index < body.frames.length, `${frame.name}:${frame.index} exceeds cached sequence`);
    }
  }
});
