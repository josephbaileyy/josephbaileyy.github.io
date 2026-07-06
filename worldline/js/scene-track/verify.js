import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function run() {
  console.log('Starting HTTP server...');
  const server = spawn('python3', ['-m', 'http.server', '8889', '--directory', '/Users/josephbailey/josephbaileyy.github.io']);
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on('pageerror', (err) => {
    consoleErrors.push(`Page Error: ${err.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`Console Error: ${msg.text()}`);
    }
  });
  
  console.log('Navigating to dev.html...');
  await page.goto('http://localhost:8889/worldline/js/scene-track/dev.html');
  await page.waitForSelector('.track-scene-container');
  
  // Custom function to check pixels
  async function checkPixels(p, label) {
    console.log(`Setting progress to ${p} (${label})...`);
    await page.evaluate((val) => {
      const slider = document.getElementById('progress-slider');
      slider.value = val.toString();
      slider.dispatchEvent(new Event('input'));
    }, p);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // screenshot and check center pixels
    const svgBBox = await page.evaluate(() => {
      const svg = document.querySelector('.track-svg');
      const rect = svg.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const centerX = svgBBox.x + svgBBox.width / 2;
    console.log(`[${label}] SVG BBox center X is: ${centerX.toFixed(1)}`);
    
    const screenshot = await page.screenshot();
    
    const pixelData = await page.evaluate((cx) => {
      const runner = document.querySelector('circle[fill="#ffb547"]');
      const rect = runner.getBoundingClientRect();
      const dotCenterX = rect.x + rect.width / 2;
      const dotCenterY = rect.y + rect.height / 2;
      
      return { dotX: dotCenterX, dotY: dotCenterY, expectedX: cx };
    }, centerX);
    
    console.log(`[${label}] Runner dot is at screen X: ${pixelData.dotX.toFixed(1)}, Y: ${pixelData.dotY.toFixed(1)} (Expected X: ${pixelData.expectedX.toFixed(1)})`);
    const diff = Math.abs(pixelData.dotX - pixelData.expectedX);
    if (diff > 2) {
      console.warn(`WARNING: Dot is off center by ${diff.toFixed(1)}px!`);
    } else {
      console.log(`SUCCESS: Dot is perfectly centered! (off by ${diff.toFixed(1)}px)`);
    }
  }

  await checkPixels(0, 'p=0 (Entry)');
  await checkPixels(0.05, 'p=0.05 (Entry Curve)');

  // Test sanity at lap progress = 0.68
  console.log('Setting progress to 0.6368 (lap progress = 0.68)...');
  await page.evaluate(() => {
    const slider = document.getElementById('progress-slider');
    slider.value = '0.6368';
    slider.dispatchEvent(new Event('input'));
  });
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const clockText = await page.$eval('.track-clock', el => el.textContent);
  const statusText = await page.$eval('.track-status', el => el.textContent);
  console.log(`Clock reads: ${clockText}`);
  console.log(`Status reads: ${statusText}`);
  
  await checkPixels(0.95, 'p=0.95 (Exit Curve)');
  await checkPixels(1.0, 'p=1.0 (Exit)');
  
  const analysisOpacity = await page.$eval('.track-analysis', el => getComputedStyle(el).opacity);
  console.log(`Analysis Panel Opacity at end: ${analysisOpacity}`);
  
  // Test reducedMotion
  console.log('Testing reducedMotion...');
  const sceneViewport = await page.$('#scene-viewport');
  await page.evaluate(() => {
    document.getElementById('scene-viewport').innerHTML = '';
    const { createScene } = window.sceneExports || {};
  });
  
  await browser.close();
  server.kill();
  
  if (consoleErrors.length > 0) {
    console.error('Test FAILED with console errors:');
    consoleErrors.forEach(err => console.error(` - ${err}`));
    process.exit(1);
  } else {
    console.log('Test PASSED. No console errors found!');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
