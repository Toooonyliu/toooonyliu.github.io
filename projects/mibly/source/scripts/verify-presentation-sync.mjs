import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// An isolated browser context: never attach to the designer's personal Chrome.
const origin = process.env.DEMO_ORIGIN || 'http://127.0.0.1:4173';
const output = 'qa/presentation-sync';
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [], failedResources = [], checks = [];
const features = ['map', 'feed', 'people', 'restaurant', 'capture', 'chat', 'memories', 'profile'];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.status() >= 400 && response.url().startsWith(origin)) failedResources.push(`${response.status()} ${response.url()}`);
});
await mkdir(output, { recursive: true });

const visible = () => page.locator('.slide:not([hidden])');
const phone = () => visible().frameLocator('iframe');
const waitFor = async (check, message) => {
  const deadline = Date.now() + 6000;
  let latest;
  do {
    try { await check(); return; } catch (error) { latest = error; }
    await page.waitForTimeout(60);
  } while (Date.now() < deadline);
  throw new Error(`${message}: ${latest?.message || 'condition timed out'}`);
};
const selected = async (feature, screenPattern, slide = visible()) => {
  await waitFor(async () => {
    const active = slide.locator('.feature-nav [data-feature][aria-pressed="true"]');
    assert.equal(await active.count(), 1, 'Exactly one feature must be selected');
    assert.equal(await active.getAttribute('data-feature'), feature);
    assert.equal(await slide.locator('.feature-nav [data-feature].active').count(), 1);
    assert.match(await active.getAttribute('class'), /\bactive\b/);
    if (screenPattern) assert.match(await slide.locator('[data-current-screen]').innerText(), screenPattern);
  }, `Expected selected feature ${feature}`);
};
const choose = async feature => {
  await visible().locator(`.feature-nav [data-feature="${feature}"]`).click();
  await selected(feature);
};
const closeSheet = async () => {
  await phone().getByRole('button', { name: 'Close', exact: true }).click();
};
const nativeNav = async (name, feature) => {
  await phone().getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: true }).click();
  await selected(feature);
};
const actualScene = async feature => {
  const app = phone();
  const sceneSelectors = {
    map: '.world-map', feed: '.feed', people: '.people-center', restaurant: '.venue-detail',
    capture: '.composer', chat: '.social-chat', memories: '.social-memories', profile: '.social-profile',
  };
  if (feature === 'map') {
    assert.ok(await app.locator('.world-pin').count() > 0);
    assert.equal(await app.getByRole('button', { name: 'Map', exact: true }).getAttribute('aria-pressed'), 'true');
  } else if (feature === 'people') {
    await app.getByLabel('Search people', { exact: true }).waitFor();
  } else {
    await app.locator(sceneSelectors[feature]).waitFor({ state: 'visible' });
  }
};
const shot = async name => {
  await page.mouse.move(12, 12);
  await page.waitForTimeout(250); // Let the previous feature's short color transition finish.
  await page.screenshot({ path: `${output}/${name}.png` });
};
const sceneCommand = async scene => {
  await visible().locator('iframe').evaluate((iframe, value) => {
    iframe.contentWindow.postMessage({ type: 'mibly-demo', scene: value }, location.origin);
  }, scene);
};

try {
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  const storedBefore = await page.evaluate(() => localStorage.getItem('food-reals-v3'));
  assert.ok(storedBefore, 'Main app must have an existing demo state');
  await page.evaluate(() => localStorage.setItem('mibly-sync-test-marker', 'untouched'));
  await page.goto(`${origin}/slides/product.html#4`, { waitUntil: 'networkidle' });
  await phone().locator('.food-app').waitFor();
  await selected('map');
  assert.deepEqual(await visible().locator('.feature-nav [data-feature]').evaluateAll(items => items.map(item => item.dataset.feature)), features);

  for (const feature of features) {
    await choose(feature);
    await actualScene(feature);
  }
  checks.push('All eight left-hand feature labels open their corresponding actual phone screens');

  await choose('map');
  await phone().getByRole('button', { name: 'Feed', exact: true }).click();
  await selected('feed', /feed/i);
  await phone().getByRole('button', { name: /^View meal:/ }).first().click();
  await selected('feed', /meal details/i);
  await phone().getByRole('button', { name: 'Looks good', exact: true }).click();
  await closeSheet();
  await selected('feed', /feed/i);
  await phone().getByRole('button', { name: 'Map', exact: true }).click();
  await selected('map');
  await phone().getByRole('button', { name: 'Add friends', exact: true }).click();
  await selected('people', /people/i);
  await closeSheet();
  await selected('map');
  checks.push('Phone Map/Feed navigation, meal details, reactions, People and sheet dismissal keep labels synchronized');

  await phone().getByRole('button', { name: 'Choose people to see', exact: true }).click();
  await selected('people', /circle/i);
  await phone().getByRole('button', { name: /Friends of friends.*Opt-in/ }).click();
  await selected('people', /Friends of friends.*Map/i);
  await phone().getByRole('button', { name: 'Feed', exact: true }).click();
  await selected('people', /Friends of friends.*Feed/i);
  await choose('map');
  await actualScene('map');
  checks.push('Friends-of-friends scope stays in People & discovery in both map and feed');

  await sceneCommand('post');
  await selected('feed', /meal details/i);
  await phone().locator('button.venue-line').click();
  await selected('restaurant', /restaurant/i);
  await phone().getByRole('link', { name: 'Open Google Maps', exact: true }).waitFor();
  await closeSheet();
  await selected('map');
  await sceneCommand('home-meal');
  await selected('feed');
  assert.equal(await phone().getByRole('link', { name: 'Directions', exact: true }).count(), 0);
  await closeSheet();
  await selected('map');
  checks.push('Legacy post/home scenes synchronize correctly; restaurant details activate Places without adding home directions');

  await nativeNav('Chat', 'chat');
  await phone().locator('.chat-person').first().click();
  await selected('chat', /meal conversation/i);
  await closeSheet();
  await selected('chat');
  await nativeNav('Capture a meal', 'capture');
  await closeSheet();
  await selected('chat');
  await nativeNav('Memories', 'memories');
  await phone().getByRole('button', { name: 'Calendar', exact: true }).click();
  await selected('memories', /calendar/i);
  await shot('calendar-sync');
  await phone().getByRole('button', { name: 'Moments', exact: true }).click();
  await phone().locator('.moment-tile').first().click();
  await selected('memories', /meal memory/i);
  await closeSheet();
  await selected('memories');
  await nativeNav('Profile', 'profile');
  await phone().getByRole('button', { name: 'Settings', exact: true }).click();
  await selected('profile', /settings/i);
  await closeSheet();
  await selected('profile');
  await phone().locator('.profile-today-card').first().click();
  await selected('profile', /your meal/i);
  await closeSheet();
  await phone().getByRole('button', { name: /Saved places.*For your next/ }).click();
  await selected('restaurant', /saved places/i);
  await nativeNav('Profile', 'profile');
  await phone().getByRole('button', { name: /Help me pick a place/ }).click();
  await selected('restaurant', /pick a restaurant/i);
  checks.push('Native bottom navigation, contextual meal sheets, Calendar, Settings, Saved places and restaurant picker report their correct category');

  await choose('memories');
  await phone().getByRole('button', { name: 'Calendar', exact: true }).click();
  await selected('memories', /calendar/i);
  await page.getByRole('button', { name: 'Next slide', exact: true }).click();
  await phone().locator('.food-app').waitFor();
  await selected('restaurant');
  await choose('chat');
  await page.getByRole('button', { name: 'Previous slide', exact: true }).click();
  await selected('memories', /calendar/i);
  await phone().locator('.social-calendar').waitFor();
  await page.getByRole('button', { name: 'Next slide', exact: true }).click();
  await selected('chat');
  await actualScene('chat');
  await shot('slide-five-chat-sync');
  checks.push('Two product-demo slides retain independent phone state and highlights when revisited');

  const currentReport = await page.evaluate(() => new Promise((resolve, reject) => {
    const iframe = document.querySelector('.slide:not([hidden]) iframe');
    const session = new URL(iframe.src).searchParams.get('presentationSession');
    const timeout = setTimeout(() => { window.removeEventListener('message', receive); reject(new Error('State request was not answered')); }, 2000);
    function receive(event) {
      if (event.source !== iframe.contentWindow || event.origin !== location.origin || event.data?.type !== 'mibly-demo-state' || event.data.session !== session) return;
      clearTimeout(timeout); window.removeEventListener('message', receive); resolve(event.data);
    }
    window.addEventListener('message', receive);
    iframe.contentWindow.postMessage({ type: 'mibly-demo-state-request' }, location.origin);
  }));
  assert.equal(currentReport.feature, 'chat');
  assert.match(currentReport.screen, /meal conversations/i);
  assert.equal(currentReport.version, 1);

  await page.evaluate(() => {
    const frame = document.querySelector('.slide:not([hidden]) iframe');
    const session = new URL(frame.src).searchParams.get('presentationSession');
    const payload = { type: 'mibly-demo-state', version: 1, session, feature: 'profile', screen: 'FORGED' };
    window.dispatchEvent(new MessageEvent('message', { data: payload, origin: 'https://untrusted.invalid', source: frame.contentWindow }));
    window.dispatchEvent(new MessageEvent('message', { data: payload, origin: location.origin, source: window }));
    window.dispatchEvent(new MessageEvent('message', { data: { ...payload, feature: 'unrecognized' }, origin: location.origin, source: frame.contentWindow }));
    window.dispatchEvent(new MessageEvent('message', { data: { ...payload, version: 2 }, origin: location.origin, source: frame.contentWindow }));
    window.dispatchEvent(new MessageEvent('message', { data: { ...payload, session: 'expired-session' }, origin: location.origin, source: frame.contentWindow }));
  });
  await page.waitForTimeout(160);
  await selected('chat');
  assert.doesNotMatch(await visible().locator('[data-current-screen]').innerText(), /FORGED/);
  const frame = await visible().locator('iframe').elementHandle().then(handle => handle.contentFrame());
  await frame.evaluate(() => {
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'mibly-demo', scene: 'profile' }, origin: location.origin, source: window }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'mibly-demo', scene: 'profile' }, origin: 'https://untrusted.invalid', source: parent }));
  });
  await page.waitForTimeout(160);
  await actualScene('chat');
  await selected('chat');
  checks.push('Valid requests return actual state; wrong-origin, wrong-source, unknown-feature, wrong-version and expired-session messages are rejected');

  await page.getByRole('button', { name: 'Reset presentation', exact: true }).click();
  assert.equal(await visible().getAttribute('id'), 'slide-1');
  assert.equal(await page.locator('.timer').innerText(), '00:00');
  for (let index = 0; index < 3; index++) await page.getByRole('button', { name: 'Next slide', exact: true }).click();
  await phone().locator('.food-app').waitFor();
  await selected('map');
  await actualScene('map');
  assert.equal(await page.evaluate(() => localStorage.getItem('food-reals-v3')), storedBefore);
  assert.equal(await page.evaluate(() => localStorage.getItem('mibly-sync-test-marker')), 'untouched');
  checks.push('Reset clears temporary presentation navigation while preserving main-app storage byte-for-byte');

  // Hold the embedded document, then click several features before its listener exists.
  let releaseFrame;
  const delayedFrame = new Promise(resolve => { releaseFrame = resolve; });
  await page.route(url => url.searchParams.get('presentation') === '1', async route => {
    await delayedFrame;
    await route.continue();
  });
  await page.goto(`${origin}/slides/product.html?sync-race=1#4`, { waitUntil: 'domcontentloaded' });
  await visible().locator('.feature-nav').waitFor();
  for (const feature of ['people', 'memories', 'chat']) {
    await visible().locator(`[data-feature="${feature}"]`).click();
  }
  releaseFrame();
  await phone().locator('.food-app').waitFor();
  await selected('chat');
  await actualScene('chat');
  await page.unrouteAll({ behavior: 'wait' });
  checks.push('Rapid feature selection before iframe readiness replays the latest command, not the default scene');

  await page.goto(`${origin}/slides/process.html#5`, { waitUntil: 'networkidle' });
  await phone().locator('.food-app').waitFor();
  await selected('people');
  await choose('map');
  await phone().getByRole('button', { name: 'Feed', exact: true }).click();
  await selected('feed');
  await choose('memories');
  await phone().getByRole('button', { name: 'Calendar', exact: true }).click();
  await selected('memories', /calendar/i);
  await shot('process-calendar-sync');
  checks.push('The process deck uses the same bidirectional feature navigation contract');

  assert.deepEqual(errors, []);
  assert.deepEqual(failedResources, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ checks, errors, failedResources }, null, 2));
  console.log(JSON.stringify({ checks, errors, failedResources }, null, 2));
} catch (error) {
  await shot('failure').catch(() => {});
  await writeFile(`${output}/failure.json`, JSON.stringify({ message: error.message, stack: error.stack, checks, errors, failedResources }, null, 2));
  throw error;
} finally {
  await browser.close();
}
