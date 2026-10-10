import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeLanguage, getLanguage, setLanguage, onLanguageChange, t, levelTitle, LANGUAGE_KEY } from '../src/i18n.js';
import ui from '../src/locales/ui.zh-CN.js';
import controls from '../src/locales/controls.zh-CN.js';
import diagrams from '../src/locales/diagrams.zh-CN.js';
import { TRAVEL_ZONES } from '../src/region-presets.js';

test('language normalization, fallback and named interpolation', () => {
  setLanguage('en');
  assert.equal(normalizeLanguage('zh-CN'), 'zh-CN');
  assert.equal(normalizeLanguage('unsupported'), 'en');
  assert.equal(t('Fight'), 'Fight');
  assert.equal(t('PAD {number}', {number: 3}), 'PAD 3');
  setLanguage('zh-CN');
  assert.equal(getLanguage(), 'zh-CN');
  assert.equal(t('Fight'), '开始对战');
  assert.equal(t('{count} / {total} stamps', {count: 3, total: 11}), '3 / 11 枚印章');
  assert.equal(t('An unknown server message'), 'An unknown server message');
  setLanguage('en');
});

test('language preference persists separately, notifies once and survives blocked storage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const writes=[]; let calls=0;
  Object.defineProperty(globalThis, 'localStorage', {configurable:true,value:{setItem:(...args)=>writes.push(args)}});
  const unsubscribe=onLanguageChange(()=>calls++);
  try {
    setLanguage('zh-CN');setLanguage('zh-CN');
    assert.deepEqual(writes, [[LANGUAGE_KEY,'zh-CN']]);
    assert.equal(calls,1);
    unsubscribe();
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Access denied');}});
    assert.doesNotThrow(()=>setLanguage('en'));
    assert.equal(getLanguage(),'en');assert.equal(calls,1);
  } finally {
    unsubscribe();
    if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;
    setLanguage('en');
  }
});

test('built-in titles translate, including all travel regions; user names remain byte-for-byte', () => {
  setLanguage('zh-CN');
  for(const zone of TRAVEL_ZONES){assert.notEqual(t(zone.label),zone.label);assert.notEqual(levelTitle({name:zone.stage,isDemo:true}),zone.stage);}
  assert.equal(levelTitle({name:'Kyoto Rain',isDemo:false}),'Kyoto Rain');
  assert.equal(levelTitle({name:'Fight',isDemo:false}),'Fight');
  assert.equal(levelTitle({name:'我的剑客 <script>',isDemo:false}),'我的剑客 <script>');
  setLanguage('en');
  assert.equal(levelTitle({name:'Kyoto Rain',isDemo:true}),'Kyoto Rain');
});

test('Chinese dictionaries retain named placeholder contracts', () => {
  const slots=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
  for(const dictionary of [ui,controls,diagrams])for(const [key,value] of Object.entries(dictionary)){
    assert.equal(typeof value,'string');assert.ok(value.trim(),key);
    assert.deepEqual(slots(value),slots(key),key);
  }
});

test('duplicate navigation removed while the original photo upload remains', async () => {
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/id="(?:nav-help|help-dialog|help-play|help-close)"/);
  assert.doesNotMatch(html,/<label class="menu-item" for="gate-input"/);
  assert.match(html,/id="photo-gate"[^>]+for="gate-input"/);
  assert.match(html,/id="gate-input" type="file"/);
  assert.match(html,/data-language="en"/);assert.match(html,/data-language="zh-CN"/);
});
