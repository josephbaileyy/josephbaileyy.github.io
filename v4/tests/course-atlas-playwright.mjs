import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4177/';
const shotsDir = process.env.SHOTS_DIR || 'test-results/course-atlas';
const browser = await chromium.launch({ headless: true });
await mkdir(shotsDir, { recursive: true });

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(new URL('#education', baseUrl).href, { waitUntil: 'networkidle' });
  const atlas = page.locator('[data-course-atlas]');
  const visibleCourses = () => atlas.locator('[data-course-code]:visible');
  const area = (label) => atlas.getByRole('button', { name: label, exact: true });
  assert.equal(await visibleCourses().count(), 7);
  assert.equal(await atlas.getByRole('button').count(), 5, 'Five area tabs are the only controls');
  assert.equal(await atlas.getByRole('button', { name: 'All courses', exact: true }).count(), 0);
  assert.equal(
    await atlas
      .locator('input, select, .course-color-label, .course-tile-status, .course-year-label')
      .count(),
    0,
  );
  assert.equal(
    await atlas.locator('.course-progress-dot').count(),
    8,
    'Seven current courses plus one shared key',
  );
  assert.equal(await atlas.locator('.course-quarter-mark').count(), 684);
  assert.equal(await atlas.locator('.course-quarter-mark.is-active').count(), 61);
  assert.equal(await atlas.locator('details, summary, .course-body').count(), 0);
  assert.doesNotMatch(await atlas.innerText(), /\bunits?\b/);
  assert.equal(
    await atlas.locator('.atlas-group h4:visible').count(),
    0,
    'Area name appears in the tab only',
  );
  const codes = new Set();
  for (const [label, count] of [
    ['AI', 7],
    ['Physics', 20],
    ['Math', 11],
    ['CS', 6],
    ['More', 13],
  ]) {
    await area(label).click();
    assert.equal(await visibleCourses().count(), count);
    for (const code of await visibleCourses().evaluateAll((tiles) =>
      tiles.map((tile) => tile.dataset.courseCode),
    )) {
      assert.ok(!codes.has(code), `Duplicate course: ${code}`);
      codes.add(code);
    }
  }
  assert.equal(codes.size, 57);

  await area('Physics').focus();
  await page.keyboard.press('Enter');
  assert.equal(await visibleCourses().count(), 20);
  const research = atlas.locator('[data-course-code="PHYSICS 190"]');
  assert.deepEqual(
    await research
      .locator('.course-quarter-mark.is-active')
      .evaluateAll((elements) =>
        elements.map((element) => [element.dataset.year, element.dataset.quarter]),
      ),
    [
      ['2024–25', 'Autumn'],
      ['2024–25', 'Winter'],
      ['2025–26', 'Winter'],
      ['2025–26', 'Spring'],
    ],
  );
  assert.equal(await research.getAttribute('title'), 'Independent Research and Study');
  const quantum = atlas.locator('[data-course-code="PHYSICS 330"]');
  assert.deepEqual(
    await quantum
      .locator('.course-quarter-mark.is-active')
      .evaluateAll((elements) =>
        elements.map((element) => [element.dataset.year, element.dataset.quarter]),
      ),
    [['2026–27', 'Autumn']],
  );
  await area('AI').click();

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Overflow at ${width}px`,
    );
    const fit = await visibleCourses().evaluateAll((tiles) =>
      tiles.every((tile) => {
        const bounds = tile.getBoundingClientRect();
        const code = tile.querySelector('.course-code').getBoundingClientRect();
        const title = tile.querySelector('.course-title').getBoundingClientRect();
        const grid = tile.querySelector('.course-quarter-grid').getBoundingClientRect();
        return (
          tile.scrollWidth <= tile.clientWidth &&
          code.right <= title.left &&
          title.right <= grid.left &&
          title.bottom <= bounds.bottom &&
          grid.right <= bounds.right &&
          grid.bottom <= bounds.bottom
        );
      }),
    );
    assert.ok(fit, `Tile contents overlap at ${width}px`);
    if ([390, 1280].includes(width))
      await atlas.screenshot({ path: `${shotsDir}/atlas-${width}.png` });
  }
  await area('Physics').click();
  await atlas.screenshot({ path: `${shotsDir}/atlas-physics.png` });
  assert.deepEqual(errors, []);
  await context.close();

  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  });
  const plain = await noJs.newPage();
  await plain.goto(new URL('#education', baseUrl).href);
  assert.equal(await plain.locator('[data-course-code]:visible').count(), 57);
  assert.equal(await plain.locator('[data-atlas-controls]').isVisible(), false);
  assert.equal(await plain.locator('.course-quarter-mark.is-active').count(), 61);
  assert.equal(
    await plain.locator('[data-course-code="MUSIC 181"] .course-quarter-mark.is-active').count(),
    2,
  );
  assert.equal(await plain.locator('[data-course-atlas] details').count(), 0);
  assert.ok(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await noJs.close();
  console.log(
    'PASS: simplified five-tab atlas, 57 unique courses and 61 quarter cells, compact static tiles, keyboard tabs, mobile, and no-JavaScript fallback.',
  );
} finally {
  await browser.close();
}
