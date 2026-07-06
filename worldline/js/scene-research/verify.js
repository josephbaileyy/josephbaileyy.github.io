import { chromium } from 'playwright';
import { spawn } from 'child_process';

const REPO = '/Users/josephbailey/josephbaileyy.github.io';
const HTTP_PORT = 8888;
const VITE_PORT = 5174;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return true;
    } catch {
      // not up yet
    }
    await sleep(300);
  }
  return false;
}

// Runs in the browser: locate the main (worldline) canvas and sample the
// brightest pixel in a small horizontal window around center, across a set of
// css y rows. Returns, per row, the offset from center (css px) and rgba/luma.
function sampleInPage(edge) {
  const canvases = Array.from(document.querySelectorAll('#stage canvas'));
  const canvas = canvases.find((c) => c.style.height === '100%') || canvases[canvases.length - 1];
  if (!canvas) return { error: 'no canvas' };
  const ctx = canvas.getContext('2d');
  const dprX = canvas.width / canvas.clientWidth;
  const dprY = canvas.height / canvas.clientHeight;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const cxDev = Math.round((cssW / 2) * dprX);
  const halfWin = Math.ceil(8 * dprX); // scan +-8 css px

  const rowsCss = edge === 'top' ? [4, 12, 22, 34] : [cssH - 4, cssH - 14, cssH - 26, cssH - 38];
  const out = [];

  for (const cssY of rowsCss) {
    const devY = Math.min(canvas.height - 1, Math.max(0, Math.round(cssY * dprY)));
    const startX = Math.max(0, cxDev - halfWin);
    const wDev = Math.min(canvas.width - startX, halfWin * 2 + 1);
    const img = ctx.getImageData(startX, devY, wDev, 1).data;

    let best = { luma: -1, r: 0, g: 0, b: 0, a: 0, devX: cxDev };
    for (let i = 0; i < wDev; i += 1) {
      const r = img[i * 4];
      const g = img[i * 4 + 1];
      const b = img[i * 4 + 2];
      const a = img[i * 4 + 3];
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) * (a / 255);
      if (luma > best.luma) {
        best = { luma, r, g, b, a, devX: startX + i };
      }
    }
    const offsetCss = (best.devX - cxDev) / dprX;
    out.push({
      cssY: Math.round(cssY),
      offsetCss: Number(offsetCss.toFixed(2)),
      rgba: [best.r, best.g, best.b, best.a],
      luma: Number(best.luma.toFixed(1)),
    });
  }

  return { cssW, cssH, dpr: Number(dprX.toFixed(2)), rows: out };
}

async function setProgress(page, p) {
  await page.evaluate((val) => {
    const slider = document.getElementById('progress');
    slider.value = String(Math.round(val * 1000));
    slider.dispatchEvent(new Event('input'));
  }, p);
  await sleep(120); // let a RAF frame paint
}

async function setReduced(page, on) {
  await page.evaluate((checked) => {
    const box = document.getElementById('reduced');
    box.checked = checked;
    box.dispatchEvent(new Event('change'));
  }, on);
  await sleep(150);
}

function summarize(label, sample) {
  console.log(`  ${label}: dpr=${sample.dpr} cssW=${sample.cssW} cssH=${sample.cssH}`);
  sample.rows.forEach((r) => {
    console.log(
      `     y=${r.cssY}  x-offset=${r.offsetCss}px  rgba=[${r.rgba.join(',')}]  luma=${r.luma}`,
    );
  });
}

// Entry/exit pass if a luminous, near-center pixel exists on the row closest to the edge.
function edgePasses(sample) {
  const near = sample.rows[0];
  return Math.abs(near.offsetCss) <= 2 && near.luma >= 40 && near.rgba[3] >= 120;
}

async function run() {
  const results = { pass: true, notes: [] };

  console.log('== Starting python http.server ==');
  const httpServer = spawn('python3', ['-m', 'http.server', String(HTTP_PORT), '--directory', REPO], {
    stdio: 'ignore',
  });
  await waitForServer(`http://localhost:${HTTP_PORT}/worldline/js/scene-research/dev.html`);

  const browser = await chromium.launch({ headless: true });

  // ---- 1. Isolated dev.html pixel sampling (motion on) ----
  console.log('\n== Isolated dev.html — motion mode ==');
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const devErrors = [];
  page.on('pageerror', (e) => devErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && devErrors.push(`console.error: ${m.text()}`));

  await page.goto(`http://localhost:${HTTP_PORT}/worldline/js/scene-research/dev.html`);
  await page.waitForSelector('#stage canvas');
  await sleep(300);

  const entrySamples = {};
  const exitSamples = {};

  for (const p of [0, 0.05, 0.5, 0.95, 1]) {
    await setProgress(page, p);
    const top = await page.evaluate(sampleInPage, 'top');
    const bottom = await page.evaluate(sampleInPage, 'bottom');
    entrySamples[p] = top;
    exitSamples[p] = bottom;
    console.log(`\n p = ${p}`);
    summarize('TOP  ', top);
    summarize('BOT  ', bottom);
  }

  console.log('\n== Entry/exit assertions (motion) ==');
  const entryOk0 = edgePasses(entrySamples[0]);
  const entryOk05 = edgePasses(entrySamples[0.05]);
  const exitOk95 = edgePasses(exitSamples[0.95]);
  const exitOk1 = edgePasses(exitSamples[1]);
  console.log(`  entry p=0    -> ${entryOk0}`);
  console.log(`  entry p=0.05 -> ${entryOk05}`);
  console.log(`  exit  p=0.95 -> ${exitOk95}`);
  console.log(`  exit  p=1    -> ${exitOk1}`);
  if (!(entryOk0 && entryOk05 && exitOk95 && exitOk1)) {
    results.pass = false;
    results.notes.push('Entry/exit pixel assertion failed (motion mode).');
  }

  // ---- 2. Reduced motion static end-state ----
  console.log('\n== Reduced motion ==');
  await setReduced(page, true);
  await setProgress(page, 1);
  const rmBottom = await page.evaluate(sampleInPage, 'bottom');
  await setProgress(page, 0);
  const rmTop = await page.evaluate(sampleInPage, 'top');
  summarize('RM p=1 BOT', rmBottom);
  summarize('RM p=0 TOP', rmTop);
  const rmOk = edgePasses(rmBottom) && edgePasses(rmTop);
  console.log(`  reduced-motion entry+exit -> ${rmOk}`);
  if (!rmOk) {
    results.pass = false;
    results.notes.push('Reduced-motion static state assertion failed.');
  }

  if (devErrors.length) {
    results.pass = false;
    results.notes.push(`dev.html console errors: ${devErrors.join(' | ')}`);
  } else {
    console.log('  dev.html console: clean');
  }
  await page.close();

  // ---- 3. Full integrated page via vite ----
  console.log('\n== Full integrated worldline/index.html (vite) ==');
  const vite = spawn('npx', ['vite', '--port', String(VITE_PORT), '--strictPort', 'false'], {
    cwd: `${REPO}/worldline`,
    stdio: 'ignore',
  });
  const viteUp = await waitForServer(`http://127.0.0.1:${VITE_PORT}/`);
  if (!viteUp) {
    results.notes.push('vite server did not come up; skipped integrated check.');
  } else {
    const ip = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors = [];
    ip.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`));
    ip.on('console', (m) => m.type() === 'error' && pageErrors.push(`console.error: ${m.text()}`));
    await ip.goto(`http://127.0.0.1:${VITE_PORT}/`, { waitUntil: 'load' });
    await sleep(1200);
    // Scroll to the research chapter's rough position.
    await ip.evaluate(() => {
      const el = document.querySelector('#chapter-research');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await sleep(400);
    await ip.evaluate(() => window.scrollBy(0, window.innerHeight * 1.2));
    await sleep(800);
    console.log(`  integrated console errors: ${pageErrors.length}`);
    pageErrors.forEach((e) => console.log(`     - ${e}`));
    if (pageErrors.length) {
      results.pass = false;
      results.notes.push(`Integrated page console errors: ${pageErrors.join(' | ')}`);
    }
    await ip.close();
  }

  await browser.close();
  httpServer.kill();
  vite.kill();

  console.log('\n==============================');
  console.log(results.pass ? 'VERIFY PASSED' : 'VERIFY FAILED');
  results.notes.forEach((n) => console.log(` note: ${n}`));
  process.exit(results.pass ? 0 : 1);
}

run().catch((err) => {
  console.error('verify.js crashed:', err);
  process.exit(2);
});
