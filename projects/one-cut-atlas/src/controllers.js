// Browser-standard gamepad layout. Keep polling/DOM work outside these pure helpers.
import { t } from './i18n.js';

const STANCES = new Set(['high', 'mid', 'low']);
const MOVE_DEADZONE = 0.25;

function available(pad) {
  return pad?.connected === true && pad.mapping === 'standard';
}

function pressed(pad, index) {
  const button = pad.buttons?.[index];
  return button?.pressed === true || (Number.isFinite(button?.value) && button.value >= 0.5);
}

export function gamepadIndex(device) {
  if (typeof device !== 'string' || !/^gamepad:(0|[1-9]\d*)$/.test(device)) return null;
  const index = Number(device.slice(8));
  return Number.isSafeInteger(index) ? index : null;
}

export function readGamepad(pad, previousAim = 'mid') {
  const input = {
    left: false, right: false, attack: false, parry: false,
    dodge: false, duck: false, counter: false, shove: false,
    aim: STANCES.has(previousAim) ? previousAim : 'mid',
    pause: false, rematch: false, aimHeld: false,
  };
  if (!available(pad)) return input;

  const x = pad.axes?.[0];
  if (Number.isFinite(x)) {
    input.left = x < -MOVE_DEADZONE;
    input.right = x > MOVE_DEADZONE;
  }
  input.attack = pressed(pad, 0); // A / Cross: hold to charge, release to strike.
  input.dodge = pressed(pad, 1); // B / Circle.
  input.parry = pressed(pad, 2); // X / Square: hold to guard.
  input.counter = pressed(pad, 3); // Y / Triangle.
  input.duck = pressed(pad, 4); // LB / L1.
  input.shove = pressed(pad, 5); // RB / R1.
  input.pause = pressed(pad, 9); // Menu / Options.
  input.rematch = pressed(pad, 8); // View / Share.

  const high = pressed(pad, 12), low = pressed(pad, 13);
  input.aimHeld = high || low || pressed(pad, 14) || pressed(pad, 15);
  if (pressed(pad, 14) || pressed(pad, 15)) input.aim = 'mid';
  else if (high !== low) input.aim = high ? 'high' : 'low';
  return input;
}

export function listGamepads(pads) {
  return Array.from(pads ?? [])
    .filter(pad => available(pad) && Number.isSafeInteger(pad.index) && pad.index >= 0)
    .map(pad => {
      const id = typeof pad.id === 'string' ? pad.id : '';
      const name = id.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
      const shortName = name.length > 64 ? `${name.slice(0, 61)}…` : name;
      return { index: pad.index, id, label: `${t('Gamepad {number}', { number: pad.index + 1 })}${shortName ? ` · ${shortName}` : ''}` };
    });
}

export function validateAssignments(mode, devices, pads) {
  const invalid = message => ({ valid: false, message });
  if (mode !== 'solo' && mode !== 'local') return invalid(t('Choose single player or local two-player mode.'));
  const count = mode === 'local' ? 2 : 1;
  const selected = Array.isArray(devices) ? devices.slice(0, count) : [];
  if (selected.length !== count || selected.some(device => !device)) return invalid(t('Choose an input device for each player.'));
  if (count === 2 && selected[0] === selected[1]) {
    return invalid(t(selected[0] === 'keyboard'
      ? 'Use a keyboard and gamepad, or two separate gamepads.'
      : 'Each player needs a different gamepad.'));
  }
  const connected = Array.from(pads ?? []);
  for (let player = 0; player < count; player++) {
    const device = selected[player];
    if (device === 'keyboard') continue;
    const index = gamepadIndex(device);
    if (index === null) return invalid(t('Choose a valid input device for Player {player}.', { player: player + 1 }));
    const pad = connected.find(candidate => candidate?.index === index && candidate.connected === true);
    if (!pad) return invalid(t("Player {player}'s gamepad is disconnected. Connect it and press a button.", { player: player + 1 }));
    if (pad.mapping !== 'standard') return invalid(t("Player {player}'s gamepad needs a browser-standard mapping. Try a compatible controller.", { player: player + 1 }));
  }
  return { valid: true, message: '' };
}
