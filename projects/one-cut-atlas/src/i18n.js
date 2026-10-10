import ui from './locales/ui.zh-CN.js';
import controls from './locales/controls.zh-CN.js';
import diagrams from './locales/diagrams.zh-CN.js';

export const LANGUAGE_KEY = 'one-cut-atlas:language:v1';
const chinese = Object.freeze({ ...ui, ...controls, ...diagrams });
const listeners = new Set();
export function normalizeLanguage(value) { return value === 'zh-CN' ? 'zh-CN' : 'en'; }
function savedLanguage() {
  try { return normalizeLanguage(globalThis.localStorage?.getItem(LANGUAGE_KEY)); }
  catch { return 'en'; }
}
let language = savedLanguage();
export const getLanguage = () => language;
export function t(source, params = {}) {
  const text = language === 'zh-CN' && Object.hasOwn(chinese, source) ? chinese[source] : String(source ?? '');
  return text.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(params, key) ? String(params[key]) : match);
}
export function onLanguageChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
export function setLanguage(value) {
  const next = normalizeLanguage(value);
  if (next === language) return;
  language = next;
  try { globalThis.localStorage?.setItem(LANGUAGE_KEY, language); } catch { /* Session-only preference still works. */ }
  for (const callback of listeners) callback(language);
}

/** Bind the original static text nodes once. No DOM observer or per-frame traversal.
 * Nested controls and listeners survive translation; newly rendered UI uses t(). */
export function bindStaticTranslations(root) {
  const doc = root.ownerDocument;
  const texts = [], attributes = [];
  const walker = doc.createTreeWalker(root, 4);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script,style,[data-no-translate]')) continue;
    const source = node.data.trim();
    if (!source || !Object.hasOwn(chinese, source)) continue;
    const leading = node.data.match(/^\s*/)[0], trailing = node.data.match(/\s*$/)[0];
    texts.push({node, source, leading, trailing});
  }
  for (const node of root.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) {
    if (node.closest('[data-no-translate]')) continue;
    for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
      const source = node.getAttribute(name);
      if (source && Object.hasOwn(chinese, source)) attributes.push({node, name, source});
    }
  }
  const render = () => {
    doc.documentElement.lang = language;
    for (const {node, source, leading, trailing} of texts) if (node.isConnected) node.data = leading + t(source) + trailing;
    for (const {node, name, source} of attributes) if (node.isConnected) node.setAttribute(name, t(source));
  };
  render();
  return onLanguageChange(render);
}

export function levelTitle(level) { return level?.isDemo ? t(level.name) : level?.name || ''; }
