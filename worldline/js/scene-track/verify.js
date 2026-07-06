import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function run() {
  console.log('Starting HTTP server...');
  const server = spawn('python3', ['-m', 'http.server', '8888', '--directory', '/Users/josephbailey/josephbaileyy.github.io']);
  
  // Wait a moment for server to start
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
  await page.goto('http://localhost:8888/worldline/js/scene-track/dev.html');
  
  // Wait for scene to mount
  await page.waitForSelector('.track-scene-container');
  
  // Test sanity at p = 0.6716 (which corresponds to lap progress = 0.68)
  console.log('Setting progress to 0.6716 (lap progress = 0.68)...');
  await page.evaluate(() => {
    const slider = document.getElementById('progress-slider');
    slider.value = '0.6716';
    slider.dispatchEvent(new Event('input'));
  });
  
  // Wait a short bit for rendering/updates
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Check clock value
  const clockText = await page.$eval('.track-clock', el => el.textContent);
  const statusText = await page.$eval('.track-status', el => el.textContent);
  
  console.log(`Clock reads: ${clockText}`);
  console.log(`Status reads: ${statusText}`);
  
  // Check splits visibility
  const splitsOpacity = await page.evaluate(() => {
    const splits = document.querySelectorAll('.track-splits text');
    // return an array of texts and opacities
    return Array.from(splits).map(el => ({
      text: el.textContent,
      opacity: el.getAttribute('opacity')
    }));
  });
  
  console.log('Splits State:');
  splitsOpacity.forEach(s => {
    if (parseFloat(s.opacity) > 0) {
      console.log(`  ${s.text}: opacity ${s.opacity}`);
    }
  });
  
  // Test end state
  console.log('Setting progress to 1.0 (finish state)...');
  await page.evaluate(() => {
    const slider = document.getElementById('progress-slider');
    slider.value = '1.0';
    slider.dispatchEvent(new Event('input'));
  });
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const endClockText = await page.$eval('.track-clock', el => el.textContent);
  const endStatusText = await page.$eval('.track-status', el => el.textContent);
  const analysisOpacity = await page.$eval('.track-analysis', el => getComputedStyle(el).opacity);
  
  console.log(`End Clock reads: ${endClockText}`);
  console.log(`End Status reads: ${endStatusText}`);
  console.log(`Analysis Panel Opacity: ${analysisOpacity}`);
  
  // Cleanup
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
