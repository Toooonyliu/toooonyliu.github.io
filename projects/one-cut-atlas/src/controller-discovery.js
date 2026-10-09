import { gamepadIndex } from './controllers.js';

export function scanControllers(navigatorLike, secureContext = true) {
  const result = { pads: [], devices: [], state: 'empty', message: 'No controller detected by this browser. Connect it, click this page, then press A on the controller.' };
  if (!secureContext) return { ...result, state: 'insecure', message: 'Controller access needs HTTPS. Open the published game directly in a browser tab.' };
  if (typeof navigatorLike?.getGamepads !== 'function') return { ...result, state: 'unsupported', message: 'This browser does not provide controller input. Try a current Chrome or Edge browser.' };
  try { result.pads = Array.from(navigatorLike.getGamepads() || []); }
  catch { return { ...result, state: 'blocked', message: 'The browser blocked controller access. Open the game directly in its own tab and check browser permissions.' }; }
  result.devices = deviceOptions(null, result.pads);
  if (result.devices.length) {
    result.state = 'ready';
    result.message = result.devices.some(device => device.supported)
      ? `${result.devices.length} controller${result.devices.length > 1 ? 's' : ''} detected. Select one below or use “Press A to assign”.`
      : 'Controller detected, but its button layout is not supported. See connection help below.';
  }
  return result;
}

// Keep unmapped devices visible. Detected and playable are different facts.
export function deviceOptions(selectedDevice, pads) {
  const options = Array.from(pads || []).filter(pad => pad?.connected && Number.isSafeInteger(pad.index) && pad.index >= 0).map(pad => {
    const name = String(pad.id || 'Controller').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    const supported = pad.mapping === 'standard';
    return { value: `gamepad:${pad.index}`, index: pad.index, id: name, connected: true, supported,
      label: `${pad.index + 1} · ${name.slice(0, 65)}${supported ? '' : ' · unsupported layout'}` };
  });
  const index = gamepadIndex(selectedDevice);
  if (index !== null && !options.some(option => option.value === selectedDevice)) {
    options.unshift({ value: selectedDevice, index, id: '', connected: false, supported: false, label: 'Waiting for a controller — select or assign below' });
  }
  return options;
}

export function chooseGamepadDevice(playerIndex, devices, pads) {
  const reserved = new Set(devices.filter((_, index) => index !== playerIndex));
  const available = deviceOptions(null, pads).find(option => option.supported && !reserved.has(option.value));
  if (available) return available.value;
  let index = 0;
  while (reserved.has(`gamepad:${index}`)) index++;
  return `gamepad:${index}`;
}

export function validatePreferences(mode, devices) {
  if (!['solo', 'local'].includes(mode)) return { valid: false, message: 'Choose a duel mode.' };
  const count = mode === 'local' ? 2 : 1;
  const selected = Array.isArray(devices) ? devices.slice(0, count) : [];
  if (selected.length !== count || selected.some(device => device !== 'keyboard' && gamepadIndex(device) === null)) {
    return { valid: false, message: 'Choose keyboard + mouse or a gamepad for each player.' };
  }
  if (count === 2 && selected[0] === selected[1]) {
    return { valid: false, message: selected[0] === 'keyboard' ? 'Only one player can use the keyboard. Choose a gamepad for the other player.' : 'Both players selected the same controller. Assign a different controller.' };
  }
  return { valid: true, message: '' };
}
