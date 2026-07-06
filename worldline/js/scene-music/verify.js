import { spawn } from 'child_process';
import { chromium } from '@playwright/test';

// Start python server in the background
const server = spawn('python3', ['-m', 'http.server', '8999', '--directory', 'worldline']);

server.stderr.on('data', (data) => {
  console.log(`[Server Stderr]: ${data}`);
});

// Wait for server to start
await new Promise(resolve => setTimeout(resolve, 1500));

console.log('Launching headless browser...');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const requests = [];
page.on('request', req => {
  requests.push(req.url());
  console.log(`[Network]: ${req.method()} ${req.url()}`);
});

const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
    console.log(`[Console Error]: ${msg.text()}`);
  }
});

page.on('pageerror', err => {
  consoleErrors.push(err.message);
  console.log(`[Page Error]: ${err.message}`);
});

let testPassed = true;

try {
  console.log('Navigating to dev harness http://localhost:8999/js/scene-music/dev.html ...');
  await page.goto('http://localhost:8999/js/scene-music/dev.html');
  
  // Wait for page load and potential initial network requests
  await page.waitForTimeout(1500);
  
  console.log('\n--- VERIFY INITIAL STATE ---');
  
  // Check if peaks JSON was fetched
  const hasPeaks = requests.some(r => r.includes('fugue-peaks.json'));
  console.log(`Assert: fugue-peaks.json fetched -> ${hasPeaks ? 'PASS' : 'FAIL'}`);
  if (!hasPeaks) testPassed = false;

  // Check if audio file was NOT fetched yet
  const hasAudioInitially = requests.some(r => r.includes('fugue.m4a'));
  console.log(`Assert: fugue.m4a NOT fetched initially -> ${!hasAudioInitially ? 'PASS' : 'FAIL'}`);
  if (hasAudioInitially) testPassed = false;

  // Check console errors
  console.log(`Assert: no initial console errors -> ${consoleErrors.length === 0 ? 'PASS' : 'FAIL'}`);
  if (consoleErrors.length > 0) testPassed = false;

  console.log('\n--- TESTING PROGRESS SLIDER (p=1) ---');
  // Drag slider to 1.0 to trigger waveform drawing
  const slider = await page.$('#progress-slider');
  await slider.evaluate(el => {
    el.value = 1.0;
    el.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(500);

  // Assert canvas has content (not completely transparent blank)
  const isBlank = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== 0) return false;
    }
    return true;
  });
  console.log(`Assert: canvas is not blank at p=1 -> ${!isBlank ? 'PASS' : 'FAIL'}`);
  if (isBlank) testPassed = false;

  console.log('\n--- TESTING PLAYBACK ---');
  // Click play button to load and play audio
  const playBtn = await page.$('.agy-music-play-btn');
  await playBtn.click();
  
  // Wait to allow fetch and start playback
  await page.waitForTimeout(2500);
  
  // Verify audio is playing
  const isAudioPlaying = await page.evaluate(() => {
    const audio = document.querySelector('audio');
    return !audio.paused && audio.currentTime > 0;
  });
  console.log(`Assert: audio is playing -> ${isAudioPlaying ? 'PASS' : 'FAIL'}`);
  if (!isAudioPlaying) testPassed = false;

  // Assert audio file is now fetched
  const hasAudioNow = requests.some(r => r.includes('fugue.m4a'));
  console.log(`Assert: fugue.m4a fetched after play -> ${hasAudioNow ? 'PASS' : 'FAIL'}`);
  if (!hasAudioNow) testPassed = false;

  // Check console errors again
  console.log(`Assert: no console errors after play -> ${consoleErrors.length === 0 ? 'PASS' : 'FAIL'}`);
  if (consoleErrors.length > 0) testPassed = false;

  console.log('\n--- TESTING EXIT ---');
  // Trigger onExit() and verify it pauses audio
  await page.evaluate(() => {
    window.scene.onExit();
  });
  await page.waitForTimeout(500);

  const isPausedOnExit = await page.evaluate(() => {
    const audio = document.querySelector('audio');
    return audio.paused;
  });
  console.log(`Assert: audio paused onExit() -> ${isPausedOnExit ? 'PASS' : 'FAIL'}`);
  if (!isPausedOnExit) testPassed = false;

} catch (err) {
  console.error('Test execution failed:', err);
  testPassed = false;
} finally {
  console.log('\nCleaning up...');
  await browser.close();
  server.kill('SIGTERM');
  
  if (testPassed) {
    console.log('\n*** ALL TESTS PASSED SUCCESSFULLY! ***\n');
    process.exit(0);
  } else {
    console.log('\n*** SOME TESTS FAILED! ***\n');
    process.exit(1);
  }
}
