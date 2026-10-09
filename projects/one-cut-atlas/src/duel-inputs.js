import { gamepadIndex, readGamepad } from './controllers.js';

const COMBAT = ['left', 'right', 'attack', 'parry', 'dodge', 'duck', 'counter', 'shove'];
const neutral = aim => ({ ...Object.fromEntries(COMBAT.map(action => [action, false])), aim });

export function normalizeSettings(value) {
  const devices = [0, 1].map(index => {
    const device = value?.devices?.[index];
    return device === 'keyboard' || gamepadIndex(device) !== null ? device : index ? 'gamepad:0' : 'keyboard';
  });
  return { mode: value?.mode === 'local' ? 'local' : 'solo', devices };
}

// Physical pads are addressed by browser index, never by their position in a
// compacted list. No input is shared between fighters, including menu edges.
export class DuelInputs {
  constructor(settings) {
    this.settings = normalizeSettings(settings);
    this.aims = ['mid', 'mid'];
    this.menuHeld = [{}, {}];
    this.suppress();
  }

  suppress() {
    // A held button/stick must return to neutral after pause, focus loss or a
    // restart; resuming must not release an old charge or queue a new attack.
    this.blocked = [true, true];
  }

  reset() {
    this.aims = ['mid', 'mid'];
    this.suppress();
  }

  sample(pads, keyboard, { suspended = false, paused = false } = {}) {
    const result = { players: [neutral('mid'), neutral('mid')], pause: false, rematch: false };
    const combatSuspended = suspended || paused;
    const count = this.settings.mode === 'local' ? 2 : 1;
    for (let index = 0; index < count; index++) {
      const device = this.settings.devices[index];
      if (device === 'keyboard') {
        result.players[index] = combatSuspended ? neutral(keyboard.aim) : { ...keyboard };
        continue;
      }
      const pad = Array.from(pads || []).find(pad => pad?.index === gamepadIndex(device));
      const controls = readGamepad(pad, this.aims[index]);
      for (const action of ['pause', 'rematch']) {
        if (!suspended && controls[action] && !this.menuHeld[index][action]) result[action] = true;
        this.menuHeld[index][action] = controls[action];
      }
      if (combatSuspended) this.blocked[index] = true;
      if (!combatSuspended && this.blocked[index] && !controls.aimHeld && !COMBAT.some(action => controls[action])) this.blocked[index] = false;
      if (!combatSuspended && !this.blocked[index]) {
        this.aims[index] = controls.aim;
        result.players[index] = Object.fromEntries([...COMBAT, 'aim'].map(action => [action, controls[action]]));
      } else result.players[index] = neutral(this.aims[index]);
    }
    return result;
  }
}
