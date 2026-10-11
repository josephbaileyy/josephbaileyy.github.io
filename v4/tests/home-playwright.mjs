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
  assert.equal(await page.locator('.introduction [data-instagram]').count(), 1);
  assert.equal(
    await page
      .locator('img[src*="/img/instagram/"]')
      .evaluateAll((images) => images.every((image) => image.closest('[data-instagram]'))),
    true,
    'Instagram images should stay inside the widget',
  );
  assert.equal(await page.locator('.photo-roll, .intro-portrait').count(), 0);
  assert.equal(
    await page.locator('.track-card img').getAttribute('src'),
    './img/home/track-start.png',
  );
  const trackLink = page.locator('.intro-personal .track-link');
  const musicLink = page.locator('.intro-personal .music-link');
  assert.equal(await trackLink.innerText(), '400m hurdler');
  assert.equal(await musicLink.innerText(), 'variety of ensembles');
  assert.notEqual(
    await trackLink.evaluate((link) => getComputedStyle(link).color),
    await musicLink.evaluate((link) => getComputedStyle(link).color),
  );
  for (const link of [trackLink, musicLink]) {
    assert.equal(
      await link.evaluate((element) => getComputedStyle(element).textDecorationLine),
      'none',
    );
    await link.hover();
    assert.equal(
      await link.evaluate((element) => getComputedStyle(element).textDecorationLine),
      'underline',
    );
    await page.mouse.move(0, 0);
  }
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
  assert.equal(await page.locator('#music audio').getAttribute('preload'), 'none');
  assert.equal(await page.locator('#music audio').getAttribute('autoplay'), null);
  assert.equal(
    requests.some((url) => url.includes('/audio/fugue.m4a')),
    false,
    'Audio fetched before play',
  );
  const audioResponse = await context.request.get(new URL('audio/fugue.m4a', baseUrl).href);
  assert.equal(audioResponse.ok(), true);
  assert.match(audioResponse.headers()['content-type'], /audio\/(?:mp4|x-m4a)/);
  assert.equal(await page.locator('#research article').count(), 5);
  assert.equal(await page.locator('#projects article').count(), 6);
  assert.equal(await page.locator('#unfolding-machine').count(), 0);
  assert.equal(
    await page.locator('#unfolding-explanation').evaluate((element) => element.open),
    false,
  );
  assert.equal(
    requests.some((url) => /(?:three-|rapier-|\/unfolding-|\/img\/unfolding\/)/.test(url)),
    false,
  );
  const researchLinks = await page.locator('#research article > .entry-heading a').all();
  assert.equal(researchLinks.length, 5);
  for (const anchor of researchLinks) assert.equal(await anchor.isVisible(), true);
  assert.equal(await page.locator('#projects > .work-list article').count(), 3);
  assert.equal(await page.locator('#more-projects').evaluate((element) => element.open), false);
  const researchDetails = page.locator('#minerva-omnifold > .record-details');
  assert.equal(await researchDetails.locator('.explanation-body').isVisible(), false);
  await researchDetails.locator('summary').click();
  assert.match(await researchDetails.innerText(), /question under test/);
  await researchDetails.locator('summary').click();

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
  await page.locator('.personal-grid').screenshot({ path: `${shotsDir}/personal-preview.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${shotsDir}/instagram-preview.png`,
    clip: { x: 140, y: 40, width: 1000, height: 480 },
  });
  const explanation = page.locator('#unfolding-explanation > summary');
  await explanation.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.unfolding-story svg').count(), 3);
  assert.equal(await page.locator('.unfolding-story').isVisible(), true);
  assert.equal(await page.locator('[data-demo-view]').isVisible(), false);
  assert.equal(
    requests.some((url) => /\/img\/unfolding\//.test(url)),
    false,
  );
  await page.locator('.unfolding-takeaway').click();
  await page
    .locator('.unfolding-explainer')
    .screenshot({ path: `${shotsDir}/unfolding-visual.png` });
  const summary = page.locator('#unfolding-interactive > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-demo-view]').waitFor({ state: 'visible' });
  const image = (selector) => page.locator(selector).evaluate((canvas) => canvas.toDataURL());
  assert.equal(await page.locator('#unfolding-iteration').inputValue(), '0');
  assert.equal(await page.locator('[data-shared-prior]').inputValue(), 'hurdler');
  assert.deepEqual(
    await page
      .locator('[data-shared-prior] option')
      .evaluateAll((options) => options.map((option) => option.value)),
    ['hurdler', 'photo-intensity'],
  );
  assert.equal(await page.locator('[data-shared-demo] select').count(), 1);
  assert.equal(await page.locator('[data-shared-demo] button:visible').count(), 1);
  assert.equal(await page.locator('.shared-method').evaluate((element) => element.open), false);
  const initialEstimate = await image('[data-shared-estimate]');
  const initialData = await image('[data-shared-data]');
  const reference = await image('[data-shared-reference]');
  for (const iteration of ['1', '12']) {
    await page.locator('#unfolding-iteration').fill(iteration);
    assert.notEqual(await image('[data-shared-estimate]'), initialEstimate);
    assert.equal(await image('[data-shared-data]'), initialData);
    assert.equal(await image('[data-shared-reference]'), reference);
  }
  assert.equal(await page.locator('[data-shared-play]').innerText(), 'Replay');
  await summary.click();
  await summary.click();
  assert.equal(await page.locator('#unfolding-iteration').inputValue(), '12');
  await page.locator('[data-shared-prior]').selectOption('photo-intensity');
  await page.waitForFunction(() => !document.querySelector('[data-shared-prior]').disabled);
  assert.equal(await page.locator('#unfolding-iteration').inputValue(), '0');
  assert.equal(await page.locator('#unfolding-iteration').getAttribute('max'), '3');
  assert.ok(requests.some((url) => url.endsWith('/data/unfolding/photo-intensity-015.bin')));
  assert.equal(
    requests.some((url) => url.includes('photo-intensity-040')),
    false,
  );
  const portraitData = await image('[data-shared-data]');
  const portraitReference = await image('[data-shared-reference]');
  const portraitStart = await image('[data-shared-estimate]');
  await page.locator('[data-shared-play]').click();
  await page.waitForFunction(
    () => document.querySelector('[data-shared-play]').textContent === 'Replay',
  );
  assert.equal(await page.locator('#unfolding-iteration').inputValue(), '3');
  assert.notEqual(await image('[data-shared-estimate]'), portraitStart);
  assert.equal(await image('[data-shared-data]'), portraitData);
  assert.equal(await image('[data-shared-reference]'), portraitReference);
  await page.locator('.shared-method > summary').click();
  const estimateBeforeExplanation = await image('[data-shared-estimate]');
  assert.match(
    await page.locator('[data-shared-method-example]').innerText(),
    /independent detector data/,
  );
  await page.locator('.shared-method > summary').click();
  assert.equal(await image('[data-shared-estimate]'), estimateBeforeExplanation);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Demo overflow at ${width}px`,
    );
    await page
      .locator('#unfolding-interactive')
      .screenshot({ path: `${shotsDir}/omnifold-simple-portrait-${width}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.locator('[data-shared-play]').click();
  assert.equal(await page.locator('[data-shared-play]').innerText(), 'Pause');
  await page.waitForFunction(
    () => Number(document.querySelector('#unfolding-iteration').value) >= 1,
  );
  await explanation.click();
  await page.waitForFunction(
    () => document.querySelector('[data-shared-play]').textContent === 'Play',
  );
  await explanation.click();
  const pausedEstimate = await image('[data-shared-estimate]');
  await page.waitForTimeout(300);
  assert.equal(await image('[data-shared-estimate]'), pausedEstimate);
  await page.locator('[data-shared-prior]').selectOption('hurdler');
  await page.waitForFunction(() => !document.querySelector('[data-shared-prior]').disabled);
  assert.equal(await page.locator('#unfolding-iteration').inputValue(), '0');
  assert.equal(await page.locator('#unfolding-iteration').getAttribute('max'), '12');
  assert.equal(await image('[data-shared-data]'), initialData);
  assert.equal(await image('[data-shared-reference]'), reference);
  await page.locator('#unfolding-iteration').fill('12');
  await page
    .locator('#unfolding-interactive')
    .screenshot({ path: `${shotsDir}/omnifold-simple-hurdler.png` });
  await page.setViewportSize({ width: 320, height: 900 });
  await summary.click();
  await page.locator('#athletics summary').first().click();
  assert.equal(await page.locator('.race-plot-mobile').isVisible(), true);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${shotsDir}/race-320.png`, fullPage: true });

  await page.goto(new URL('#unfolding-interactive', baseUrl).href);
  await page.locator('[data-demo-view]').waitFor({ state: 'visible' });
  assert.equal(
    await page.locator('#unfolding-explanation').evaluate((element) => element.open),
    true,
  );
  await page.goto(new URL('#systems-security', baseUrl).href);
  assert.equal(await page.locator('#more-projects').evaluate((element) => element.open), true);
  assert.equal(await page.locator('#systems-security').isVisible(), true);
  await page.goto(new URL('#experience', baseUrl).href);
  await page.waitForURL('**/about.html#experience');
  assert.equal(await page.locator('#experience article').count(), 2);
  await page.reload();
  assert.equal(await page.locator('#experience article').count(), 2);
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
  assert.equal(await plain.locator('#projects article').count(), 6);
  assert.equal(await plain.locator('#experience article').count(), 0);
  assert.equal(await plain.locator('[data-instagram-slide]:not([hidden])').count(), 1);
  assert.equal(await plain.getByRole('button', { name: 'Next Instagram post' }).isVisible(), false);
  assert.equal(await plain.locator('.instagram-profile').isVisible(), true);
  await plain.locator('#minerva-omnifold > .record-details > summary').click();
  assert.match(await plain.locator('body').innerText(), /question under test/);
  await plain.locator('#unfolding-explanation > summary').click();
  assert.equal(await plain.locator('.unfolding-story').isVisible(), true);
  await plain.locator('#unfolding-interactive > summary').click();
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
  await plain.getByRole('link', { name: 'About', exact: true }).click();
  assert.equal(await plain.locator('#experience article').count(), 2);
  assert.match(await plain.locator('#education').innerText(), /Expected June 2027/);
  await plain.goto(new URL('notes/', baseUrl).href);
  await plain.locator('.note-list a').first().click();
  assert.equal(await plain.locator('.archive-note').isVisible(), true);
  assert.match(await plain.locator('.note-body').innerText(), /The seam theorem/);
  for (const width of [320, 390, 768, 1280]) {
    await plain.setViewportSize({ width, height: 900 });
    assert.ok(
      await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Note overflow at ${width}px`,
    );
  }
  console.log(
    `PASS: no-JavaScript research, disclosures, race plot, and ${localLinks.length} local evidence links.`,
  );
  await noJs.close();

  const fallback = await browser.newContext({ reducedMotion: 'reduce' });
  const failed = await fallback.newPage();
  const replayPattern = '**/data/unfolding/hurdler-040.bin';
  await failed.route(replayPattern, (route) => route.abort());
  await failed.goto(baseUrl, { waitUntil: 'networkidle' });
  await failed.locator('#unfolding-explanation > summary').click();
  await failed.locator('#unfolding-interactive > summary').click();
  await failed.locator('[data-demo-retry]').waitFor({ state: 'visible' });
  assert.match(await failed.locator('[data-demo-status]').innerText(), /could not load/);
  assert.equal(await failed.locator('#minerva-omnifold > .entry-heading a').isVisible(), true);
  await failed.unroute(replayPattern);
  await failed.locator('[data-demo-retry]').click();
  await failed.locator('[data-demo-view]').waitFor({ state: 'visible' });
  assert.equal(await failed.locator('#unfolding-iteration').inputValue(), '0');
  const portraitPattern = '**/data/unfolding/photo-intensity-015.bin';
  await failed.route(portraitPattern, (route) => route.abort());
  await failed.locator('[data-shared-prior]').selectOption('photo-intensity');
  await failed.locator('[data-shared-settings-retry]').waitFor({ state: 'visible' });
  assert.equal(await failed.locator('[data-shared-prior]').inputValue(), 'hurdler');
  assert.equal(await failed.locator('#unfolding-iteration').getAttribute('max'), '12');
  await failed.unroute(portraitPattern);
  await failed.locator('[data-shared-settings-retry]').click();
  await failed.waitForFunction(() => !document.querySelector('[data-shared-prior]').disabled);
  assert.equal(await failed.locator('[data-shared-prior]').inputValue(), 'photo-intensity');
  assert.equal(await failed.locator('#unfolding-iteration').getAttribute('max'), '3');
  console.log('PASS: classifier-data loading fallback, retry, and reduced-motion presentation.');
  await fallback.close();
} finally {
  await browser.close();
}
