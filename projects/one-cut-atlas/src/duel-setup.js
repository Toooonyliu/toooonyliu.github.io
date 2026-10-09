import { listGamepads, validateAssignments, gamepadIndex } from './controllers.js';

const KEYBOARD_BINDINGS = [
  ['Move', 'A / D · ← / →'],
  ['Blade line', 'W / X / S · 1 / 2 / 3', 'High / mid / low, or mouse height'],
  ['Strike', 'J / Left click', 'Hold to charge, release to strike'],
  ['Guard', 'K', 'Hold; match the incoming blade line'],
  ['Evade', 'Space / Right click'],
  ['Duck', 'C', 'Hold to stay low'],
  ['Counter', 'L', 'After a successful guard or evade'],
  ['Shove', 'V'],
  ['Pause / Rematch', 'Esc / R', 'Rematch after the result'],
  ['Sound', 'M'],
];
const GAMEPAD_BINDINGS = [
  ['Move', 'Left stick ← / →'],
  ['Blade line', 'D-pad ↑ / ← → / ↓', 'High / mid / low'],
  ['Strike', 'A / Cross', 'Hold to charge, release to strike'],
  ['Guard', 'X / Square', 'Hold; match the incoming blade line'],
  ['Evade', 'B / Circle'],
  ['Duck', 'LB / L1', 'Hold to stay low'],
  ['Counter', 'Y / Triangle', 'After a successful guard or evade'],
  ['Shove', 'RB / R1'],
  ['Pause', 'Start / Options'],
  ['Rematch', 'Back / Share', 'After the result'],
];

function readGamepads() {
  try { return Array.from(navigator.getGamepads?.() || []); }
  catch { return []; }
}

function copyConfig(config) {
  return {
    mode: config?.mode === 'local' ? 'local' : 'solo',
    devices: [config?.devices?.[0] || 'keyboard', config?.devices?.[1] || 'gamepad:0'],
  };
}

/** One modal for pre-duel setup and settings. Drafts never mutate live assignments. */
export function createDuelSetup({ onStart, onSave } = {}) {
  const $ = id => document.getElementById(id);
  const dialog = $('duel-setup');
  const selectors = [$('setup-device-1'), $('setup-device-2')];
  const modeButtons = Array.from(dialog.querySelectorAll('[data-setup-mode]'));
  const cleanups = [];
  let draft = copyConfig();
  let start = false;
  let timer = null;
  let bindingsTypes = ['', ''];

  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    cleanups.push(() => target.removeEventListener(event, handler));
  }

  function renderBindings(index) {
    const type = draft.devices[index] === 'keyboard' ? 'keyboard' : 'gamepad';
    if (bindingsTypes[index] === type) return;
    bindingsTypes[index] = type;
    const rows = type === 'keyboard' ? KEYBOARD_BINDINGS : GAMEPAD_BINDINGS;
    const list = $(`setup-bindings-${index + 1}`);
    list.replaceChildren();
    for (const [action, keys, detail] of rows) {
      const term = document.createElement('dt');
      term.textContent = action;
      const description = document.createElement('dd');
      const key = document.createElement('kbd');
      key.textContent = keys;
      description.append(key);
      if (detail) {
        const hint = document.createElement('span');
        hint.textContent = detail;
        description.append(hint);
      }
      list.append(term, description);
    }
  }

  function updateOptions(select, selected, pads) {
    const choices = [{ value: 'keyboard', label: 'Keyboard + mouse', disabled: false }];
    for (const pad of pads) choices.push({ value: `gamepad:${pad.index}`, label: pad.label, disabled: false });
    if (!choices.some(option => option.value === selected)) {
      const index = gamepadIndex(selected);
      choices.push({ value: selected, label: index === null ? 'Choose an input device' : `Gamepad ${index + 1} · unavailable`, disabled: true });
    }
    // Keep the select element, its focus and its selected value during hot-plug polling.
    const signature = JSON.stringify(choices);
    if (select.dataset.options !== signature) {
      select.dataset.options = signature;
      const options = choices.map(choice => {
        const option = document.createElement('option');
        option.value = choice.value;
        option.textContent = choice.label;
        option.disabled = choice.disabled;
        return option;
      });
      select.replaceChildren(...options);
    }
    if (select.value !== selected) select.value = selected;
  }

  function refresh() {
    const rawPads = readGamepads();
    const pads = listGamepads(rawPads);
    for (let index = 0; index < selectors.length; index++) {
      const device = draft.devices[index];
      updateOptions(selectors[index], device, pads);
      renderBindings(index);
      const status = $(`setup-device-status-${index + 1}`);
      const connected = device === 'keyboard' || pads.some(pad => `gamepad:${pad.index}` === device);
      status.dataset.ready = String(connected);
      status.textContent = device === 'keyboard'
        ? 'Ready · keyboard, mouse and touch controls'
        : connected ? 'Connected · Xbox / PlayStation button names below' : 'Unavailable · connect this pad and press a button';
    }
    const validation = validateAssignments(draft.mode, draft.devices, rawPads);
    const message = $('setup-validation');
    const readyText = draft.mode === 'local' ? 'Ready for two players. Each blade has its own input device.' : 'Ready for a solo duel.';
    const text = validation.valid ? readyText : validation.message;
    if (message.textContent !== text) message.textContent = text;
    message.dataset.valid = String(validation.valid);
    $('setup-confirm').disabled = !validation.valid;
    const apiAvailable = typeof navigator.getGamepads === 'function';
    $('setup-pad-hint').textContent = apiAvailable
      ? 'Connect a controller, then press any button to let the browser detect it. Standard Xbox / PlayStation-style controllers are supported.'
      : 'Gamepads are not available in this browser. Try a current browser over HTTPS, or choose keyboard + mouse for a solo duel.';
    return validation.valid;
  }

  function renderMode() {
    const local = draft.mode === 'local';
    for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.setupMode === draft.mode));
    $('setup-player-two-title').textContent = local ? 'Player 2' : 'AI rival';
    $('setup-player-two-input').hidden = !local;
    $('setup-ai').hidden = local;
    selectors[1].disabled = !local;
    $('setup-mode-note').textContent = local
      ? 'Use one keyboard + one gamepad, or two gamepads. The keyboard can belong to either player. Local wins do not award solo stamps.'
      : 'Choose keyboard + mouse or one gamepad. The rival is controlled by the game.';
    refresh();
  }

  function stopPolling() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function close() {
    stopPolling();
    if (dialog.open) dialog.close();
  }

  for (const button of modeButtons) listen(button, 'click', () => {
    draft.mode = button.dataset.setupMode;
    renderMode();
  });
  selectors.forEach((select, index) => listen(select, 'change', () => {
    draft.devices[index] = select.value;
    refresh();
  }));
  listen($('setup-close'), 'click', close);
  listen($('setup-cancel'), 'click', close);
  listen(dialog, 'close', stopPolling);
  listen($('setup-confirm'), 'click', () => {
    // Validate against a fresh snapshot, not the last half-second poll.
    if (!refresh()) return;
    const config = copyConfig(draft);
    const callback = start ? onStart : onSave;
    close();
    callback?.(config);
  });
  for (const event of ['gamepadconnected', 'gamepaddisconnected']) listen(window, event, () => {
    if (dialog.open) refresh();
  });

  return {
    open(config, { levelName = '', playing = false, start: shouldStart = false } = {}) {
      draft = copyConfig(config);
      start = shouldStart;
      const context = [];
      if (levelName) context.push(levelName);
      context.push(playing ? 'Apply to restart. Cancel keeps this duel paused; close, then Resume to continue.' : 'Choose your duel and who holds each blade.');
      $('setup-context').textContent = context.join(' · ');
      $('setup-confirm').textContent = start ? 'Start duel' : playing ? 'Apply & restart' : 'Save settings';
      renderMode();
      stopPolling();
      if (!dialog.open) dialog.showModal();
      timer = setInterval(refresh, 500);
    },
    close,
    destroy() {
      close();
      for (const cleanup of cleanups) cleanup();
    },
  };
}
