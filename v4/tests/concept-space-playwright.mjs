// Browser checks for /learning/space/. Run against `npm run preview`:
//   node v4/tests/concept-space-playwright.mjs
// Set CHROME_PATH to use an installed Chrome instead of Playwright's bundled build.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4177/';
const shotsDir = process.env.SHOTS_DIR || 'test-results/concept-space';
const pageUrl = new URL('learning/space/', baseUrl).href;
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
await mkdir(shotsDir, { recursive: true });

function watch(page) {
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => requests.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  return { errors, requests };
}

const ready = (page) =>
  page.waitForFunction(
    () => window.__conceptSpace?.state.layout && document.querySelector('.cs-bar'),
  );

try {
  // Desktop: render, search, select, modes, weights, private overlay.
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const log = watch(desktop);
  await desktop.goto(pageUrl, { waitUntil: 'networkidle' });
  await ready(desktop);
  const hasGL = await desktop.evaluate(() =>
    Boolean(document.getElementById('cs-canvas').getContext('webgl2')),
  );
  assert.ok(hasGL, 'WebGL scene should render');
  assert.equal(await desktop.locator('#cs-list li').count(), 94);
  await desktop.screenshot({ path: `${shotsDir}/desktop-global.png` });

  await desktop.keyboard.press('/');
  await desktop.keyboard.type('dominated');
  await desktop.keyboard.press('Enter');
  const detail = desktop.locator('#cs-detail');
  await detail.waitFor();
  assert.match(await detail.innerText(), /Dominated convergence theorem/);
  assert.match(await detail.innerText(), /Builds on[\s\S]*Fatou/i);
  assert.match(await detail.innerText(), /proposed/);
  assert.match(await detail.innerText(), /Dembo (cites|names)/, 'relations show their source');
  assert.match(await detail.innerText(), /Theorem 1\.3\.34/, 'Dembo anchor listed');
  assert.match(desktop.url(), /c=dominated_convergence_theorem/);
  await desktop.waitForTimeout(1200);
  await desktop.screenshot({ path: `${shotsDir}/desktop-focus.png` });

  // Neighbour links in the detail card select another concept.
  await detail
    .getByRole('button', { name: /Fatou's lemma/ })
    .first()
    .click();
  assert.match(await detail.innerText(), /Fatou's lemma/);
  await desktop.keyboard.press('Escape');
  assert.equal(await detail.isHidden(), true);

  await desktop.getByRole('radio', { name: 'PCA' }).click();
  await desktop.waitForFunction(() =>
    /principal components/.test(document.getElementById('cs-axes').textContent),
  );
  assert.match(await desktop.locator('#cs-diagnostic').innerText(), /keep \d+%/);
  await desktop.waitForTimeout(1200);
  await desktop.screenshot({ path: `${shotsDir}/desktop-pca.png` });

  // Default map is structure-only; the affinity mix lives in a disclosure.
  assert.equal(await desktop.locator('#o-math').textContent(), '100%');
  await desktop.locator('#cs-explore summary').click();
  await desktop.getByRole('button', { name: 'Syllabus', exact: true }).click();
  await desktop.waitForFunction(() => document.getElementById('o-source').textContent === '100%');
  await desktop.waitForTimeout(400);
  const overlaps = await desktop.locator('.cs-bar em').allInnerTexts();
  assert.ok(
    Number(overlaps[2]) > Number(overlaps[0]) && Number(overlaps[2]) > Number(overlaps[1]),
    'syllabus-only layout should agree most with the syllabus channel',
  );

  await desktop.getByRole('radio', { name: /Surface/ }).click();
  await desktop.waitForTimeout(1300);
  const radii = await desktop.evaluate(() =>
    window.__conceptSpace.state.layout.points.map((p) => Math.hypot(...p)),
  );
  assert.ok(
    radii.every((r) => Math.abs(r - 1) < 1e-6),
    'surface mode puts every concept on the sphere',
  );
  await desktop.getByRole('button', { name: 'Reset layout' }).click();
  await desktop.waitForFunction(() => document.getElementById('o-math').textContent === '100%');

  // Syllabus lens: fade concepts scheduled after week 3, colour by week, hide unsourced links.
  await desktop.locator('#cs-week').fill('3');
  assert.match(await desktop.locator('#cs-week-note').innerText(), /after week 3/);
  await desktop.selectOption('#cs-color', 'week');
  assert.match(await desktop.locator('#cs-legend').innerText(), /week 1/);
  await desktop.locator('#cs-unsourced').uncheck();
  await desktop.waitForTimeout(500);
  await desktop.screenshot({ path: `${shotsDir}/desktop-syllabus-lens.png` });
  await desktop.locator('#cs-week').fill('9');
  await desktop.locator('#cs-unsourced').check();
  await desktop.selectOption('#cs-color', 'chapter');

  // A synthetic overlay (never the real one) exercises the private layer locally.
  const graphId = await desktop.evaluate(() => 'concept-atlas:stats310a');
  await desktop.locator('#cs-overlay').setInputFiles({
    name: 'overlay.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        visibility: 'private_learning_evidence',
        graph_id: graphId,
        concepts: {
          'concept:fatou_lemma': {
            state: 'provisional',
            retention_verified: false,
            linked_topics: [
              {
                topic_id: 'synthetic',
                name: 'Synthetic test skill',
                assessment_status: 'provisional',
                scores: { recognition: 2, construction: null, rigor: null, retention: null },
              },
            ],
          },
        },
      }),
    ),
  });
  await desktop.waitForFunction(() =>
    document.getElementById('cs-source').hasAttribute('data-private'),
  );
  assert.match(await desktop.locator('#cs-legend').innerText(), /untested/);
  await desktop.evaluate(() =>
    window.__conceptSpace.select(window.__conceptSpace.model.index.get('concept:fatou_lemma')),
  );
  assert.match(await detail.innerText(), /Synthetic test skill[\s\S]*con —/);
  await desktop.waitForTimeout(900);
  await desktop.screenshot({ path: `${shotsDir}/desktop-overlay.png` });
  await desktop.getByRole('button', { name: 'Remove overlay' }).click();
  assert.equal(await desktop.locator('#cs-source').getAttribute('data-private'), null);

  const external = log.requests.filter(
    (url) => !url.startsWith(new URL(baseUrl).origin) && !url.startsWith('data:'),
  );
  assert.deepEqual(external, [], 'no third-party requests');
  assert.ok(!log.requests.some((url) => /overlay|private/i.test(url)), 'overlay never fetched');
  assert.deepEqual(log.errors, []);

  // Mobile: layout fits, detail is a bottom sheet, touch selection works.
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const mobileLog = watch(mobile);
  await mobile.goto(`${pageUrl}?c=central_limit_theorem`, { waitUntil: 'networkidle' });
  await ready(mobile);
  await mobile.locator('#cs-detail').waitFor();
  const stage = await mobile.locator('#cs-stage').boundingBox();
  const sheet = await mobile.locator('#cs-detail').boundingBox();
  assert.ok(
    stage.width <= 390 && sheet.x >= stage.x && sheet.x + sheet.width <= stage.x + stage.width + 1,
  );
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
  await mobile.locator('#cs-stage').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: `${shotsDir}/mobile-detail.png` });
  await mobile.locator('#cs-close').tap();
  await mobile.locator('#cs-list-toggle').tap();
  assert.equal(await mobile.locator('#cs-list').isVisible(), true);
  await mobile.screenshot({ path: `${shotsDir}/mobile-list.png` });
  assert.deepEqual(mobileLog.errors, []);

  // No WebGL: the flat fallback appears and still selects concepts.
  const flat = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await flat.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  const flatLog = watch(flat);
  await flat.goto(pageUrl, { waitUntil: 'networkidle' });
  await flat.locator('.cs-fallback circle[data-select]').first().waitFor();
  assert.match(await flat.locator('#cs-status').innerText(), /WebGL is unavailable/);
  await flat.locator('.cs-fallback circle[data-select]').nth(40).click({ force: true });
  await flat.locator('#cs-detail').waitFor();
  await flat.screenshot({ path: `${shotsDir}/fallback.png` });
  assert.deepEqual(flatLog.errors, []);
  console.log('concept space browser checks passed');
} finally {
  await browser.close();
}
