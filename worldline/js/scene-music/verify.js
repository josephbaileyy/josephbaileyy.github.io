import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function run() {
  console.log('Starting HTTP server...');
  const server = spawn('python3', ['-m', 'http.server', '8890', '--directory', '/Users/josephbailey/josephbaileyy.github.io']);
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const browser = await chromium.launch({ headless: true });
  
  async function testMode(reducedMotion) {
    const page = await browser.newPage();
    const url = `http://localhost:8890/worldline/js/scene-music/dev.html${reducedMotion ? '?reducedMotion=true' : ''}`;
    console.log(`\nNavigating to ${url}...`);
    await page.goto(url);
    
    // Wait for canvas to be injected
    await page.waitForSelector('canvas');
    // Wait a bit more for resizeObserver/peaks to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    async function getCenterPixels(yFraction) {
      return await page.evaluate((yFraction) => {
        const canvas = document.querySelector('canvas');
        const ctx = canvas.getContext('2d', {willReadFrequently: true});
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        const cx = rect.width / 2;
        const cy = rect.height * yFraction;
        
        const px = Math.floor(cx * dpr);
        const py = Math.floor(cy * dpr);
        
        const imgData = ctx.getImageData(px - 2, py, 5, 1);
        const data = imgData.data;
        const result = [];
        for (let i = 0; i < 5; i++) {
          result.push({
            xOffset: i - 2,
            r: data[i*4],
            g: data[i*4+1],
            b: data[i*4+2],
            a: data[i*4+3]
          });
        }
        return {
          width: rect.width,
          height: rect.height,
          dpr,
          pixels: result
        };
      }, yFraction);
    }
    
    async function testProgress(p, yFraction, label) {
      await page.evaluate((p) => {
        const slider = document.getElementById('progress-slider');
        slider.value = p;
        slider.dispatchEvent(new Event('input'));
      }, p);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const res = await getCenterPixels(yFraction);
      console.log(`[p=${p}] ${label} (canvas ${res.width}x${res.height}, y=${Math.round(res.height*yFraction)}):`);
      res.pixels.forEach(px => {
        console.log(`  dx=${px.xOffset}: rgba(${px.r}, ${px.g}, ${px.b}, ${px.a})`);
      });
      return res;
    }
    
    await testProgress(0, 0.05, 'Entry (top edge)');
    await testProgress(0.05, 0.05, 'Entry (top edge)');
    await testProgress(0.5, 0.05, 'Middle (top edge - should be transparent)');
    await testProgress(0.5, 0.5, 'Middle (center - should have line)');
    await testProgress(0.95, 0.95, 'Exit (bottom edge)');
    await testProgress(1, 0.95, 'Exit (bottom edge)');
    
    await page.close();
  }

  await testMode(false);
  console.log('\n--- REDUCED MOTION ---');
  await testMode(true);
  
  await browser.close();
  server.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
