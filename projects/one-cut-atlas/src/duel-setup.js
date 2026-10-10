import { validateAssignments, gamepadIndex } from './controllers.js';
import { scanControllers, deviceOptions, chooseGamepadDevice, validatePreferences } from './controller-discovery.js';
import { controlDiagram, deviceIcon } from './control-diagrams.js';
import { t, onLanguageChange } from './i18n.js';

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
  let playing = false;
  let contextLevelName = '';
  let timer = null;
  let assigning = null;
  let assignmentMessage = '';
  let assignmentHeld = new Map();
  let bindingsTypes = ['', ''];

  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    cleanups.push(() => target.removeEventListener(event, handler));
  }

  function renderBindings(index) {
    const type = draft.devices[index] === 'keyboard' ? 'keyboard' : 'gamepad';
    if (bindingsTypes[index] === type) return;
    bindingsTypes[index] = type;
    $(`setup-diagram-${index + 1}`).innerHTML = controlDiagram(type);
    const rows = type === 'keyboard' ? KEYBOARD_BINDINGS : GAMEPAD_BINDINGS;
    const list = $(`setup-bindings-${index + 1}`);
    list.replaceChildren();
    for (const [action, keys, detail] of rows) {
      const term = document.createElement('dt');
      term.textContent = t(action);
      const description = document.createElement('dd');
      const key = document.createElement('kbd');
      key.textContent = t(keys);
      description.append(key);
      if (detail) {
        const hint = document.createElement('span');
        hint.textContent = t(detail);
        description.append(hint);
      }
      list.append(term, description);
    }
  }

  function updateOptions(select, selected, pads) {
    const choices = selected === 'keyboard' ? [{ value: 'keyboard', label: t('Keyboard + mouse') }] : deviceOptions(selected, pads);
    // Keep the select element, its focus and its selected value during hot-plug polling.
    const signature = JSON.stringify(choices);
    if (select.dataset.options !== signature) {
      select.dataset.options = signature;
      const options = choices.map(choice => {
        const option = document.createElement('option');
        option.value = choice.value;
        option.textContent = choice.label;
        return option;
      });
      select.replaceChildren(...options);
    }
    if (select.value !== selected) select.value = selected;
  }

  function refresh() {
    const report = scanControllers(navigator, window.isSecureContext);
    const rawPads = report.pads;
    if (assigning !== null) {
      for (const pad of rawPads) {
        if (!pad?.connected || pad.mapping !== 'standard') continue;
        const down = pad.buttons?.[0]?.pressed || pad.buttons?.[0]?.value >= .5;
        const wasDown = assignmentHeld.get(pad.index);
        assignmentHeld.set(pad.index, Boolean(down));
        if (!down || wasDown) continue;
        const device = `gamepad:${pad.index}`;
        const other = 1 - assigning;
        if (draft.mode === 'local' && draft.devices[other] === device) {
          assignmentMessage = { player: other + 1 };
          break;
        }
        draft.devices[assigning] = device;
        assignmentMessage = '';
        assigning = null;
        break;
      }
    }
    for (let index = 0; index < selectors.length; index++) {
      const device = draft.devices[index];
      const keyboard = device === 'keyboard';
      updateOptions(selectors[index], device, rawPads);
      $(`setup-pad-picker-${index + 1}`).hidden = keyboard;
      $(`setup-keyboard-note-${index + 1}`).hidden = !keyboard;
      for (const button of $(`setup-types-${index + 1}`).querySelectorAll('button')) {
        button.setAttribute('aria-pressed', String(button.dataset.deviceType === (keyboard ? 'keyboard' : 'gamepad')));
      }
      const assign = $(`setup-assign-${index + 1}`);
      assign.textContent = t(assigning === index ? 'Listening… press A again (click to cancel)' : 'Press A to assign a controller');
      assign.setAttribute('aria-pressed', String(assigning === index));
      renderBindings(index);
      const status = $(`setup-device-status-${index + 1}`);
      const pad = report.devices.find(pad => pad.value === device);
      const ready = keyboard || pad?.supported;
      status.dataset.ready = String(Boolean(ready));
      status.dataset.state = ready ? 'ready' : pad ? 'unsupported' : 'waiting';
      status.textContent = keyboard ? t('Ready · keyboard + mouse') : pad?.supported ? t('Connected · standard controller layout') : pad
        ? t('Detected, but this controller layout is not supported. See connection help.')
        : ['blocked', 'insecure', 'unsupported'].includes(report.state) ? report.message
        : t(start || playing
          ? 'Gamepad selected · waiting for detection. Connect and assign it to play.'
          : 'Gamepad selected · waiting for detection. You can save this choice now.');
    }
    const preferences = validatePreferences(draft.mode, draft.devices);
    const connected = validateAssignments(draft.mode, draft.devices, rawPads);
    const requiresConnection = start || playing;
    const valid = preferences.valid && (!requiresConnection || connected.valid);
    const message = $('setup-validation');
    const hasGamepad = draft.devices.slice(0, draft.mode === 'local' ? 2 : 1).some(device => device !== 'keyboard');
    const detectionBlocked = hasGamepad && ['blocked', 'insecure', 'unsupported'].includes(report.state);
    let missingText = detectionBlocked ? report.message : connected.message;
    if (!detectionBlocked) for (let player = 1; player <= 2; player++) {
      if (missingText === t("Player {player}'s gamepad is disconnected. Connect it and press a button.", { player })) {
        missingText = t("Player {player}'s gamepad is not detected. Connect it and press A, then assign it above.", { player });
        break;
      }
    }
    const text = assignmentMessage ? t('That controller belongs to Player {player}. Select another device for them first.', assignmentMessage)
      : !preferences.valid ? preferences.message : !connected.valid
      ? requiresConnection ? missingText : t('You can save this setup now. Connect and assign the controller before starting a duel.')
      : t(draft.mode === 'local' ? 'Ready · two players, two separate input devices.' : 'Ready for a solo duel.');
    if (message.textContent !== text) message.textContent = text;
    message.dataset.valid = String(valid);
    $('setup-confirm').disabled = !valid;
    $('setup-pad-hint').textContent = hasGamepad ? report.message : t('Choose an input type above. Controller choices can be saved before you connect one.');
    const rows = report.devices.map(pad => `#${pad.index + 1} ${pad.id}\n  ${t(pad.supported ? 'Standard layout · playable' : 'Detected · unsupported/raw layout')}`);
    const reportText = `${t('Browser status: {state}', { state: t(report.state) })}\n${report.message}\n${rows.join('\n')}`;
    if ($('setup-controller-report').textContent !== reportText) $('setup-controller-report').textContent = reportText;
    return valid;
  }

  function renderMode() {
    const local = draft.mode === 'local';
    for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.setupMode === draft.mode));
    $('setup-player-two-title').textContent = t(local ? 'Player 2' : 'AI rival');
    $('setup-player-two-input').hidden = !local;
    $('setup-ai').hidden = local;
    selectors[1].disabled = !local;
    $('setup-mode-note').textContent = t(local
      ? 'Use one keyboard + one gamepad, or two gamepads. The keyboard can belong to either player. Local wins do not award solo stamps.'
      : 'Choose keyboard + mouse or one gamepad. The rival is controlled by the game.');
    refresh();
  }

  function renderContext() {
    const context = [];
    if (contextLevelName) context.push(contextLevelName);
    context.push(t(playing ? 'Apply to restart. Cancel keeps this duel paused; close, then Resume to continue.' : 'Choose your duel and who holds each blade.'));
    $('setup-context').textContent = context.join(' · ');
    $('setup-confirm').textContent = t(start ? 'Start duel' : playing ? 'Apply & restart' : 'Save settings');
    for (let index = 0; index < 2; index++) {
      for (const button of $(`setup-types-${index + 1}`).querySelectorAll('button')) {
        button.querySelector('span').innerHTML = t(button.dataset.deviceType === 'keyboard' ? 'Keyboard<br>+ mouse' : 'Gamepad<br>Xbox / PS');
      }
    }
  }

  function stopPolling() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function close() {
    assigning = null;
    assignmentMessage = '';
    stopPolling();
    if (dialog.open) dialog.close();
  }

  for (const button of modeButtons) listen(button, 'click', () => {
    assigning = null;
    assignmentMessage = '';
    draft.mode = button.dataset.setupMode;
    renderMode();
  });
  selectors.forEach((select, index) => listen(select, 'change', () => {
    assigning = null;
    assignmentMessage = '';
    draft.devices[index] = select.value;
    refresh();
  }));
  for (let index = 0; index < 2; index++) {
    $(`setup-types-${index + 1}`).innerHTML = ['keyboard', 'gamepad'].map(type => `<button type="button" class="device-type" data-device-type="${type}" data-player="${index}" aria-pressed="false">${deviceIcon(type)}<span>${t(type === 'keyboard' ? 'Keyboard<br>+ mouse' : 'Gamepad<br>Xbox / PS')}</span></button>`).join('');
    for (const button of $(`setup-types-${index + 1}`).querySelectorAll('button')) listen(button, 'click', () => {
      assigning = null;
      assignmentMessage = '';
      if (button.dataset.deviceType === 'keyboard') draft.devices[index] = 'keyboard';
      else if (draft.devices[index] === 'keyboard') draft.devices[index] = chooseGamepadDevice(index, draft.mode === 'local' ? draft.devices : [draft.devices[0]], scanControllers(navigator).pads);
      refresh();
    });
    listen($(`setup-assign-${index + 1}`), 'click', () => {
      assigning = assigning === index ? null : index;
      assignmentMessage = '';
      assignmentHeld = new Map(scanControllers(navigator).pads.filter(Boolean).map(pad => [pad.index, Boolean(pad.buttons?.[0]?.pressed || pad.buttons?.[0]?.value >= .5)]));
      refresh();
    });
  }
  listen($('setup-rescan'), 'click', refresh);
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
  cleanups.push(onLanguageChange(() => {
    bindingsTypes = ['', ''];
    renderContext();
    renderMode();
  }));

  return {
    open(config, { levelName = '', playing: isPlaying = false, start: shouldStart = false } = {}) {
      draft = copyConfig(config);
      start = shouldStart;
      playing = isPlaying;
      contextLevelName = levelName;
      assigning = null;
      assignmentMessage = '';
      renderContext();
      renderMode();
      stopPolling();
      if (!dialog.open) dialog.showModal();
      timer = setInterval(refresh, 100);
    },
    close,
    destroy() {
      close();
      for (const cleanup of cleanups) cleanup();
    },
  };
}
