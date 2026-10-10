// Exact UI diagrams drawn on a pixel grid. No images, shared IDs or SVG filters.
import { t } from './i18n.js';

const colors = { move: '#426977', line: '#926619', strike: '#3e744b', guard: '#38678e', evade: '#a04435', counter: '#987314', other: '#705878' };
const keyboardActions = { A: 'move', D: 'move', W: 'line', X: 'line', S: 'line', '1': 'line', '2': 'line', '3': 'line', J: 'strike', K: 'guard', L: 'counter', C: 'other', V: 'other', SPACE: 'evade' };
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const tr = (source, params) => escape(t(source, params));

function pixelKey(label, x, y, width = 26) {
  const action = keyboardActions[label];
  const fill = colors[action] || '#ded3b9';
  return `<g class="diagram-key"><rect x="${x}" y="${y + 3}" width="${width}" height="23" fill="#7a705b"/><path d="M${x} ${y + 3}h3v-3h${width - 6}v3h3v17h-3v3h-${width - 6}v-3h-3z" fill="${fill}" stroke="#463d2d" stroke-width="1"/><path d="M${x + 4} ${y + 4}h${width - 8}" stroke="${action ? '#ffffff55' : '#faf2de'}" stroke-width="2"/><text x="${x + width / 2}" y="${y + 17}" text-anchor="middle" fill="${action ? '#fff8e3' : '#4b4233'}" font-size="${label.length > 2 ? 12 : 18}">${tr(label)}</text></g>`;
}

function callout(x, y, width, label, shortcut, action) {
  const height = shortcut ? 45 : 29;
  return `<g class="diagram-callout"><path d="M${x + 4} ${y}h${width - 8}v4h4v${height - 8}h-4v4h-${width - 8}v-4h-4V${y + 4}h4z" fill="#f9efd7" stroke="${colors[action]}" stroke-width="2"/><rect x="${x}" y="${y + 6}" width="4" height="${height - 12}" fill="${colors[action]}"/><text x="${x + width / 2}" y="${y + 20}" text-anchor="middle" fill="${colors[action]}">${tr(label)}</text>${shortcut ? `<text class="diagram-shortcut" x="${x + width / 2}" y="${y + 37}" text-anchor="middle" fill="#4a4131">${tr(shortcut)}</text>` : ''}</g>`;
}

function leader(path, x, y, action) {
  return `<g class="diagram-leader" fill="none" stroke-linecap="square" stroke-linejoin="miter"><path d="${path}" stroke="#f9efd7" stroke-width="6"/><path d="${path}" stroke="${colors[action]}" stroke-width="2"/><rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${colors[action]}" stroke="#f9efd7" stroke-width="1"/></g>`;
}

function keyboardDrawing() {
  let keys = '';
  for (const [row, x, y] of [['1234567890', 34, 103], ['QWERTYUIOP', 34, 136], ['ASDFGHJKL', 48, 169], ['ZXCVBNM', 63, 202]]) {
    keys += [...row].map((label, index) => pixelKey(label, x + index * 30, y)).join('');
  }
  keys += pixelKey('Esc', 34, 70, 36) + pixelKey('F1', 96, 70) + pixelKey('F2', 126, 70) + pixelKey('F3', 156, 70) + pixelKey('SPACE', 110, 235, 150);
  const description = 'Pixel keyboard diagram. Callout lines point to A and D for movement; W, X and S for high, mid and low blade lines; J for strike, K for guard, L for counter, C for duck, V for shove and Space for evade.';
  return `<svg class="control-drawing control-drawing--keyboard" viewBox="0 0 400 396" role="img" aria-label="${tr(description)}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <title>${tr('Keyboard controls')}</title>
    <path d="M24 66h352v6h8v198h-8v8H24v-8h-8V72h8z" fill="#7c715a"/>
    <path d="M24 63h352v6h8v198h-8v5H24v-5h-8V69h8z" fill="#b6a789" stroke="#443a29" stroke-width="2"/>
    <path d="M26 69h347v192H26z" fill="#c9bda0"/>
    <g class="diagram-key-type">${keys}</g>
    ${leader('M47 48V71H8V181H48', 48, 181, 'move')}
    ${leader('M181 48V62H22V131H77V136', 77, 136, 'line')}
    ${leader('M340 48V67H391V164H241V169', 241, 169, 'strike')}
    ${leader('M123 225V231H88V301H48V312', 123, 225, 'other')}
    ${leader('M153 225V231H267V358H177V363', 153, 225, 'other')}
    ${leader('M185 258V283', 185, 258, 'evade')}
    ${leader('M271 192V296H334V312', 271, 192, 'guard')}
    ${leader('M314 181H397V359H338V363', 314, 181, 'counter')}
    ${callout(3, 3, 88, 'Move', 'A / D', 'move')}
    ${callout(112, 3, 138, 'Blade line', 'W / X / S', 'line')}
    ${callout(288, 3, 104, 'Strike', 'J', 'strike')}
    ${callout(3, 312, 92, 'Duck', 'C', 'other')}
    ${callout(121, 283, 127, 'Evade', 'Space', 'evade')}
    ${callout(286, 312, 106, 'Guard', 'K', 'guard')}
    ${callout(127, 363, 100, 'Shove', '', 'other')}
    <text class="diagram-shortcut" x="237" y="384" fill="#705878">${tr('V')}</text>
    ${callout(283, 363, 109, 'Counter', '', 'counter')}
    <text class="diagram-shortcut" x="273" y="384" text-anchor="end" fill="#987314">${tr('L')}</text>
  </svg>`;
}

function mouseDrawing() {
  const description = 'Pixel mouse diagram. The left mouse button charges and strikes; the right button evades. Moving the pointer high, mid or low over the arena sets the blade line.';
  return `<svg class="control-drawing control-drawing--mouse" viewBox="0 0 400 190" role="img" aria-label="${tr(description)}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <title>${tr('Mouse controls')}</title>
    <path d="M194 2v10h-8v10h8v14" fill="none" stroke="#65543c" stroke-width="4"/>
    <path d="M164 35h51v7h10v12h7v91h-7v13h-10v8h-51v-8h-10v-13h-7V54h7V42h10z" fill="#b7a789" stroke="#403827" stroke-width="3"/>
    <path d="M163 43h24v51h-32V56h8z" fill="${colors.strike}"/>
    <path d="M194 43h21v13h9v38h-30z" fill="${colors.evade}"/>
    <path d="M190 38v58m-39 2h77" fill="none" stroke="#403827" stroke-width="3"/>
    <rect x="185" y="56" width="11" height="25" fill="#393325" stroke="#dfd0ae" stroke-width="2"/>
    <path d="M185 118v26m-8-18h16m-8-8-5 5m5-5 5 5m-5 21-5-5m5 5 5-5" fill="none" stroke="${colors.line}" stroke-width="3"/>
    ${leader('M108 49H135V64H162', 162, 64, 'strike')}
    ${leader('M291 49H247V64H215', 215, 64, 'evade')}
    ${leader('M261 143H231V133H213', 213, 133, 'line')}
    ${callout(3, 27, 105, 'Strike', 'Left click', 'strike')}
    ${callout(291, 27, 106, 'Evade', 'Right click', 'evade')}
    ${callout(261, 120, 135, 'Blade line', 'Mouse height', 'line')}
    <text class="diagram-label" x="190" y="187" text-anchor="middle">${tr('MOUSE')}</text>
  </svg>`;
}

function pixelDisc(x, y, radius, fill, stroke = '#3f392c') {
  const inner = Math.round(radius * .55);
  return `<path d="M${x - inner} ${y - radius}h${inner * 2}v${radius - inner}h${radius - inner}v${inner * 2}h-${radius - inner}v${radius - inner}h-${inner * 2}v-${radius - inner}h-${radius - inner}v-${inner * 2}h${radius - inner}z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
}

function controllerDrawing() {
  const face = (label, x, y, action) => `${pixelDisc(x, y, 15, colors[action])}<text class="diagram-pad-letter" x="${x}" y="${y + 6}" text-anchor="middle">${tr(label)}</text>`;
  const description = 'Pixel Xbox controller diagram. Callout lines point to the left stick for movement, D-pad for blade line, A for strike, B for evade, X for guard, Y for counter, LB for duck and RB for shove. The small View and Menu buttons rematch and pause.';
  return `<svg class="control-drawing control-drawing--gamepad" viewBox="0 0 400 402" role="img" aria-label="${tr(description)}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <title>${tr('Xbox controller controls')}</title>
    <path d="M83 94h73v-8h-8v-5H91v5h-8zm161 0h73v-8h-8v-5h-57v5h-8z" fill="${colors.other}" stroke="#403827" stroke-width="2"/>
    <path d="M88 98h67v8h88v-8h67v8h16v16h8v30h8v34h8v38h8v49h-8v33h-9v15h-18v-6h-11v-16h-12v-19h-13v-20H112v20H99v19H87v16H76v6H58v-15h-9v-33h-8v-49h8v-38h8v-34h8v-30h8v-16h15z" fill="#6f654f"/>
    <path d="M88 93h67v8h88v-8h67v8h16v16h8v30h8v34h8v38h8v49h-8v33h-9v15h-18v-6h-11v-16h-12v-19h-13v-20H112v20H99v19H87v16H76v6H58v-15h-9v-33h-8v-49h8v-38h8v-34h8v-30h8v-16h15z" fill="#c3b596" stroke="#403827" stroke-width="3"/>
    <path d="M87 107h65v8h96v-8h59v8h12v20h-8v-10h-66v-5h-92v-5H89z" fill="#e9dcb9"/>
    <path d="M67 226v49h8v16m247-65v49h-8v16" stroke="#9f8e6f" stroke-width="8" fill="none"/>
    ${pixelDisc(116, 166, 29, colors.move)}${pixelDisc(116, 166, 19, '#304d55', '#8caaa9')}
    <path d="m101 166 5-5v10zm30 0-5-5v10z" fill="#f9efd7"/>
    ${pixelDisc(252, 243, 23, '#a99b7e')}${pixelDisc(252, 243, 14, '#766b55', '#95886c')}
    <path d="M157 212h22v19h19v22h-19v19h-22v-19h-19v-22h19z" fill="${colors.line}" stroke="#51432d" stroke-width="2"/>
    <path d="m168 217-5 6h10zm0 50-5-6h10zm-25-25 6-5v10zm50 0-6-5v10z" fill="#fff3cf"/>
    <g class="diagram-key-type">${face('Y', 270, 139, 'counter')}${face('X', 240, 169, 'guard')}${face('B', 300, 169, 'evade')}${face('A', 270, 199, 'strike')}</g>
    ${pixelDisc(183, 161, 11, '#e5d8b7')}${pixelDisc(215, 161, 11, '#e5d8b7')}
    <g fill="none" stroke="#4c422f" stroke-width="2"><path d="M178 156h7v7h-7zm4 4h7v7h-7m28-4h11m-11-5h11m-11 10h11"/></g>
    <path d="M194 119h11v11h-11z" fill="#756950"/>
    ${leader('M100 49V64H118V82', 118, 82, 'other')}
    ${leader('M297 49V63H281V82', 281, 82, 'other')}
    ${leader('M75 166H87', 87, 166, 'move')}
    ${leader('M204 77V123H240V154', 240, 154, 'guard')}
    ${leader('M349 108V118H270V124', 270, 124, 'counter')}
    ${leader('M323 169H315', 315, 169, 'evade')}
    ${leader('M304 232H270V214', 270, 214, 'strike')}
    ${leader('M79 333V321H168V272', 168, 272, 'line')}
    ${callout(43, 4, 114, 'Duck', 'LB', 'other')}
    ${callout(239, 4, 115, 'Shove', 'RB', 'other')}
    ${callout(2, 144, 73, 'Move', 'LS ↔', 'move')}
    ${callout(165, 48, 80, 'Guard', '', 'guard')}
    ${callout(302, 78, 96, 'Counter', '', 'counter')}
    ${callout(323, 154, 75, 'Evade', '', 'evade')}
    ${callout(304, 217, 94, 'Strike', '', 'strike')}
    ${callout(12, 333, 136, 'Blade line', 'D-pad', 'line')}
    <g class="diagram-pad-meta" fill="#4b402e"><text x="246" y="350" text-anchor="middle">${tr('View = Rematch')}</text><text x="246" y="374" text-anchor="middle">${tr('Menu = Pause')}</text></g>
    <text class="diagram-line-guide" x="200" y="399" text-anchor="middle">${tr('↑ High · ← → Mid · ↓ Low')}</text>
  </svg>`;
}

function keyboardMeta() {
  return `<div class="diagram-keyboard-meta"><span><kbd>${tr('Esc')}</kbd> ${tr('Pause')}</span><span><kbd>${tr('R')}</kbd> ${tr('Rematch')}</span><span><kbd>${tr('M')}</kbd> ${tr('Sound')}</span></div>`;
}

/** Returns only trusted, authored markup; translated strings are escaped. */
export function controlDiagram(type) {
  const gamepad = type === 'gamepad';
  const note = gamepad ? 'Hold A to charge, release to strike. Hold X to guard.' : 'Hold J or left click to charge, release to strike. Hold K to guard.';
  const line = gamepad ? 'Xbox button positions. PlayStation equivalents are in Full bindings.' : 'W = High · X = Mid · S = Low. Mouse height also sets your blade line.';
  return `<figure class="control-map control-map--${gamepad ? 'gamepad' : 'keyboard'}">${gamepad ? controllerDrawing() : keyboardDrawing() + keyboardMeta() + mouseDrawing()}<figcaption><span>${tr(note)}</span><span>${tr(line)}</span></figcaption></figure>`;
}

/** Small pixel silhouettes for the device selector; text is supplied by its button. */
export function deviceIcon(type) {
  const body = type === 'gamepad'
    ? '<path d="M20 18h20v4h18v-4h20v4h7v8h4v12h4v15h-4v7h-9v-5h-6v-8h-9v-7H33v7h-9v8h-6v5H9v-7H5V42h4V30h4v-8h7z"/><path d="M27 29v14m-7-7h14m5 5v13m-6-7h12"/><path d="M69 27h5v5h-5zm9 9h5v5h-5zm-18 0h5v5h-5zm9 9h5v5h-5z" fill="currentColor" stroke="none"/>'
    : '<path d="M4 24h63v4h4v33h-4v4H4v-4H1V28h3zm77-3h10v5h5v30h-5v5H81v-5h-5V26h5z"/><path d="M9 34h50m-50 9h50m-39 10h29M15 29v18m12-18v18m12-18v18m12-18v18m35-26v14m-9 0h18"/>';
  return `<svg class="device-pixel-icon" viewBox="0 0 98 78" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="miter" shape-rendering="crispEdges">${body}</svg>`;
}
