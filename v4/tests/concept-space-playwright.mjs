// Run against npm run preview. Set CHROME_PATH for an installed Chromium.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.SITE_URL || 'http://127.0.0.1:4177/';
const url = new URL('learning/space/', base).href;
const shots = process.env.SHOTS_DIR || 'test-results/concept-space';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
await mkdir(shots, { recursive: true });

function watch(page) {
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('request', (request) => requests.push(request.url()));
  return { errors, requests };
}

const ready = (page) => page.waitForFunction(() => Boolean(window.__conceptSpace?.layout));
const note = (page) => page.locator('#cs-map-note').innerText();

async function find(page, query) {
  const search = page.getByRole('combobox', { name: 'Find a concept' });
  await search.fill(query);
  assert.equal(await search.getAttribute('aria-expanded'), 'true');
  assert.match(await search.getAttribute('aria-activedescendant'), /cs-opt-/);
  await search.press('Enter');
  return page.locator('#cs-detail');
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const log = watch(desktop);
  await desktop.clock.setFixedTime(new Date(2026, 10, 8, 12));
  const desktopStart = Date.now();
  await desktop.goto(new URL('learning/', base).href);
  await desktop.waitForURL(url);
  await ready(desktop);
  const desktopReadyMs = Date.now() - desktopStart;
  assert.ok(await desktop.locator('#cs-canvas').evaluate((el) => Boolean(el.getContext('webgl2'))));
  assert.match(await note(desktop), /353 concepts · 35 cross-course links/);
  assert.equal(await desktop.locator('#cs-timeline .cs-course-card').count(), 4);
  assert.match(
    await desktop.locator('[data-course="stats310a"] summary').innerText(),
    /6\/9 blocks/,
  );
  assert.match(
    await desktop.locator('[data-course="math116"] summary').innerText(),
    /dates unavailable/,
  );
  await desktop.screenshot({ path: `${shots}/desktop-global.png` });

  await desktop.locator('#cs-list-toggle').click();
  assert.equal(await desktop.locator('#cs-list li').count(), 353);
  await desktop.keyboard.press('Escape');
  assert.ok(await desktop.locator('#cs-list').isHidden());

  await desktop.locator('label:has([name="course"][value="math116"])').click();
  assert.match(await note(desktop), /MATH 116.*from other courses/);
  assert.equal(await desktop.locator('.cs-course-card').count(), 1);
  const detail = await find(desktop, 'fourier transform');
  assert.match(await detail.innerText(), /Fourier transform/);
  assert.match(await detail.innerText(), /Shared concept/);
  const bridge = detail
    .locator('.cs-relation')
    .filter({ hasText: /Characteristic function/ })
    .first();
  assert.match(await bridge.innerText(), /Cross-course · STATS 310A/);
  await bridge.locator('summary').click();
  assert.match(await bridge.innerText(), /Review consulted/);
  assert.match(await desktop.url(), /c=fourier_transform/);
  assert.match(await note(desktop), /Local view.*cross-course/);
  await desktop.waitForTimeout(850);
  await desktop.screenshot({ path: `${shots}/desktop-bridge.png` });
  assert.ok(await detail.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
  await detail.evaluate((el) => {
    el.scrollTop = 0;
  });
  await desktop.screenshot({ path: `${shots}/desktop-focus.png` });
  await desktop.getByRole('button', { name: 'Global' }).click();

  await desktop.locator('label:has([name="course"][value="stats310a"])').click();
  await desktop.locator('#cs-cutoff').fill('2026-10-07');
  assert.match(
    await desktop.locator('[data-course="stats310a"] summary').innerText(),
    /2\/9 blocks/,
  );
  await desktop.locator('#cs-scheduled').check();
  await desktop.selectOption('#cs-color', 'schedule');
  assert.match(await desktop.locator('#cs-legend').innerText(), /Scheduled by date/);
  await desktop.locator('#cs-overview').scrollIntoViewIfNeeded();
  await desktop.screenshot({ path: `${shots}/desktop-timeline.png` });
  await desktop.locator('#cs-scheduled').uncheck();

  await desktop.locator('#cs-advanced > summary').click();
  await desktop.getByRole('radio', { name: 'PCA', exact: true }).click();
  await desktop.waitForFunction(() =>
    /projection axes/.test(document.querySelector('#cs-axes').textContent),
  );
  assert.match(await desktop.locator('#cs-diagnostic').innerText(), /keep \d+% of kernel variance/);
  assert.equal(await desktop.locator('#o-math').textContent(), '100%');
  await desktop.locator('#cs-explore summary').click();
  await desktop.getByRole('button', { name: 'Syllabus', exact: true }).click();
  await desktop.waitForFunction(() => {
    const [, structure, syllabus] = [...document.querySelectorAll('.cs-bar em')].map((el) =>
      Number(el.textContent),
    );
    return syllabus > structure;
  });
  await desktop.getByRole('button', { name: 'Reset layout' }).click();
  await desktop.waitForFunction(() => document.querySelector('#cs-axes').textContent === '');
  assert.equal(await desktop.locator('#o-math').textContent(), '100%');

  // Both local formats use synthetic data. The private value is never in a request or URL.
  const load = async (payload) => {
    await desktop.locator('#cs-overlay').setInputFiles({
      name: 'overlay.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    });
    await desktop.locator('#cs-source[data-private]').waitFor();
  };
  const privateData = { visibility: 'private_learning_evidence' };
  await load({
    ...privateData,
    schema_version: 2,
    export_id: 'concept-space:unified',
    concepts: {
      'concept:fatou_lemma': {
        overall: { state: 'independently_demonstrated', retention_verified: true },
        by_course: {
          stats310a: {
            state: 'independently_demonstrated',
            retention_verified: true,
            linked_topics: [{ name: 'Synthetic test skill', scores: { retention: 3 } }],
          },
        },
      },
    },
  });
  await find(desktop, 'fatou');
  assert.match(await detail.innerText(), /Delayed retention verified[\s\S]*Synthetic test skill/);
  assert.match(await desktop.locator('.cs-progress').innerText(), /Delayed retention verified\s+1/);
  await desktop.getByRole('button', { name: 'Remove overlay' }).click();
  assert.doesNotMatch(await detail.innerText(), /Synthetic test skill/);
  await load({
    ...privateData,
    graph_id: 'concept-atlas:stats310a',
    concepts: { 'concept:fatou_lemma': { state: 'provisional' } },
  });
  assert.match(await detail.innerText(), /Assisted \/ provisional/);
  await desktop.reload();
  await ready(desktop);
  assert.equal(await desktop.locator('#cs-source').getAttribute('data-private'), null);
  assert.deepEqual(log.errors, []);
  assert.deepEqual(
    log.requests.filter((req) => !req.startsWith(new URL(base).origin) && !req.startsWith('data:')),
    [],
  );
  assert.ok(log.requests.every((req) => !/overlay|synthetic/i.test(req)));

  // A touch viewport with reduced motion and emulated CPU slowdown.
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const mobileLog = watch(mobile);
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const mobileStart = Date.now();
  await mobile.goto(url);
  await ready(mobile);
  const mobileReadyMs = Date.now() - mobileStart;
  const mobileComputeMs = await mobile.evaluate(() => window.__conceptSpace.layoutMs);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await mobile.locator('#cs-search').isVisible());
  await mobile.screenshot({ path: `${shots}/mobile-global.png` });
  await mobile.locator('label:has([name="course"][value="physics330"])').tap();
  const mobileDetail = await find(mobile, 'klein-gordon');
  assert.match(await mobileDetail.innerText(), /Klein.*Gordon/i);
  const stage = await mobile.locator('#cs-stage').boundingBox();
  const sheet = await mobileDetail.boundingBox();
  assert.ok(sheet.x >= stage.x && sheet.x + sheet.width <= stage.x + stage.width + 1);
  await mobile.locator('#cs-stage').scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: `${shots}/mobile-detail.png` });
  await mobile.locator('#cs-close').tap();
  await mobile.locator('#cs-list-toggle').tap();
  assert.ok(await mobile.locator('#cs-list').isVisible());
  await mobile.screenshot({ path: `${shots}/mobile-list.png` });
  await mobile.getByRole('link', { name: 'Practice', exact: true }).tap();
  assert.ok(await mobile.locator('.cs-queue > li').count());
  await mobile.screenshot({ path: `${shots}/mobile-practice.png` });
  await mobile.setViewportSize({ width: 320, height: 740 });
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(mobileLog.errors, []);

  const flat = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const flatLog = watch(flat);
  await flat.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : original.call(this, type, ...args);
    };
  });
  await flat.goto(url);
  await ready(flat);
  const svg = flat.locator('.cs-fallback');
  await svg.locator('circle[data-select]').first().waitFor();
  assert.match(await flat.locator('#cs-status').innerText(), /WebGL unavailable/);
  assert.equal(await svg.locator('circle[data-select]').count(), 353);
  assert.equal(await svg.locator('.is-bridge').count(), 35);
  await flat.locator('label:has([name="course"][value="math116"])').click();
  await flat.waitForFunction(
    () => document.querySelectorAll('.cs-fallback circle[data-select]').length < 353,
  );
  assert.ok(await svg.locator('.is-bridge').count());
  assert.ok(await svg.locator('text').count());
  await find(flat, 'fourier transform');
  await flat.waitForFunction(() => document.querySelector('.cs-fallback .is-local'));
  assert.ok(await svg.locator('.is-bridge.is-local').count());
  await flat.screenshot({ path: `${shots}/fallback.png` });
  await flat.locator('#cs-bridges').uncheck();
  await flat.waitForFunction(() => !document.querySelector('.cs-fallback .is-bridge'));
  await flat.setViewportSize({ width: 390, height: 844 });
  assert.ok(await flat.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(flatLog.errors, []);
  console.log(JSON.stringify({ desktopReadyMs, mobileReadyMs, mobileComputeMs }));
  console.log('Concept Space browser checks passed');
} finally {
  await browser.close();
}
