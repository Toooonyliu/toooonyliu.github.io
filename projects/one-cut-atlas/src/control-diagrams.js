// Authored SVG UI diagrams: exact key positions and labels, no external assets.
const colors = { move: '#476f79', line: '#a77729', strike: '#437653', guard: '#406fa0', evade: '#a3483d', counter: '#aa7d1e', other: '#75657d' };
const keyboardActions = { A: 'move', D: 'move', W: 'line', X: 'line', S: 'line', '1': 'line', '2': 'line', '3': 'line', J: 'strike', K: 'guard', L: 'counter', C: 'other', V: 'other', SPACE: 'evade' };
function key(label, x, y, width = 25) {
  const fill = colors[keyboardActions[label]] || '#e6dcc4', ink = keyboardActions[label] ? '#fff9e9' : '#4c483d';
  return `<g><rect x="${x}" y="${y + 3}" width="${width}" height="25" rx="2" fill="#837963"/><rect x="${x}" y="${y}" width="${width}" height="25" rx="2" fill="${fill}" stroke="#544d3c" stroke-width="1.3"/><text x="${x + width / 2}" y="${y + 17}" text-anchor="middle" fill="${ink}" font-size="${label.length > 2 ? 11 : 15}">${label}</text></g>`;
}
function keyboardDrawing() {
  let keys = key('Esc', 22, 28, 35) + key('F1', 70, 28) + key('F2', 102, 28) + key('F3', 134, 28);
  const rows = [ ['1234567890', 22, 64], ['QWERTYUIOP', 22, 98], ['ASDFGHJKL', 35, 132], ['ZXCVBNM', 49, 166] ];
  for (const [row, x, y] of rows) keys += [...row].map((label, i) => key(label, x + i * 29, y)).join('');
  keys += key('SPACE', 88, 200, 160);
  return `<svg class="control-drawing" viewBox="0 0 480 264" role="img" aria-label="Keyboard and mouse. A and D move; W X S choose blade line; J strikes, K guards, L counters, C ducks, V shoves. Space evades. Left mouse strikes and right mouse evades." xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="14" width="326" height="225" rx="8" fill="#baae91" stroke="#403a2b" stroke-width="3"/>
    <rect x="13" y="20" width="314" height="212" rx="5" fill="#d0c5a9"/>
    <g font-family="ui-monospace,monospace" font-weight="700">${keys}</g>
    <path d="M405 20v27q0 12-10 18" fill="none" stroke="#514835" stroke-width="4"/>
    <path d="M357 122q0-49 45-49t45 49v55q0 56-45 56t-45-56z" fill="#d0c5a9" stroke="#403a2b" stroke-width="3"/>
    <path d="M361 125q-1-47 38-48v63h-38z" fill="${colors.strike}"/>
    <path d="M406 77q38 2 37 48v15h-37z" fill="${colors.evade}"/>
    <path d="M402 75v68m-43 0h86" stroke="#403a2b" stroke-width="3"/>
    <rect x="397" y="96" width="10" height="25" rx="5" fill="#332f27" stroke="#e7dcc1"/>
    <g fill="#fff9e9" font-family="ui-monospace,monospace" font-size="17" font-weight="700"><text x="373" y="128">L</text><text x="421" y="128">R</text></g>
    <path d="M393 167v38m-7-30 7-8 7 8m-14 22 7 8 7-8" fill="none" stroke="${colors.line}" stroke-width="3"/>
    <text x="402" y="254" text-anchor="middle" fill="#5e533f" font-family="ui-monospace,monospace" font-size="13">HEIGHT = BLADE LINE</text>
  </svg>`;
}
function controllerDrawing() {
  const face = (label, x, y, action) => `<circle cx="${x}" cy="${y}" r="18" fill="${colors[action]}" stroke="#292d2b" stroke-width="3"/><text x="${x}" y="${y + 6}" text-anchor="middle" fill="#fff9e9" font-size="20" font-weight="700">${label}</text>`;
  return `<svg class="control-drawing" viewBox="0 0 480 300" role="img" aria-label="Xbox-style controller. Left stick moves. D-pad sets blade line. A strikes, B evades, X guards, Y counters. LB ducks and RB shoves. Menu pauses; View rematches." xmlns="http://www.w3.org/2000/svg">
    <g fill="${colors.other}" stroke="#302c23" stroke-width="3"><path d="M84 66v-19q0-10 12-10h72q13 0 13 12v16z"/><path d="M299 65V49q0-12 13-12h72q12 0 12 10v19z"/></g>
    <g font-family="ui-monospace,monospace" font-weight="700" font-size="17" fill="#fff9e9"><text x="118" y="56">LB</text><text x="333" y="56">RB</text></g>
    <path d="M92 61Q68 65 56 101L27 219Q15 269 50 274q21 4 41-29l42-54q15-15 38-13h138q23-2 38 13l42 54q20 33 41 29 35-5 23-55l-29-118q-12-36-36-40-33-5-73 1H165q-40-6-73-1z" fill="#d0c5a9" stroke="#403a2b" stroke-width="4"/>
    <path d="m68 169-23 68q-6 19 7 20m360-88 23 68q6 19-7 20" stroke="#aa9d80" stroke-width="9" fill="none"/>
    <circle cx="126" cy="119" r="37" fill="${colors.move}" stroke="#403a2b" stroke-width="3"/><circle cx="126" cy="119" r="25" fill="#354e54" stroke="#9eb4af" stroke-width="2"/>
    <path d="m106 119 8-7v14zm40 0-8-7v14z" fill="#f4eedb"/>
    <circle cx="292" cy="184" r="29" fill="#baae92" stroke="#726953" stroke-width="3"/><circle cx="292" cy="184" r="19" fill="#8a806a"/>
    <circle cx="180" cy="185" r="36" fill="#c0b396"/>
    <path d="M169 155h22v19h19v22h-19v19h-22v-19h-19v-22h19z" fill="${colors.line}" stroke="#493f2a" stroke-width="2"/>
    <path d="m180 160-6 7h12zm0 50-6-7h12zm-25-25 7-6v12zm50 0-7-6v12z" fill="#fff3cf"/>
    <g font-family="ui-monospace,monospace">${face('Y', 359, 89, 'counter')}${face('X', 328, 120, 'guard')}${face('B', 390, 120, 'evade')}${face('A', 359, 151, 'strike')}</g>
    <circle cx="214" cy="110" r="13" fill="#e9dfc6" stroke="#6e6450" stroke-width="2"/><circle cx="266" cy="110" r="13" fill="#e9dfc6" stroke="#6e6450" stroke-width="2"/>
    <g stroke="#534b3a" stroke-width="2" fill="none"><rect x="208" y="105" width="8" height="7"/><path d="M212 109h8v7h-8m49-11h10m-10 5h10m-10 5h10"/></g>
    <circle cx="240" cy="80" r="9" fill="#706651"/>
    <g fill="#584d39" font-family="ui-monospace,monospace" font-size="14" text-anchor="middle"><text x="126" y="26">DUCK</text><text x="350" y="26">SHOVE</text><text x="126" y="293">MOVE</text><text x="271" y="293">D-PAD = BLADE LINE</text></g>
  </svg>`;
}
function legend(rows) {
  return `<div class="control-legend">${rows.map(([key, label, action]) => `<div><b style="--binding-color:${colors[action] || '#716751'}">${key}</b><span>${label}</span></div>`).join('')}</div>`;
}
export function controlDiagram(type) {
  const gamepad = type === 'gamepad';
  const rows = gamepad ? [
    ['LS ↔', 'Move', 'move'], ['D-pad', '↑ High · ←→ Mid · ↓ Low', 'line'],
    ['A', 'Hold / release to strike', 'strike'], ['B', 'Evade', 'evade'],
    ['X', 'Hold to guard', 'guard'], ['Y', 'Counter', 'counter'],
    ['LB / RB', 'Duck / Shove', 'other'], ['View / Menu', 'Rematch / Pause', 'other'],
  ] : [
    ['A D', 'Move', 'move'], ['W X S', 'High / Mid / Low', 'line'],
    ['J / LMB', 'Hold / release to strike', 'strike'], ['Space / RMB', 'Evade', 'evade'],
    ['K', 'Hold to guard', 'guard'], ['L', 'Counter', 'counter'],
    ['C / V', 'Duck / Shove', 'other'], ['Esc / R', 'Pause / Rematch', 'other'],
  ];
  return `<figure class="control-map">${gamepad ? controllerDrawing() : keyboardDrawing()}${legend(rows)}<figcaption>${gamepad ? 'Xbox button positions · PlayStation equivalents in full bindings.' : 'Colored keys are in use. Mouse height also sets your blade line.'}</figcaption></figure>`;
}
export function deviceIcon(type) {
  const body = type === 'gamepad'
    ? '<path d="M26 19q-12 0-16 13L4 51q-4 13 6 14 5 0 11-9l8-10h38l8 10q6 9 11 9 10-1 6-14l-6-19q-4-13-16-13z"/><path d="M25 27v16m-8-8h16"/><circle cx="65" cy="30" r="3"/><circle cx="74" cy="38" r="3"/>'
    : '<rect x="2" y="24" width="67" height="39" rx="3"/><path d="M10 34h50m-50 9h50m-42 10h29M16 30v17m12-17v17m12-17v17m12-17v17"/><rect x="77" y="22" width="17" height="39" rx="8"/><path d="M85 23v14m-7 0h15"/>';
  return `<svg viewBox="0 0 98 78" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">${body}</svg>`;
}
