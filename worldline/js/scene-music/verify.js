import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';

const repoRoot = '/Users/josephbailey/josephbaileyy.github.io';
const screenshotDir = '/tmp/worldline-music-verify';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startProcess(command, args, label) {
  const child = spawn(command, args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (data) => process.stdout.write(`[${label}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[${label}] ${data}`));
  return child;
}

async function sampleCanvas(page, x, y, radius = 2) {
  return page.evaluate(
    ({ x, y, radius }) => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const px = Math.round(x * dpr);
      const py = Math.round(y * dpr);
      const size = radius * 2 + 1;
      const data = ctx.getImageData(px - radius, py - radius, size, size).data;
      let max = { r: 0, g: 0, b: 0, a: 0, brightness: 0 };
      let alphaSum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const brightness = r + g + b;
        alphaSum += a;
        if (a > max.a || brightness > max.brightness) {
          max = { r, g, b, a, brightness };
        }
      }

      return {
        rect: { width: rect.width, height: rect.height, dpr },
        point: { x, y },
        alphaSum,
        max,
      };
    },
    { x, y, radius },
  );
}

async function canvasActivity(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    let amber = 0;

    for (let y = 0; y < canvas.height; y += Math.max(1, Math.round(4 * dpr))) {
      for (let x = 0; x < canvas.width; x += Math.max(1, Math.round(4 * dpr))) {
        const i = (y * canvas.width + x) * 4;
        const r = image[i];
        const g = image[i + 1];
        const b = image[i + 2];
        const a = image[i + 3];
        if (a > 18) lit += 1;
        if (a > 18 && r > 180 && g > 105 && b < 120) amber += 1;
      }
    }

    return { width: rect.width, height: rect.height, dpr, lit, amber };
  });
}

async function setProgress(page, progress) {
  await page.evaluate((progress) => {
    const slider = document.getElementById('progress-slider');
    slider.value = String(progress);
    slider.dispatchEvent(new Event('input'));
  }, progress);
  await wait(120);
}

async function seek(page, time) {
  await page.evaluate((time) => window.musicScene.seekTo(time), time);
  await wait(120);
}

async function screenshotCanvas(page, name) {
  const canvas = await page.$('canvas');
  const path = `${screenshotDir}/${name}.png`;
  await canvas.screenshot({ path });
  return path;
}

async function runHarnessMode(browser, reducedMotion = false) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 820 },
    deviceScaleFactor: 1,
  });
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(`Page error: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`Console error: ${msg.text()}`);
  });

  const url = `http://127.0.0.1:8890/worldline/js/scene-music/dev.html${reducedMotion ? '?reducedMotion=true' : ''}`;
  await page.goto(url);
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => window.musicScene?.getDebugState().noteCount > 0);

  const noteData = await page.evaluate(async () => {
    const res = await fetch('../../assets/audio/fugue-notes.json');
    return res.json();
  });
  const debug = await page.evaluate(() => window.musicScene.getDebugState());

  console.log(`\nHarness ${reducedMotion ? 'reducedMotion' : 'motion'}:`);
  console.log(
    `  notes=${debug.noteCount}, duration=${debug.duration.toFixed(3)}, pitch=${debug.pitchMin}..${debug.pitchMax}`,
  );

  await setProgress(page, reducedMotion ? 1 : 0.05);
  const canvasRect = await page.evaluate(() => {
    const rect = document.querySelector('canvas').getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  const centerX = canvasRect.width / 2;
  const topLine = await sampleCanvas(page, centerX, 8, 2);
  console.log(
    `  entry top sample @p=${reducedMotion ? 1 : 0.05}:`,
    topLine.max,
    `alphaSum=${topLine.alphaSum}`,
  );

  await setProgress(page, reducedMotion ? 1 : 0.95);
  const bottomLine = await sampleCanvas(page, centerX, topLine.rect.height - 8, 2);
  console.log(
    `  exit bottom sample @p=${reducedMotion ? 1 : 0.95}:`,
    bottomLine.max,
    `alphaSum=${bottomLine.alphaSum}`,
  );

  const chosenNote =
    noteData.notes.find(
      (note) => note.start > 8 && note.start < 20 && note.end - note.start > 0.16,
    ) || noteData.notes[0];
  await setProgress(page, reducedMotion ? 1 : 0.5);
  await seek(page, chosenNote.start - 1.2);
  const fallingShot = await screenshotCanvas(
    page,
    reducedMotion ? 'reduced-static' : 'falling-notes',
  );
  const fallingActivity = await canvasActivity(page);
  console.log(`  falling screenshot=${fallingShot}`);
  console.log(`  falling activity lit=${fallingActivity.lit}, amber=${fallingActivity.amber}`);

  await seek(page, chosenNote.start + 0.04);
  const hitState = await page.evaluate(() => window.musicScene.getDebugState());
  const laneX = await page.evaluate((pitch) => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const state = window.musicScene.getDebugState();
    const edge = Math.max(24, rect.width * 0.035);
    const left = rect.width / 2 + Math.max(18, rect.width * 0.02);
    const right = rect.width - edge;
    return (
      left +
      ((pitch - state.pitchMin) / Math.max(1, state.pitchMax - state.pitchMin)) * (right - left)
    );
  }, chosenNote.pitch);
  const hitGlow = await sampleCanvas(page, laneX, hitState.hitLineY - 7, 4);
  const hitShot = await screenshotCanvas(page, reducedMotion ? 'reduced-hit' : 'hit-flash');
  console.log(
    `  hit note pitch=${chosenNote.pitch}, start=${chosenNote.start}, laneX=${laneX.toFixed(1)}, sample=`,
    hitGlow.max,
    `alphaSum=${hitGlow.alphaSum}`,
  );
  console.log(`  hit screenshot=${hitShot}`);

  if (debug.noteCount !== noteData.notes.length || debug.noteCount === 0) {
    throw new Error(`Bad note count: scene=${debug.noteCount}, json=${noteData.notes.length}`);
  }
  if (fallingActivity.lit < 500) {
    throw new Error(`Canvas activity too low: ${fallingActivity.lit}`);
  }
  if (!reducedMotion && hitGlow.alphaSum < 200) {
    throw new Error(`Hit glow sample too dim: alphaSum=${hitGlow.alphaSum}`);
  }
  if (topLine.alphaSum < 200 || bottomLine.alphaSum < 200) {
    throw new Error(
      `Canonical entry/exit line sample too dim: top=${topLine.alphaSum}, bottom=${bottomLine.alphaSum}`,
    );
  }
  if (consoleErrors.length > 0) {
    throw new Error(consoleErrors.join('\n'));
  }

  await page.close();
  return {
    noteCount: debug.noteCount,
    duration: debug.duration,
    pitchMin: debug.pitchMin,
    pitchMax: debug.pitchMax,
    topLine,
    bottomLine,
    fallingActivity,
    chosenNote,
    hitGlow,
  };
}

async function runIntegrated(browser, viteUrl) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(`Page error: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`Console error: ${msg.text()}`);
  });

  await page.goto(viteUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('#chapter-music');
  await page.locator('#chapter-music').scrollIntoViewIfNeeded();
  await page.waitForSelector('#music-scene canvas');
  await wait(800);

  const info = await page.evaluate(() => {
    const canvas = document.querySelector('#music-scene canvas');
    const rect = canvas.getBoundingClientRect();
    const chapter = document.querySelector('#chapter-music');
    return {
      canvas: { width: rect.width, height: rect.height },
      scrollY: window.scrollY,
      chapterTop: chapter.getBoundingClientRect().top,
    };
  });

  console.log('\nIntegrated worldline:');
  console.log(
    `  canvas=${info.canvas.width}x${info.canvas.height}, scrollY=${info.scrollY.toFixed(1)}, chapterTop=${info.chapterTop.toFixed(1)}`,
  );
  console.log(`  consoleErrors=${consoleErrors.length}`);

  if (consoleErrors.length > 0) {
    throw new Error(consoleErrors.join('\n'));
  }

  await page.close();
  return info;
}

async function waitForViteUrl(vite) {
  let output = '';
  vite.stdout.on('data', (data) => {
    output += data.toString();
  });
  vite.stderr.on('data', (data) => {
    output += data.toString();
  });

  for (let i = 0; i < 80; i++) {
    const match = output.match(/Local:\s+(http:\/\/[^\s]+)/);
    if (match) return match[1];
    await wait(250);
  }

  throw new Error(`Vite URL not found in output:\n${output}`);
}

async function run() {
  await mkdir(screenshotDir, { recursive: true });

  const staticServer = startProcess(
    'python3',
    ['-m', 'http.server', '8890', '--directory', repoRoot],
    'static',
  );
  await wait(1200);

  const browser = await chromium.launch({ headless: true });
  let vite;

  try {
    const motion = await runHarnessMode(browser, false);
    const reduced = await runHarnessMode(browser, true);

    vite = startProcess(
      'npx',
      ['vite', '--config', 'worldline/vite.config.js', '--host', '127.0.0.1'],
      'vite',
    );
    const viteUrl = await waitForViteUrl(vite);
    await runIntegrated(browser, viteUrl);

    console.log('\nSummary:');
    console.log(
      `  JSON notes=${motion.noteCount}, duration=${motion.duration.toFixed(3)}, pitch=${motion.pitchMin}..${motion.pitchMax}`,
    );
    console.log(
      `  entry alpha=${motion.topLine.alphaSum}, exit alpha=${motion.bottomLine.alphaSum}`,
    );
    console.log(
      `  active hit alpha=${motion.hitGlow.alphaSum}, active note pitch=${motion.chosenNote.pitch}, t=${motion.chosenNote.start}`,
    );
    console.log(
      `  reducedMotion notes=${reduced.noteCount}, activity=${reduced.fallingActivity.lit}`,
    );
  } finally {
    await browser.close();
    staticServer.kill();
    if (vite) vite.kill();
  }
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
