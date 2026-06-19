import { expect, test } from '@playwright/test';

const scenes = [
  ['galaxy', 'The Milky Way'],
  ['solar', 'The Solar System'],
  ['earth', 'Earth'],
  ['stanford', 'Stanford University'],
  ['room', 'My room'],
  ['screen', 'My computer'],
] as const;

test.describe('deep links', () => {
  for (const [route, label] of scenes) {
    test(`${route} reaches ${label}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/#/${route}`);
      await expect(page.getByText(`Now viewing: ${label}`, { exact: true })).toBeAttached();
      await expect(page.locator('.loading-overlay')).not.toHaveClass(/failed/);
    });
  }
});

test('panels, history, keyboard navigation, and terminal work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/galaxy');
  await page.getByRole('button', { name: 'AM CVn — observational photometry project' }).press('Enter');
  await expect(page.getByRole('dialog')).toContainText('AM CVn — time-series photometry');
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('ArrowUp');
  await expect(page).toHaveURL(/#\/solar$/);

  await page.goto('/#/screen');
  const terminal = page.getByLabel('terminal input');
  await expect(terminal).toBeVisible();
  await terminal.fill('cat honors.txt');
  await terminal.press('Enter');
  await expect(page.locator('.os-term-scrollback')).toContainText('National Merit Finalist');
});

test('computer mode is collision-free at the active viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await expect(page.getByLabel('terminal input')).toBeVisible();

  const layout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const node = document.querySelector(selector);
      if (!(node instanceof HTMLElement)) return null;
      const r = node.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, opacity: getComputedStyle(node).opacity };
    };
    return {
      width: innerWidth,
      height: innerHeight,
      screen: rect('.screen-ui'),
      dock: rect('.os-dock'),
      zoom: rect('.hud-zoom'),
      dots: rect('.hud-dots'),
      hint: rect('.hud-hint'),
    };
  });

  expect(layout.screen).not.toBeNull();
  expect(layout.screen!.left).toBeGreaterThanOrEqual(0);
  expect(layout.screen!.right).toBeLessThanOrEqual(layout.width);
  expect(layout.screen!.bottom).toBeLessThanOrEqual(layout.height);
  expect(layout.dock!.right).toBeLessThanOrEqual(layout.zoom!.left);
  expect(layout.dots!.opacity).toBe('0');
  expect(layout.hint!.opacity).toBe('0');
});

test('users without WebGL receive an actionable fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl2') return null;
      return original.call(this, type as never, ...(args as never[]));
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.getByText('This site is a 3D universe and needs WebGL.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Visit the plain version/ })).toHaveAttribute('href', '/about.html');
});

test('browser zoom gestures do not move the universe camera', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/galaxy');
  await page.mouse.move(200, 200);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -600);
  await page.keyboard.up('Control');
  await expect(page).toHaveURL(/#\/galaxy$/);
});

test('true-scale solar system keeps every tracked body discoverable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/solar');
  await expect(page.getByLabel('Simulation date')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.solar-overlay')).toHaveClass(/active/, { timeout: 20_000 });
  const reticles = page.locator('.planet-reticle:not([hidden])');
  await expect(reticles).toHaveCount(10);
  await expect(reticles.first()).toHaveCSS('border-radius', '50%');
  const boxes = await reticles.evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  }));
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(844);
  }
  const labels = await page.locator('.planet-reticle:not([hidden]) span').evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right };
  }));
  for (const label of labels) {
    expect(label.left).toBeGreaterThanOrEqual(0);
    expect(label.right).toBeLessThanOrEqual(390);
  }
});

test('solar reticles stay registered to the rendered orbits during pointer movement', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop pointer-parallax regression');
  await page.goto('/#/solar');
  await expect(page.locator('.solar-overlay')).toHaveClass(/active/, { timeout: 20_000 });
  const earth = page.locator('.planet-reticle[data-body="earth"]');
  await expect(earth).toBeVisible();
  await page.waitForTimeout(500);
  const before = await earth.boundingBox();
  await page.mouse.move(10, 10);
  await page.waitForTimeout(250);
  const after = await earth.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(1);
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
});

test('Earth offers explicit exploration without replacing universe navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/earth');
  await expect(page.getByRole('button', { name: 'explore Earth' })).toBeVisible();
  await expect(page).toHaveURL(/#\/earth$/);
});

test('BaileyOS windows resize with accessible controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'mobile windows intentionally use the full available width');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await expect(page.getByLabel('terminal input')).toBeVisible();
  const window = page.locator('.os-window').filter({ has: page.getByLabel('terminal input') });
  const before = await window.evaluate((node) => node.getBoundingClientRect().width);
  const handle = page.getByRole('separator', { name: 'Resize terminal — zsh' });
  await handle.press('ArrowRight');
  const after = await window.evaluate((node) => node.getBoundingClientRect().width);
  expect(after).toBeGreaterThan(before);
});
