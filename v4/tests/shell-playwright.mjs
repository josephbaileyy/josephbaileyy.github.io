import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4174/';
const shotsDir =
  '/private/tmp/claude-501/-Users-josephbailey-josephbaileyy-github-io/be09eafa-f60f-4346-9414-48a5ff71123d/scratchpad/shots';
const widths = [390, 768, 1280, 1920];
const overlapWidths = [390, 768, 1024, 1280, 1440, 1920, 2560];
const screenshotWidths = [390, 1280, 1920];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const consoleErrors = [];
const failedRequests = [];

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
  });

  await page.goto(`${baseUrl}?machine=idle&seed=17&frame=0`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.querySelector('#unfolding-machine')?.dataset.state === 'ready',
  );

  const overlapResults = [];
  for (const width of overlapWidths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    const sections = await page.evaluate(() =>
      [...document.querySelectorAll('.content-section')].map((section) => {
        const heading = section.querySelector('h2');
        const card = section.children[1].getBoundingClientRect();
        const textRange = document.createRange();
        textRange.selectNodeContents(heading);
        const textRects = [...textRange.getClientRects()];
        const sharesRows = textRects.some(
          (rect) => rect.bottom > card.top && rect.top < card.bottom,
        );
        const textRight = Math.max(...textRects.map((rect) => rect.right));
        return {
          section: section.id,
          textRight: Number(textRight.toFixed(1)),
          cardLeft: Number(card.left.toFixed(1)),
          layout: sharesRows ? 'columns' : 'stacked',
          overlap:
            sharesRows &&
            textRects.some(
              (rect) =>
                rect.right > card.left + 0.5 && rect.bottom > card.top && rect.top < card.bottom,
            ),
        };
      }),
    );
    for (const section of sections) {
      assert.equal(
        section.overlap,
        false,
        `title/card overlap at ${width}px: ${JSON.stringify(section)}`,
      );
      if (section.layout === 'columns') {
        assert.ok(
          section.textRight <= section.cardLeft,
          `title escaped its column at ${width}px: ${JSON.stringify(section)}`,
        );
      }
    }
    overlapResults.push({ width, sections });
  }
  console.log('TITLE_OVERLAP', JSON.stringify(overlapResults));

  const overflowResults = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    assert.ok(
      dimensions.scrollWidth <= dimensions.clientWidth,
      `horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`,
    );
    overflowResults.push({ width, ...dimensions });
  }
  console.log('OVERFLOW', JSON.stringify(overflowResults));

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(100);
  const stickyAt3000 = await page.evaluate(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect();
    const nav = document.querySelector('.site-nav').getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      headerTop: Number(header.top.toFixed(1)),
      headerBottom: Number(header.bottom.toFixed(1)),
      navTop: Number(nav.top.toFixed(1)),
      navBottom: Number(nav.bottom.toFixed(1)),
    };
  });
  assert.ok(stickyAt3000.headerTop >= 0, JSON.stringify(stickyAt3000));
  assert.ok(stickyAt3000.headerBottom <= stickyAt3000.viewportHeight, JSON.stringify(stickyAt3000));
  assert.ok(stickyAt3000.navTop >= 0, JSON.stringify(stickyAt3000));
  assert.ok(stickyAt3000.navBottom <= stickyAt3000.viewportHeight, JSON.stringify(stickyAt3000));
  console.log('STICKY_AT_3000', JSON.stringify(stickyAt3000));

  await page.locator('.site-nav a[href="#education"]').click();
  await page.waitForTimeout(100);
  const anchorClearance = await page.evaluate(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect();
    const target = document.querySelector('#education').getBoundingClientRect();
    const heading = document.querySelector('#education-title').getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      headerBottom: Number(header.bottom.toFixed(1)),
      targetTop: Number(target.top.toFixed(1)),
      headingTop: Number(heading.top.toFixed(1)),
      headingClearance: Number((heading.top - header.bottom).toFixed(1)),
    };
  });
  assert.ok(anchorClearance.targetTop >= anchorClearance.headerBottom, JSON.stringify(anchorClearance));
  assert.ok(
    anchorClearance.headingTop >= anchorClearance.headerBottom,
    JSON.stringify(anchorClearance),
  );
  console.log('ANCHOR_CLEARANCE', JSON.stringify(anchorClearance));

  await page.evaluate(() => window.scrollTo(0, 8000));
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.mouse.move(640, 450);
  for (let index = 0; index < 12; index += 1) {
    await page.mouse.wheel(0, 180);
  }
  await page.waitForTimeout(300);
  const afterWheel = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(3000);
  const afterSettle = await page.evaluate(() => window.scrollY);
  assert.ok(afterWheel > 0, `wheel input did not move the page: ${afterWheel}`);
  assert.ok(
    afterSettle >= afterWheel - 2,
    `user scroll was reverted: ${JSON.stringify({ afterWheel, afterSettle })}`,
  );
  console.log('USER_SCROLL_WINS', JSON.stringify({ afterWheel, afterSettle }));

  const scrollResults = [];
  for (const requested of [1500, 4000]) {
    const actual = await page.evaluate((y) => {
      window.scrollTo(0, y);
      return window.scrollY;
    }, requested);
    await page.waitForTimeout(1500);
    const retained = await page.evaluate(() => window.scrollY);
    assert.ok(Math.abs(retained - actual) <= 2, `scroll moved from ${actual} to ${retained}`);
    scrollResults.push({ requested, actual, retained });
  }
  console.log('SCROLL_RETENTION', JSON.stringify(scrollResults));

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(2500);
  const bottom = await page.evaluate(() => ({
    scrollY: window.scrollY,
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  assert.ok(
    Math.abs(bottom.scrollY + bottom.innerHeight - bottom.scrollHeight) <= 2,
    `page did not reach bottom: ${JSON.stringify(bottom)}`,
  );
  console.log('PAGE_BOTTOM', JSON.stringify(bottom));

  const trigger = page.locator('a[data-drawer-id="minerva-omnifold"]').first();
  await trigger.click();
  const drawer = page.locator('#item-drawer');
  await assert.doesNotReject(() => drawer.waitFor({ state: 'visible' }));
  assert.equal(
    await page.evaluate(() => document.activeElement?.matches('[data-drawer-close]')),
    true,
  );
  await page.keyboard.press('Shift+Tab');
  assert.equal(
    await page.evaluate(() => document.activeElement?.closest('#item-drawer')?.id),
    'item-drawer',
  );
  await page.keyboard.press('Escape');
  assert.equal(await drawer.evaluate((element) => element.open), false);
  await page.waitForTimeout(50);
  assert.equal(await trigger.evaluate((element) => document.activeElement === element), true);
  console.log('DRAWER', 'opened, focus entered and trapped, Escape closed, focus returned');

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failedRequests, []);
  console.log('CONSOLE_ERRORS', JSON.stringify(consoleErrors));
  console.log('FAILED_REQUESTS', JSON.stringify(failedRequests));

  await mkdir(shotsDir, { recursive: true });
  const visualContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'no-preference',
  });
  const visualPage = await visualContext.newPage();
  visualPage.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  visualPage.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
  });
  const screenshotResults = [];
  for (const width of screenshotWidths) {
    await visualPage.setViewportSize({
      width,
      height: width === 390 ? 844 : width === 1280 ? 1024 : 1080,
    });
    await visualPage.goto(`${baseUrl}?machine=idle&seed=17&frame=0`, {
      waitUntil: 'networkidle',
    });
    await visualPage.waitForFunction(
      () => document.querySelector('#unfolding-machine')?.dataset.state === 'ready',
    );
    await visualPage.evaluate(() => document.documentElement.classList.remove('reveal-ready'));
    for (const section of ['research', 'education']) {
      await visualPage.evaluate((id) => {
        const target = document.querySelector(`#${id}`);
        window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 84);
      }, section);
      await visualPage.waitForTimeout(400);
      const path = `${shotsDir}/v4lay-${width}-${section}.png`;
      await visualPage.screenshot({ path, animations: 'disabled' });
      screenshotResults.push({
        path,
        scrollY: await visualPage.evaluate(() => window.scrollY),
        state: await visualPage.locator('#unfolding-machine').getAttribute('data-state'),
      });
    }
    await visualPage.evaluate(() => window.scrollTo(0, 3000));
    await visualPage.waitForTimeout(400);
    const stickyPath = `${shotsDir}/v4lay-${width}-sticky-3000.png`;
    await visualPage.screenshot({ path: stickyPath, animations: 'disabled' });
    screenshotResults.push({
      path: stickyPath,
      scrollY: await visualPage.evaluate(() => window.scrollY),
      state: await visualPage.locator('#unfolding-machine').getAttribute('data-state'),
    });
  }
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failedRequests, []);
  await visualContext.close();
  console.log('SCREENSHOTS', JSON.stringify(screenshotResults));

  const axeSource = await fetch('https://unpkg.com/axe-core@4.10.3/axe.min.js').then((response) => {
    assert.equal(response.ok, true, `axe-core download returned ${response.status}`);
    return response.text();
  });
  await page.addScriptTag({ content: axeSource });
  const axeResults = await page.evaluate(async () =>
    window.axe.run(document, {
      resultTypes: ['violations'],
    }),
  );
  const severe = axeResults.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact),
  );
  assert.deepEqual(
    severe.map(({ id, impact }) => ({ id, impact })),
    [],
  );
  console.log(
    'AXE_VIOLATIONS',
    JSON.stringify(
      axeResults.violations.map(({ id, impact, nodes, help }) => ({
        id,
        impact,
        nodes: nodes.length,
        help,
      })),
    ),
  );

  await context.close();

  const noJavaScriptContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 900 },
  });
  const noJavaScriptPage = await noJavaScriptContext.newPage();
  await noJavaScriptPage.goto(baseUrl, { waitUntil: 'networkidle' });

  assert.equal(await noJavaScriptPage.locator('h1').count(), 1);
  assert.equal(await noJavaScriptPage.locator('#research article').count(), 5);
  assert.equal(await noJavaScriptPage.locator('#projects article').count(), 7);
  assert.equal(await noJavaScriptPage.locator('#experience article').count(), 2);
  assert.match(await noJavaScriptPage.locator('body').innerText(), /question under test/i);
  assert.match(await noJavaScriptPage.locator('body').innerText(), /WisdomTree Connect/i);
  assert.match(await noJavaScriptPage.locator('body').innerText(), /MTAC Level 10/i);

  await noJavaScriptPage.locator('.site-nav a[href="#research"]').click();
  assert.equal(new URL(noJavaScriptPage.url()).hash, '#research');

  const localEvidenceLinks = await noJavaScriptPage
    .locator('a')
    .evaluateAll((links) => [
      ...new Set(
        links
          .map((link) => link.href)
          .filter((href) => href.startsWith(location.origin) && !href.includes('#')),
      ),
    ]);
  const localLinkResults = [];
  for (const href of localEvidenceLinks) {
    const response = await noJavaScriptContext.request.get(href);
    assert.equal(response.ok(), true, `${href} returned ${response.status()}`);
    localLinkResults.push({ href, status: response.status() });
  }
  console.log(
    'NO_JAVASCRIPT',
    JSON.stringify({
      research: 5,
      projects: 7,
      experience: 2,
      hashNavigation: '#research',
      localLinks: localLinkResults,
    }),
  );
  await noJavaScriptContext.close();
} finally {
  await browser.close();
}
