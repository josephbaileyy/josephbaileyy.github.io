import { expect, test } from '@playwright/test';

const scenes = ['stanford', 'room', 'screen'] as const;

for (const scene of scenes) {
  test(`visual contract: ${scene}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'desktop visual baselines');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/#/${scene}`);
    await expect(page.locator('.loading-overlay')).not.toHaveClass(/failed/);
    await expect(
      page.getByText(
        `Now viewing: ${scene === 'stanford' ? 'Stanford University' : scene === 'room' ? 'My room' : 'My computer'}`,
        { exact: true },
      ),
    ).toBeAttached();
    if (scene === 'screen') {
      await expect(page.getByLabel('terminal input')).toBeVisible();
      await page.locator('.os-menubar > span').evaluateAll((nodes) => {
        nodes.forEach((node) => {
          (node as HTMLElement).style.visibility = 'hidden';
        });
      });
    }
    await expect(page).toHaveScreenshot(`${scene}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.04,
    });
  });
}

test('visual contract: galaxy landing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'desktop landing baseline');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/galaxy');
  await expect(page.getByRole('button', { name: 'Research', exact: true })).toBeVisible();
  await expect(page.locator('.loading-overlay')).toHaveClass(/done/);
  await expect(page).toHaveScreenshot('galaxy-landing.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.04,
  });
});

test('visual contract: quick portfolio desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'desktop portfolio baseline');
  await page.goto('/about.html');
  await expect(page.getByRole('heading', { name: 'Current work' })).toBeVisible();
  await expect(page).toHaveScreenshot('quick-portfolio.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.08,
  });
});

test('visual contract: quick portfolio mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile portfolio baseline');
  await page.goto('/about.html');
  await expect(page.getByRole('heading', { name: 'Current work' })).toBeVisible();
  await expect(page).toHaveScreenshot('quick-portfolio-mobile.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.15,
  });
});

test('visual contract: BaileyOS mobile launcher', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile BaileyOS baseline');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await expect(page.locator('.os-mobile-home')).toBeVisible();
  await expect(page.locator('.os-mobile-dock-item')).toHaveCount(4);
  await expect(page).toHaveScreenshot('baileyos-mobile.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.12,
  });
});
