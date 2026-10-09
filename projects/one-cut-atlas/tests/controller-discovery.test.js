import test from 'node:test';
import assert from 'node:assert/strict';
import { scanControllers, deviceOptions, chooseGamepadDevice, validatePreferences } from '../src/controller-discovery.js';
import { validateAssignments } from '../src/controllers.js';
const pad = (index, mapping = 'standard') => ({ index, id: 'Xbox test controller', mapping, connected: true });

test('a gamepad preference is savable offline but does not authorize starting a duel', () => {
  const devices = ['keyboard', 'gamepad:0'];
  assert.equal(validatePreferences('local', devices).valid, true);
  assert.equal(validateAssignments('local', devices, []).valid, false);
  assert.equal(deviceOptions('gamepad:0', [])[0].connected, false);
});
test('unmapped connected Xbox controllers remain visible with an unsupported-layout status', () => {
  const report = scanControllers({ getGamepads: () => [pad(2, '')] });
  assert.equal(report.state, 'ready');
  assert.equal(report.devices[0].connected, true);
  assert.equal(report.devices[0].supported, false);
  assert.match(report.devices[0].label, /Xbox.*unsupported layout/);
  assert.equal(validateAssignments('solo', ['gamepad:2'], report.pads).valid, false);
});
test('empty, unavailable, insecure and blocked browser access are distinguished', () => {
  assert.equal(scanControllers({ getGamepads: () => [] }).state, 'empty');
  assert.equal(scanControllers({}).state, 'unsupported');
  assert.equal(scanControllers({}, false).state, 'insecure');
  const report = scanControllers({ getGamepads() { throw new Error('Access denied'); } });
  assert.equal(report.state, 'blocked');
  assert.match(report.message, /blocked/);
});
test('sparse browser indices are preserved and another player never gets the same pad implicitly', () => {
  assert.equal(chooseGamepadDevice(0, ['keyboard', 'gamepad:0'], [pad(0), null, pad(2)]), 'gamepad:2');
  assert.equal(chooseGamepadDevice(0, ['keyboard', 'gamepad:0'], []), 'gamepad:1');
  assert.equal(deviceOptions('gamepad:2', [pad(2)]).length, 1);
});
test('preferences still reject shared keyboards, shared pads and invalid identifiers', () => {
  for (const devices of [['keyboard', 'keyboard'], ['gamepad:0', 'gamepad:0'], ['keyboard', 'gamepad:01']]) {
    assert.equal(validatePreferences('local', devices).valid, false);
  }
  assert.equal(validatePreferences('solo', ['keyboard', 'gamepad:0']).valid, true);
});
