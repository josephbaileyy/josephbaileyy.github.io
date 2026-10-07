import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

import { chromium } from 'playwright';

const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4177/';
const shotsDir = process.env.SHOTS_DIR || 'test-results/home';
const browser = await chromium.launch({ headless: true });
await mkdir(shotsDir, { recursive: true });

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const instagram = page.locator('[data-instagram]');
  const visiblePost = instagram.locator('[data-instagram-slide]:not([hidden])');
  assert.equal(await visiblePost.count(), 1);
  const firstPost = await visiblePost.locator('.instagram-post').getAttribute('href');
  assert.match(firstPost, /\/p\/DdXkvjlj4eb\/$/);
  await instagram.getByRole('button', { name: 'Next Instagram post' }).click();
  assert.match(await visiblePost.locator('.instagram-post').getAttribute('href'), /DcaDTaWDRd4/);
  assert.equal(await instagram.locator('[data-instagram-count]').innerText(), '2 / 4');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await visiblePost.locator('.instagram-post').getAttribute('href'), firstPost);
  await instagram.getByRole('button', { name: 'Previous Instagram post' }).click();
  assert.match(await visiblePost.locator('.instagram-post').getAttribute('href'), /DMVm3ckxOOf/);
  await page.keyboard.press('ArrowRight');
  assert.equal(await visiblePost.locator('.instagram-post').getAttribute('href'), firstPost);
  for (let index = 0; index < 4; index++) {
    const photo = visiblePost.locator('.instagram-post img');
    await page.waitForFunction(() => {
      const img = document.querySelector('[data-instagram-slide]:not([hidden]) img');
      return img?.complete && img.naturalWidth > 0;
    });
    assert.ok(await photo.evaluate((img) => img.complete && img.naturalWidth > 0));
    assert.equal(await visiblePost.locator('.instagram-post').getAttribute('target'), '_blank');
    await instagram.getByRole('button', { name: 'Next Instagram post' }).click();
  }
  assert.equal(await page.locator('#research article').count(), 5);
  assert.equal(await page.locator('#projects article').count(), 7);
  assert.equal(await page.locator('#unfolding-machine').count(), 0);
  assert.equal(
    await page.locator('#unfolding-explanation').evaluate((element) => element.open),
    false,
  );
  assert.equal(
    requests.some((url) => /(?:three-|rapier-|\/unfolding-|\/img\/unfolding\/)/.test(url)),
    false,
  );
  const researchLinks = await page.locator('#research article > .evidence-links a').all();
  for (const anchor of researchLinks) assert.equal(await anchor.isVisible(), true);

  for (const width of [320, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const result = await page.evaluate(() => {
      const dates = [...document.querySelectorAll('#research .entry-date')].map((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return {
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        dates,
      };
    });
    assert.ok(result.scroll <= result.width, `Horizontal overflow at ${width}px`);
    assert.equal(result.dates.every(Boolean), true, `Hidden dates at ${width}px`);
    if ([390, 1280].includes(width))
      await page.screenshot({ path: `${shotsDir}/home-${width}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({
    path: `${shotsDir}/instagram-preview.png`,
    clip: { x: 140, y: 40, width: 1000, height: 480 },
  });
  const summary = page.locator('#unfolding-explanation > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-demo-view]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#unfolding-iteration').inputValue(), '0');
  assert.equal(await page.locator('[data-ess]').innerText(), '100%');
  await page.locator('#unfolding-iteration').fill('8');
  const photoEss = await page.locator('[data-ess]').innerText();
  assert.equal(photoEss, '42%');
  const measuredData = () =>
    page.locator('[data-measured]').evaluate((canvas) => canvas.toDataURL());
  const measuredBefore = await measuredData();
  await page.locator('[name="unfolding-prior"][value="uniform"]').check();
  assert.equal(await page.locator('[data-ess]').innerText(), '32%');
  assert.equal(
    await measuredData(),
    measuredBefore,
    'Changing the simulation changed the measured data',
  );
  await page.getByRole('button', { name: 'Show synthetic truth' }).click();
  assert.equal(await page.locator('[data-reveal-truth]').getAttribute('aria-pressed'), 'true');
  await page.screenshot({ path: `${shotsDir}/unfolding-1280.png`, fullPage: true });
  await summary.click();
  await summary.click();
  assert.equal(await page.locator('#unfolding-iteration').inputValue(), '8');
  await page.setViewportSize({ width: 320, height: 900 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${shotsDir}/unfolding-320.png`, fullPage: true });
  await summary.click();
  await page.locator('#athletics summary').first().click();
  assert.equal(await page.locator('.race-plot-mobile').isVisible(), true);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${shotsDir}/race-320.png`, fullPage: true });

  await page.goto(new URL('#unfolding-explanation', baseUrl).href);
  await page.locator('[data-demo-view]').waitFor({ state: 'visible' });
  assert.equal(
    await page.locator('#unfolding-explanation').evaluate((element) => element.open),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: initial page has visible evidence and dates, no physics-engine requests, responsive layouts, keyboard disclosure, fixed synthetic data, and persistent controls.',
  );
  await context.close();

  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const plain = await noJs.newPage();
  await plain.goto(baseUrl, { waitUntil: 'networkidle' });
  assert.equal(await plain.locator('#research article').count(), 5);
  assert.equal(await plain.locator('#projects article').count(), 7);
  assert.equal(await plain.locator('#experience article').count(), 2);
  assert.equal(await plain.locator('[data-instagram-slide]:not([hidden])').count(), 1);
  assert.equal(await plain.getByRole('button', { name: 'Next Instagram post' }).isVisible(), false);
  assert.equal(await plain.locator('.instagram-profile').isVisible(), true);
  assert.match(await plain.locator('body').innerText(), /question under test/);
  await plain.locator('#unfolding-explanation > summary').click();
  assert.match(await plain.locator('#unfolding-explanation').innerText(), /needs JavaScript/);
  assert.equal(await plain.locator('[data-demo-view]').isVisible(), false);
  await plain.locator('#athletics summary').first().click();
  assert.equal(await plain.locator('.race-plot-mobile').isVisible(), true);
  const localLinks = await plain
    .locator('a')
    .evaluateAll((anchors) => [
      ...new Set(
        anchors
          .map((a) => a.href)
          .filter((href) => href.startsWith(location.origin) && !href.includes('#')),
      ),
    ]);
  for (const url of localLinks) {
    const response = await noJs.request.get(url);
    assert.equal(response.ok(), true, `${url} returned ${response.status()}`);
    if (url.endsWith('.pdf')) assert.match(response.headers()['content-type'], /pdf/);
  }
  console.log(
    `PASS: no-JavaScript research, disclosures, race plot, and ${localLinks.length} local evidence links.`,
  );
  await noJs.close();

  const fallback = await browser.newContext({ reducedMotion: 'reduce' });
  const failed = await fallback.newPage();
  const imagePattern = '**/img/unfolding/face2024.png';
  await failed.route(imagePattern, (route) => route.abort());
  await failed.goto(baseUrl, { waitUntil: 'networkidle' });
  await failed.locator('#unfolding-explanation > summary').click();
  await failed.locator('[data-demo-retry]').waitFor({ state: 'visible' });
  assert.match(await failed.locator('[data-demo-status]').innerText(), /could not load/);
  assert.equal(
    await failed.locator('#minerva-omnifold > .evidence-links a').first().isVisible(),
    true,
  );
  await failed.unroute(imagePattern);
  await failed.locator('[data-demo-retry]').click();
  await failed.locator('[data-demo-view]').waitFor({ state: 'visible' });
  assert.equal(await failed.locator('#unfolding-iteration').inputValue(), '0');
  console.log('PASS: failed-image fallback, retry, and reduced-motion presentation.');
  await fallback.close();
} finally {
  await browser.close();
}
