import { execFile } from 'node:child_process';
import { mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../..');
const outputPath = resolve(repositoryRoot, process.argv[2] || 'v3/public/og-preview.jpg');
const sourcePath = resolve(repositoryRoot, 'v3/.og-preview@2x.png');
const pageUrl =
  process.env.OG_PAGE_URL || 'http://127.0.0.1:4173/?mode=all&lensx=0.34&lensy=0.64&event=0';

if (!outputPath.startsWith(resolve(repositoryRoot, 'v3/'))) {
  throw new Error('The OpenGraph capture output must stay inside v3/.');
}

await mkdir(dirname(outputPath), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('#event-lens[data-state="ready"]', {
    state: 'attached',
    timeout: 30_000,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: `
      html,
      body {
        width: 1200px !important;
        height: 630px !important;
        min-width: 1200px !important;
        overflow: hidden !important;
        background: var(--paper) !important;
      }

      .skip-link,
      .site-header,
      .hero-statement,
      .hero-actions,
      .specimen-caption,
      .event-lens__controls,
      .event-lens__credit,
      main > :not(.hero) {
        display: none !important;
      }

      main,
      .hero {
        width: 1200px !important;
        height: 630px !important;
        min-height: 630px !important;
        margin: 0 !important;
        overflow: hidden !important;
      }

      .hero {
        position: relative !important;
        display: grid !important;
        grid-template-columns: 600px 600px !important;
        align-items: center !important;
        gap: 0 !important;
        padding: 0 !important;
      }

      .hero::after {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 10;
        height: 7px;
        background: var(--cobalt);
        content: '';
      }

      .hero-copy {
        position: relative;
        display: flex;
        height: 630px;
        max-width: none !important;
        flex-direction: column;
        justify-content: center;
        padding: 54px 48px 48px 72px;
      }

      .hero-copy::before {
        position: absolute;
        top: 52px;
        left: 72px;
        color: var(--ink-soft);
        content: 'MACHINE LEARNING × FUNDAMENTAL PHYSICS';
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.1em;
      }

      .hero-copy::after {
        position: absolute;
        bottom: 50px;
        left: 72px;
        color: var(--ink-soft);
        content: 'CMS COLLISION EVENT · OPEN DATA RECORD 303';
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
      }

      #hero-title {
        max-width: 5.8ch !important;
        margin: 0 0 36px !important;
        color: var(--ink) !important;
        font-size: 92px !important;
        line-height: 0.82 !important;
        letter-spacing: -0.045em !important;
      }

      .hero-thesis {
        max-width: 13ch !important;
        margin: 0 !important;
        color: var(--cobalt) !important;
        font-size: 43px !important;
        line-height: 1.02 !important;
      }

      .specimen {
        position: relative;
        display: grid;
        width: 600px !important;
        height: 630px;
        max-width: none !important;
        place-items: center;
        margin: 0 !important;
        padding: 34px 34px 41px 14px;
        justify-self: stretch !important;
      }

      #event-lens {
        width: 555px !important;
        height: 555px !important;
        overflow: visible !important;
        border: 0 !important;
        contain: none !important;
        aspect-ratio: 1 !important;
      }

      .event-lens__stage {
        width: 555px !important;
        height: 555px !important;
        border: 1px solid var(--specimen-rim) !important;
        box-shadow:
          0 1px 0 rgb(255 255 255 / 8%) inset,
          0 24px 60px rgb(20 22 26 / 18%) !important;
      }

      .event-lens__readout {
        font-size: 10px !important;
      }
    `,
  });

  await page.evaluate(
    () =>
      new Promise((resolveAnimation) =>
        requestAnimationFrame(() => requestAnimationFrame(resolveAnimation)),
      ),
  );

  const captureState = await page.locator('#event-lens').getAttribute('data-state');
  const canvas = await page.locator('.event-lens__canvas').evaluate((element) => ({
    width: element.width,
    height: element.height,
  }));
  console.log(`CAPTURE_STATE=${captureState}`);
  console.log(`CANVAS_BUFFER=${canvas.width}x${canvas.height}`);

  if (captureState !== 'ready') {
    throw new Error(`Refusing to capture Event Lens state "${captureState}".`);
  }

  await page.screenshot({
    path: sourcePath,
    type: 'png',
    fullPage: false,
  });
  await context.close();
} finally {
  await browser.close();
}

const { stdout, stderr } = await execFileAsync('/opt/homebrew/bin/magick', [
  sourcePath,
  '-resize',
  '1200x630!',
  '-strip',
  '-sampling-factor',
  '4:2:0',
  '-interlace',
  'Plane',
  '-quality',
  '92',
  outputPath,
]);

if (stdout.trim()) console.log(stdout.trim());
if (stderr.trim()) console.error(stderr.trim());

await rm(sourcePath);

const result = await stat(outputPath);
console.log(`OUTPUT=${outputPath}`);
console.log(`BYTES=${result.size}`);
