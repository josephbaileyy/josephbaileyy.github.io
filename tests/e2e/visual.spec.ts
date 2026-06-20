import { expect, test } from '@playwright/test';

const scenes = ['stanford', 'room', 'screen'] as const;

for (const scene of scenes) {
  test(`visual contract: ${scene}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop visual baselines');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/#/${scene}`);
    await expect(page.locator('.loading-overlay')).not.toHaveClass(/failed/);
    await expect(page.getByText(`Now viewing: ${scene === 'stanford' ? 'Stanford University' : scene === 'room' ? 'My room' : 'My computer'}`, { exact: true })).toBeAttached();
    if (scene === 'screen') {
      await expect(page.getByLabel('terminal input')).toBeVisible();
      await page.locator('.os-menubar > span').evaluateAll((nodes) => {
        nodes.forEach((node) => { (node as HTMLElement).style.visibility = 'hidden'; });
      });
    }
    await expect(page).toHaveScreenshot(`${scene}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.04,
    });
  });
}
