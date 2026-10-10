import test from 'node:test';
import assert from 'node:assert/strict';
import { controlDiagram, deviceIcon } from '../src/control-diagrams.js';
import { getLanguage, setLanguage } from '../src/i18n.js';

test('control diagrams use pixel geometry and direct target callouts', () => {
  for (const [type, expected] of [['keyboard', 11], ['gamepad', 8]]) {
    const markup = controlDiagram(type);
    assert.equal((markup.match(/class="diagram-callout"/g) || []).length, expected);
    assert.equal((markup.match(/class="diagram-leader"/g) || []).length, expected);
    assert.match(markup, /role="img" aria-label="[^"]+"/);
    assert.doesNotMatch(markup, /<circle|\brx=|\bid=/);
    for (const [, path] of markup.matchAll(/\sd="([^"]*)"/g)) {
      assert.doesNotMatch(path, /[acqst]/i, 'No curves or arcs in pixel outlines');
    }
  }
});

test('pixel device icons are reusable and do not add competing accessible labels', () => {
  for (const type of ['keyboard', 'gamepad']) {
    const markup = deviceIcon(type);
    assert.match(markup, /aria-hidden="true"/);
    assert.match(markup, /shape-rendering="crispEdges"/);
    assert.doesNotMatch(markup, /\bid=|<circle|\brx=|<text/);
  }
});

test('all diagram action labels and accessible descriptions switch with language', () => {
  const before = getLanguage();
  try {
    setLanguage('en');
    const english = controlDiagram('gamepad');
    assert.match(english, />Strike<|>Strike<\//);
    assert.match(english, /Pixel Xbox controller diagram/);
    setLanguage('zh-CN');
    const chinesePad = controlDiagram('gamepad');
    const chineseKeyboard = controlDiagram('keyboard');
    assert.match(chinesePad, />攻击</);
    assert.match(chinesePad, /像素 Xbox 手柄图/);
    assert.match(chineseKeyboard, />鼠标</);
    assert.match(chineseKeyboard, /像素键盘图/);
    assert.doesNotMatch(chinesePad, />Move<|>Strike<|>Guard<|>Counter<|>Duck<|>Shove</);
    // Physical button letters stay unchanged when action text is translated.
    for (const letter of ['A', 'B', 'X', 'Y']) assert.ok(chinesePad.includes(`>${letter}</text>`));
  } finally {
    setLanguage(before);
  }
});
