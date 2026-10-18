import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [], failures = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().startsWith('http://127.0.0.1:4173')) failures.push(`${response.status()} ${response.url()}`); });
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied = text; } } });
});
await mkdir('qa/presentations', { recursive: true });
const visible = () => page.locator('.slide:not([hidden])');
const shot = async name => {
  await page.mouse.move(15, 15);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `qa/presentations/${name}.png` });
  assert.deepEqual(await visible().locator('img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).map(image => image.src)), []);
  const outside = await visible().evaluate(slide => [...slide.querySelectorAll('h1,h2,h3,p,figure,.demo-wrap,.comparison,.reflection')].filter(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && (bounds.top < 55 || bounds.bottom > innerHeight - 48 || bounds.right > innerWidth + 1);
  }).map(element => ({ element: element.tagName, text: element.textContent.slice(0, 55), rect: element.getBoundingClientRect().toJSON() })));
  assert.deepEqual(outside, [], `Overflow in ${name}`);
};
try {
  for (const [deck, total] of [['product', 7], ['process', 6]]) {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    const mainState = await page.evaluate(() => localStorage.getItem('food-reals-v3'));
    assert.ok(mainState);
    assert.equal(new Set(JSON.parse(mainState).meals.map(meal => meal.photo).filter(url => url?.startsWith('/assets/meals/'))).size, 11);
    await page.goto(`http://127.0.0.1:4173/slides/${deck}.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('mibly-test-marker', 'keep-me'));
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.timer').innerText(), '00:00');
    await shot(`${deck}-01`);
    await visible().locator('h1').click();
    await page.waitForTimeout(1250);
    assert.equal(await page.locator('.timer').innerText(), '00:01');
    assert.equal(await visible().getAttribute('id'), 'slide-1');
    checks.push(`${deck}: cover click starts elapsed timer without advancing`);
    await page.getByRole('button', { name: 'Pause timer', exact: true }).click();
    const paused = await page.locator('.timer').innerText();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('.timer').innerText(), paused);
    await page.getByRole('button', { name: 'Resume timer', exact: true }).click();
    for (let number = 2; number <= total; number++) {
      await page.getByRole('button', { name: 'Next slide', exact: true }).click();
      assert.equal(await visible().getAttribute('id'), `slide-${number}`);
      const iframe = visible().locator('iframe');
      if (await iframe.count()) {
        const app = visible().frameLocator('iframe');
        await app.locator('.food-app').waitFor();
        await page.waitForTimeout(700);
        assert.equal(await visible().locator('.demo-fallback').isVisible(), false);
        assert.deepEqual(await app.locator('img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).map(image => image.src)), []);
        for (const scene of await visible().locator('[data-feature]').all()) {
          const name = await scene.getAttribute('data-scene');
          await scene.click();
          await page.waitForTimeout(500);
          assert.equal(await scene.getAttribute('aria-pressed'), 'true', `${name} must be selected from phone state`);
          assert.equal(await visible().locator('[data-feature][aria-pressed="true"]').count(), 1);
          if (name === 'post') await app.getByText('One more plate at Kura', { exact: true }).waitFor();
          if (name === 'home-meal') {
            await app.getByText('A little bowl of egg soup', { exact: true }).waitFor();
            assert.equal(await app.getByRole('link', { name: 'Directions', exact: true }).count(), 0);
          }
          if (name === 'people') await app.getByLabel('Search people').waitFor();
          if (name === 'restaurant') {
            const maps = new URL(await app.getByRole('link', { name: 'Open Google Maps', exact: true }).getAttribute('href'));
            assert.match(maps.searchParams.get('query'), /Kura Revolving Sushi Bar 415 Cinema Dr/);
            await app.getByRole('button', { name: 'Copy address', exact: true }).click();
            const frame = await iframe.elementHandle().then(handle => handle.contentFrame());
            assert.equal(await frame.evaluate(() => window.__copied), '415 Cinema Dr, Pittsburgh, PA 15203');
          }
          if (name === 'extended') assert.equal(await app.locator('.world-pin').count(), 3);
          checks.push(`${deck} slide ${number}: interactive ${name} scene`);
        }
        await visible().locator('[data-feature="feed"]').click();
        for (const name of ['post', 'home-meal']) {
          await visible().locator(`[data-scene="${name}"]`).click();
          await page.waitForTimeout(200);
          await app.getByText(name === 'post' ? 'One more plate at Kura' : 'A little bowl of egg soup', { exact: true }).waitFor();
          assert.equal(await visible().locator('[data-feature="feed"]').getAttribute('aria-pressed'), 'true');
        }
        await visible().locator('[data-feature="people"]').click();
        await visible().locator('[data-scene="extended"]').click();
        await page.waitForTimeout(250);
        assert.equal(await app.locator('.world-pin').count(), 3);
        assert.equal(await visible().locator('[data-feature="people"]').getAttribute('aria-pressed'), 'true');
        const initialScene = new URL(await iframe.getAttribute('src')).searchParams.get('scene');
        await visible().locator(`[data-feature="${initialScene}"]`).click();
      }
      await shot(`${deck}-${String(number).padStart(2, '0')}`);
      await page.getByRole('button', { name: 'Notes', exact: true }).click();
      assert.equal(await page.getByRole('dialog').isVisible(), true);
      assert.ok((await page.locator('.notes-body').innerText()).length > 180);
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button', { name: 'Finish', exact: true }).click();
    const done = await page.locator('.timer').innerText();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.timer').innerText(), done);
    await page.getByRole('button', { name: 'Reset presentation', exact: true }).click();
    assert.equal(await page.locator('.timer').innerText(), '00:00');
    assert.equal(await visible().getAttribute('id'), 'slide-1');
    assert.equal(await page.evaluate(() => localStorage.getItem('mibly-test-marker')), 'keep-me');
    assert.equal(await page.evaluate(() => localStorage.getItem('food-reals-v3')), mainState, 'Rehearsing must preserve main-app state byte-for-byte');
    checks.push(`${deck}: pause/resume, notes, finish, reset and storage isolation`);
    await page.locator('.slide:not([hidden])').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await visible().getAttribute('id'), 'slide-1');
    await page.keyboard.press('ArrowRight');
    assert.equal(await visible().getAttribute('id'), 'slide-2');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await visible().getAttribute('id'), 'slide-1');
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => !!document.fullscreenElement), true);
    await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
    checks.push(`${deck}: keyboard controls and fullscreen`);
    await page.setViewportSize({ width: 1366, height: 768 });
    for (let number = 1; number <= total; number++) {
      if (number > 1) await page.getByRole('button', { name: 'Next slide', exact: true }).click();
      if (await visible().locator('iframe').count()) await visible().frameLocator('iframe').locator('.food-app').waitFor();
      await shot(`${deck}-compact-${String(number).padStart(2, '0')}`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    checks.push(`${deck}: every slide checked at 1440×900 and 1366×768`);
  }
  await page.clock.install();
  for (const [deck, minimum] of [['product', 180], ['process', 120]]) {
    await page.goto(`http://127.0.0.1:4173/slides/${deck}.html`, { waitUntil: 'networkidle' });
    await page.locator('[data-start]').click();
    await page.clock.fastForward((minimum + 1) * 1000);
    assert.equal(await page.locator('.timer-status').innerText(), 'In range');
    await page.clock.fastForward(61000);
    assert.equal(await page.locator('.timer-status').innerText(), 'Over target');
    await page.locator('[data-reset]').click();
    assert.equal(await page.locator('.timer').innerText(), '00:00');
    assert.equal(await page.locator('.toast').isVisible(), false);
    checks.push(`${deck}: target-range boundaries and clean reset`);
  }
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  await writeFile('qa/presentations/results.json', JSON.stringify({ checks, errors, failures }, null, 2));
  console.log(JSON.stringify({ checks, errors, failures }, null, 2));
} finally { await browser.close(); }
