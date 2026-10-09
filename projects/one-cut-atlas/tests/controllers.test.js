import test from 'node:test';
import assert from 'node:assert/strict';
import { gamepadIndex, listGamepads, readGamepad, validateAssignments } from '../src/controllers.js';

function pad(index = 0, overrides = {}) {
  return {
    index, id: `Test controller ${index}`, connected: true, mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    ...overrides,
  };
}

function press(controller, ...buttons) {
  for (const index of buttons) controller.buttons[index] = { pressed: true, value: 1 };
  return controller;
}

test('gamepad identifiers preserve sparse browser indices and reject malformed values', () => {
  assert.equal(gamepadIndex('gamepad:0'), 0);
  assert.equal(gamepadIndex('gamepad:12'), 12);
  for (const invalid of ['keyboard', 'gamepad:', 'gamepad:-1', 'gamepad:01', 'gamepad:1.5', 'gamepad:0junk', 'gamepad:9007199254740992', null, 0]) {
    assert.equal(gamepadIndex(invalid), null);
  }
});

test('left stick has a symmetric deadzone and never activates both directions', () => {
  for (const x of [-0.25, -0.01, 0, 0.25, NaN, Infinity]) {
    const input = readGamepad(pad(0, { axes: [x] }));
    assert.equal(input.left, false);
    assert.equal(input.right, false);
  }
  assert.equal(readGamepad(pad(0, { axes: [-0.251] })).left, true);
  assert.equal(readGamepad(pad(0, { axes: [0.251] })).right, true);
  assert.equal(readGamepad(pad(0, { axes: [-1] })).right, false);
  assert.equal(readGamepad(pad(0, { axes: [1] })).left, false);
});

test('standard buttons independently map to combat and menu actions', () => {
  const bindings = { 0: 'attack', 1: 'dodge', 2: 'parry', 3: 'counter', 4: 'duck', 5: 'shove', 8: 'rematch', 9: 'pause' };
  for (const [index, action] of Object.entries(bindings)) {
    const input = readGamepad(press(pad(), Number(index)));
    for (const name of Object.values(bindings)) assert.equal(input[name], name === action);
  }
});

test('holding and releasing attack and guard are reflected on every poll', () => {
  const controller = press(pad(), 0, 2);
  assert.equal(readGamepad(controller).attack, true);
  assert.equal(readGamepad(controller).parry, true);
  assert.equal(readGamepad(controller).attack, true);
  controller.buttons[0] = { pressed: false, value: 0 };
  controller.buttons[2] = { pressed: false, value: 0 };
  assert.equal(readGamepad(controller).attack, false);
  assert.equal(readGamepad(controller).parry, false);
});

test('button values support analog thresholds without treating mere touch as a press', () => {
  const controller = pad();
  controller.buttons[0] = { pressed: false, value: 0.5 };
  controller.buttons[1] = { touched: true, value: 0.1 };
  assert.equal(readGamepad(controller).attack, true);
  assert.equal(readGamepad(controller).dodge, false);
});

test('D-pad chooses a latched stance, not movement', () => {
  assert.equal(readGamepad(press(pad(), 12)).aim, 'high');
  assert.equal(readGamepad(press(pad(), 13)).aim, 'low');
  assert.equal(readGamepad(press(pad(), 14), 'high').aim, 'mid');
  assert.equal(readGamepad(press(pad(), 15), 'low').aim, 'mid');
  assert.equal(readGamepad(pad(), 'high').aim, 'high');
  assert.equal(readGamepad(press(pad(), 12, 13), 'low').aim, 'low');
  assert.equal(readGamepad(press(pad(), 14)).left, false);
  assert.equal(readGamepad(press(pad(), 15)).right, false);
  assert.equal(readGamepad(pad(), 'invalid').aim, 'mid');
});

test('unavailable and non-standard pads cannot generate phantom inputs', () => {
  const neutral = readGamepad(null, 'low');
  for (const controller of [undefined, pad(0, { connected: false }), pad(0, { mapping: '' }), pad(0, { mapping: 'xr-standard' })]) {
    if (controller) press(controller, 0, 1, 2, 3, 4, 5, 8, 9, 12);
    assert.deepEqual(readGamepad(controller, 'low'), neutral);
  }
  assert.equal(readGamepad(pad(0, { buttons: [], axes: [] })).attack, false);
});

test('pad listing retains actual indices and filters disconnected or unmapped pads', () => {
  const list = listGamepads([null, pad(1), pad(2, { connected: false }), null, pad(4), pad(5, { mapping: '' })]);
  assert.deepEqual(list.map(item => item.index), [1, 4]);
  assert.equal(list[0].label, 'Gamepad 2 · Test controller 1');
  assert.equal(list[1].id, 'Test controller 4');
  assert.deepEqual(listGamepads(null), []);
});

test('gamepad labels are compact while preserving the original device id', () => {
  const id = `  Controller\n${'X'.repeat(100)}`;
  const [item] = listGamepads([pad(0, { id })]);
  assert.equal(item.id, id);
  assert.ok(item.label.length < 90);
  assert.equal(item.label.includes('\n'), false);
  assert.ok(item.label.endsWith('…'));
});

test('single player accepts keyboard or a connected pad and ignores unused Player 2', () => {
  assert.equal(validateAssignments('solo', ['keyboard', 'gamepad:9'], []).valid, true);
  assert.equal(validateAssignments('solo', ['gamepad:2'], [null, null, pad(2)]).valid, true);
});

test('local play accepts mixed devices in either order or two separate pads', () => {
  const pads = [pad(0), null, pad(2)];
  for (const devices of [['keyboard', 'gamepad:2'], ['gamepad:0', 'keyboard'], ['gamepad:2', 'gamepad:0']]) {
    assert.deepEqual(validateAssignments('local', devices, pads), { valid: true, message: '' });
  }
});

test('both players cannot share a keyboard or the same pad', () => {
  assert.match(validateAssignments('local', ['keyboard', 'keyboard'], []).message, /two separate gamepads/);
  assert.equal(validateAssignments('local', ['gamepad:0', 'gamepad:0'], [pad()]).valid, false);
});

test('validation explains missing devices, disconnections and unsupported mappings', () => {
  assert.match(validateAssignments('local', ['keyboard'], []).message, /each player/);
  assert.match(validateAssignments('solo', ['gamepad:0'], [pad(0, { connected: false })]).message, /disconnected/);
  assert.match(validateAssignments('solo', ['gamepad:0'], [pad(0, { mapping: '' })]).message, /standard mapping/);
  assert.equal(validateAssignments('solo', ['gamepad:0'], null).valid, false);
  assert.equal(validateAssignments('solo', ['gamepad:0.0'], [pad()]).valid, false);
  assert.equal(validateAssignments('solo', ['touchscreen'], []).valid, false);
  assert.equal(validateAssignments('solo', null, []).valid, false);
  assert.equal(validateAssignments('network', ['keyboard'], []).valid, false);
});

test('helpers do not mutate browser snapshots or player assignments', () => {
  const controller = pad();
  controller.buttons.forEach(Object.freeze);
  Object.freeze(controller.buttons);
  Object.freeze(controller.axes);
  Object.freeze(controller);
  const devices = Object.freeze(['keyboard', 'gamepad:0']);
  assert.equal(readGamepad(controller).aim, 'mid');
  assert.equal(listGamepads(Object.freeze([controller])).length, 1);
  assert.equal(validateAssignments('local', devices, [controller]).valid, true);
});
