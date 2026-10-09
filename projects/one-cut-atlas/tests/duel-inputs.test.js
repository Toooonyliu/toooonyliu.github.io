import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelInputs, normalizeSettings } from '../src/duel-inputs.js';

const keyboard = { left: false, right: false, attack: false, aim: 'mid' };
function pad(index, { buttons = [], x = 0 } = {}) {
  return { index, id: 'Test pad', connected: true, mapping: 'standard', axes: [x, 0],
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })) };
}

test('settings tolerate absent or malformed saved values', () => {
  assert.deepEqual(normalizeSettings(null), { mode: 'solo', devices: ['keyboard', 'gamepad:0'] });
  assert.deepEqual(normalizeSettings({ mode: 'broken', devices: ['unknown', null] }), normalizeSettings());
});

test('keyboard can control P2 without leaking to gamepad P1', () => {
  const inputs = new DuelInputs({ mode: 'local', devices: ['gamepad:3', 'keyboard'] });
  inputs.sample([null, pad(3)], keyboard);
  const { players } = inputs.sample([pad(3, { x: 1 })], { ...keyboard, attack: true, aim: 'low' });
  assert.equal(players[0].right, true);
  assert.equal(players[0].attack, false);
  assert.equal(players[1].right, false);
  assert.equal(players[1].attack, true);
  assert.equal(players[1].aim, 'low');
});

test('two pads have independent aim and combat state', () => {
  const inputs = new DuelInputs({ mode: 'local', devices: ['gamepad:0', 'gamepad:2'] });
  inputs.sample([pad(0), pad(2)], keyboard);
  const { players } = inputs.sample([pad(2, { buttons: [2, 13] }), pad(0, { buttons: [0, 12] })], keyboard);
  assert.equal(players[0].attack, true);
  assert.equal(players[0].parry, false);
  assert.equal(players[0].aim, 'high');
  assert.equal(players[1].attack, false);
  assert.equal(players[1].parry, true);
  assert.equal(players[1].aim, 'low');
});

test('held pad input must return to neutral after pause or restart', () => {
  const inputs = new DuelInputs({ mode: 'solo', devices: ['gamepad:0'] });
  assert.equal(inputs.sample([pad(0, { buttons: [0] })], keyboard).players[0].attack, false);
  inputs.sample([pad(0)], keyboard);
  assert.equal(inputs.sample([pad(0, { buttons: [0] })], keyboard).players[0].attack, true);
  inputs.suppress();
  assert.equal(inputs.sample([pad(0, { buttons: [0], x: 1 })], keyboard).players[0].attack, false);
  inputs.sample([pad(0)], keyboard);
  assert.equal(inputs.sample([pad(0, { buttons: [0] })], keyboard).players[0].attack, true);
});

test('pause and rematch are edge-triggered and ignored while a dialog is open', () => {
  const inputs = new DuelInputs({ mode: 'solo', devices: ['gamepad:0'] });
  assert.equal(inputs.sample([pad(0, { buttons: [9] })], keyboard).pause, true);
  inputs.suppress();
  assert.equal(inputs.sample([pad(0, { buttons: [9] })], keyboard).pause, false);
  inputs.sample([pad(0)], keyboard);
  assert.equal(inputs.sample([pad(0, { buttons: [8] })], keyboard, { suspended: true }).rematch, false);
  assert.equal(inputs.sample([pad(0, { buttons: [8] })], keyboard).rematch, false);
  inputs.sample([pad(0)], keyboard);
  assert.equal(inputs.sample([pad(0, { buttons: [8] })], keyboard).rematch, true);
});

test('solo ignores P2 and disconnected pads produce no combat input', () => {
  const inputs = new DuelInputs({ mode: 'solo', devices: ['gamepad:0', 'gamepad:1'] });
  inputs.sample([pad(0)], keyboard);
  const sample = inputs.sample([pad(1, { buttons: [0, 9] })], { ...keyboard, attack: true });
  assert.equal(sample.players[0].attack, false);
  assert.equal(sample.players[1].attack, false);
  assert.equal(sample.pause, false);
});

test('paused gamepad stances cannot leak into a resumed cut as a feint', () => {
  const inputs = new DuelInputs({ mode: 'solo', devices: ['gamepad:0'] });
  inputs.sample([pad(0)], keyboard);
  assert.equal(inputs.sample([pad(0, { buttons: [12] })], keyboard).players[0].aim, 'high');
  inputs.suppress();
  const paused = inputs.sample([pad(0, { buttons: [14, 9], x: 1 })], keyboard, { paused: true });
  assert.equal(paused.pause, true, 'menu input still allows resume');
  assert.equal(paused.players[0].right, false);
  assert.equal(paused.players[0].aim, 'high');
  inputs.suppress();
  assert.equal(inputs.sample([pad(0, { buttons: [14] })], keyboard).players[0].aim, 'high');
  inputs.sample([pad(0)], keyboard);
  assert.equal(inputs.sample([pad(0, { buttons: [14] })], keyboard).players[0].aim, 'mid');
});
