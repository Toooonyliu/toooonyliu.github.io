import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setLanguage } from '../src/i18n.js';
import { listGamepads, readGamepad, validateAssignments } from '../src/controllers.js';
import { scanControllers, deviceOptions, chooseGamepadDevice, validatePreferences } from '../src/controller-discovery.js';

afterEach(() => setLanguage('en'));

function pad(index, overrides = {}) {
  return { index, id: 'Xbox Wireless Controller (045E-02FD)', connected: true, mapping: 'standard',
    axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), ...overrides };
}

test('Chinese assignment errors identify the player without changing validation rules', () => {
  setLanguage('zh-CN');
  assert.deepEqual(validateAssignments('local', ['keyboard', 'gamepad:3'], []), {
    valid: false, message: '玩家 2 的手柄已断开。请重新连接并按任意按键。',
  });
  assert.match(validateAssignments('solo', ['gamepad:0'], [pad(0, { mapping: '' })]).message, /玩家 1.*标准按键映射/);
  assert.deepEqual(validateAssignments('local', ['gamepad:3', 'keyboard'], [pad(3)]), { valid: true, message: '' });
  assert.equal(validateAssignments('local', ['gamepad:3', 'gamepad:3'], [pad(3)]).valid, false);
  assert.match(validatePreferences('local', ['keyboard', 'keyboard']).message, /只有一名玩家/);
  assert.match(validatePreferences('local', ['gamepad:0', 'gamepad:0']).message, /同一个手柄/);
});

test('Chinese discovery preserves distinct empty, blocked, insecure and unavailable states', () => {
  setLanguage('zh-CN');
  const cases = [
    [scanControllers({ getGamepads: () => [] }), 'empty', /尚未检测到手柄/],
    [scanControllers({ getGamepads() { throw new Error('Access denied'); } }), 'blocked', /阻止了手柄访问/],
    [scanControllers({ getGamepads: () => [] }, false), 'insecure', /HTTPS/],
    [scanControllers({}), 'unsupported', /不提供手柄输入/],
  ];
  for (const [result, expectedState, expectedMessage] of cases) {
    assert.equal(result.state, expectedState);
    assert.match(result.message, expectedMessage);
    assert.deepEqual(result.devices, []);
  }
});

test('translated controller counts and layout hints preserve device identities and sparse indices', () => {
  const raw = pad(3, { id: '原装 Controller X / Vendor 1234', mapping: '' });
  const standard = pad(7);
  setLanguage('zh-CN');
  const report = scanControllers({ getGamepads: () => [null, raw, standard] });
  assert.match(report.message, /已检测到 2 个手柄/);
  assert.deepEqual(report.devices.map(device => device.index), [3, 7]);
  assert.equal(report.devices[0].id, raw.id);
  assert.match(report.devices[0].label, /原装 Controller X \/ Vendor 1234.*不支持的按键布局/);
  assert.equal(report.devices[1].id, standard.id);
  assert.equal(chooseGamepadDevice(1, ['keyboard'], [null, raw, standard]), 'gamepad:7');
  assert.match(scanControllers({ getGamepads: () => [standard] }).message, /已检测到 1 个手柄/);
  assert.match(scanControllers({ getGamepads: () => [raw] }).message, /已检测到手柄.*暂不支持/);
  assert.match(deviceOptions('gamepad:0', [])[0].label, /等待手柄连接/);
  assert.equal(listGamepads([standard])[0].label, `手柄 8 · ${standard.id}`);
});

test('language switching changes display copy but never combat mappings or device validity', () => {
  const controller = pad(5, { axes: [0.9, 0] });
  controller.buttons[0].pressed = true;
  controller.buttons[12].pressed = true;
  setLanguage('en');
  const englishInput = readGamepad(controller);
  const englishValid = validatePreferences('local', ['gamepad:5', 'keyboard']);
  setLanguage('zh-CN');
  assert.deepEqual(readGamepad(controller), englishInput);
  assert.deepEqual(validatePreferences('local', ['gamepad:5', 'keyboard']), englishValid);
  setLanguage('en');
  assert.equal(validateAssignments('solo', ['gamepad:5'], []).message,
    "Player 1's gamepad is disconnected. Connect it and press a button.");
  assert.equal(scanControllers({ getGamepads: () => [controller] }).message,
    '1 controller detected. Select one below or use “Press A to assign”.');
});
