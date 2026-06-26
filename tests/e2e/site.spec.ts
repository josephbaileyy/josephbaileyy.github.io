import { expect, test } from '@playwright/test';

const isMobileProject = (name: string): boolean => name.includes('mobile');

const openTerminal = async (page: import('@playwright/test').Page, projectName: string) => {
  if (isMobileProject(projectName)) {
    await page.locator('.os-mobile-dock-item[data-app-id="terminal"]').click();
  } else {
    await page.locator('.os-dock-item[data-app-id="terminal"]').click();
  }
  await expect(page.getByLabel('terminal input')).toBeVisible();
};

const closeStartHere = async (page: import('@playwright/test').Page) => {
  const close = page.getByLabel('Close Start Here — mission dashboard');
  await close.waitFor({ state: 'visible', timeout: 2500 }).catch(() => undefined);
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await expect(page.locator('.os-window[data-window-id="start"]')).toHaveCount(0);
  }
};

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
test('panels, history, keyboard navigation, and terminal work', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/galaxy');
  await page
    .getByRole('button', { name: 'AM CVn — observational photometry project' })
    .press('Enter');
  await expect(page.getByRole('dialog')).toContainText('AM CVn — time-series photometry');
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.goForward();
  await expect(page.getByRole('dialog')).toContainText('AM CVn — time-series photometry');
  await page.goBack();

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('ArrowUp');
  await expect(page).toHaveURL(/#\/solar$/);

  await page.goto('/#/screen');
  await openTerminal(page, testInfo.project.name);
  const terminal = page.getByLabel('terminal input');
  await expect(terminal).toBeVisible();
  await terminal.fill('cat honors.txt');
  await terminal.press('Enter');
  await expect(page.locator('.os-term-scrollback')).toContainText('National Merit Finalist');
});

test('the guided journey autopilots from the galaxy down to the computer', async ({ page }) => {
  test.setTimeout(70_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await page.getByRole('button', { name: /Take the guided journey/ }).click();
  const caption = page.locator('.tour-caption');
  // The tour engages (per-scene caption text rotates too fast to assert on; the
  // sequencer's caption content is covered deterministically in tests/tour.test.ts).
  await expect(caption).toHaveClass(/\bon\b/);

  // The autopilot advances on its own through every scale and lands at the desk.
  await expect(page).toHaveURL(/#\/screen$/, { timeout: 50_000 });
  // Arrival ends the tour: the caption is dismissed.
  await expect(caption).not.toHaveClass(/\bon\b/);
});

test('guided journey can pause and resume accessibly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Take the guided journey/ }).click();
  const pause = page.getByRole('button', { name: 'Pause guided journey' });
  await pause.click();
  await expect(page.getByRole('button', { name: 'Resume guided journey' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Resume guided journey' }).click();
  await expect(page.getByRole('button', { name: 'Pause guided journey' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByRole('link', { name: /skip to portfolio/ })).toHaveAttribute(
    'href',
    '/about.html',
  );
});

test('credential shortcuts expose research, CV, and contact immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/galaxy');
  const research = page.getByRole('button', { name: 'Research', exact: true });
  await research.focus();
  await research.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('Neutrino cross-section unfolding');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(research).toBeFocused();
  await expect(page.getByRole('link', { name: 'CV', exact: true })).toHaveAttribute(
    'href',
    '/resume.pdf',
  );
  await expect(page.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute(
    'href',
    'mailto:jrbailey555@gmail.com',
  );
});

test('opening credentials cancels a stale guided journey', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /Take the guided journey/ }).click();
  await expect(page.locator('.tour-caption')).toHaveClass(/\bon\b/);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(page.locator('.tour-caption')).not.toHaveClass(/\bon\b/);
});

test('manual navigation cancels the guided journey', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await page.getByRole('button', { name: /Take the guided journey/ }).click();
  const caption = page.locator('.tour-caption');
  await expect(caption).toHaveClass(/\bon\b/);

  // A manual keypress must immediately bail out of the tour.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('ArrowDown');
  await expect(caption).not.toHaveClass(/\bon\b/);
  await expect(page.getByRole('button', { name: /Take the guided journey/ })).toBeVisible();
});

test('the terminal `tour` command launches the guided journey', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await openTerminal(page, testInfo.project.name);
  const terminal = page.getByLabel('terminal input');
  await expect(terminal).toBeVisible();
  await terminal.fill('tour');
  await terminal.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.tour-caption')).toHaveClass(/\bon\b/);
});

test('the dock journey icon replays the guided journey from the desktop', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  if (isMobileProject(testInfo.project.name)) {
    await page.locator('.os-mobile-app[data-app-id="journey"]').click();
  } else {
    await page.locator('.os-dock-item').filter({ hasText: 'journey' }).click();
  }
  await expect(page.locator('.tour-caption')).toHaveClass(/\bon\b/);
});

test('BaileyOS keeps projects on the desktop and videos in the dock', async ({
  page,
}, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'desktop launcher contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await expect(page.locator('.os-window').filter({ hasText: 'Start Here' })).toBeVisible();

  await expect(page.locator('.os-dock-item').filter({ hasText: 'league' })).toHaveCount(0);
  await expect(page.locator('.os-dock-item').filter({ hasText: 'SPLoRA' })).toHaveCount(0);
  await expect(page.locator('.os-desktop-icon')).toHaveCount(5);
  await expect(
    page.locator('.os-desktop-icon').filter({ hasText: 'league' }).locator('img'),
  ).toHaveAttribute('src', '/icons/league-of-legends.png');

  await closeStartHere(page);
  await page.locator('.os-desktop-icon').filter({ hasText: 'SPLoRA' }).click();
  const featuredProject = page
    .locator('.os-window')
    .filter({ hasText: '0.888 development accuracy' });
  await expect(featuredProject).toContainText('Signal');
  await expect(featuredProject).toContainText('Evidence');
  await page.getByLabel('Close SPLoRA — project').click();
  await page.locator('.os-desktop-icon').filter({ hasText: 'league' }).click();
  await expect(page.locator('.os-window').filter({ hasText: 'League of Legends' })).toBeVisible();

  await page.locator('.os-dock-item').filter({ hasText: 'videos' }).click();
  const videos = page.locator('.os-window').filter({ hasText: 'Performance reel' });
  await expect(videos.getByRole('link')).toHaveCount(4);
  await expect(videos).toContainText('WBA Grand Champion');
  await expect(
    videos.locator('.os-video-achievement').filter({ hasText: 'WBA Grand Champion' }),
  ).toHaveCount(3);
  await expect(videos).toContainText('WGI World Silver');
});

test('project PDFs open inside BaileyOS with tab/download options', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  if (isMobileProject(testInfo.project.name)) {
    await page.locator('.os-mobile-app[data-app-id="project:league"]').click();
  } else {
    await closeStartHere(page);
    await page.locator('.os-desktop-icon').filter({ hasText: 'league' }).click();
  }
  const projectWindow = page.locator('.os-window').filter({ hasText: 'League of Legends' });
  await projectWindow.getByRole('button', { name: 'Report (PDF)' }).click();

  await expect(page.locator('iframe.os-pdf-frame')).toHaveAttribute('src', /lol-report\.pdf/);
  await expect(page.getByRole('link', { name: /open in new tab/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /download/ })).toBeVisible();
});

test('the galaxy black hole dives down to BaileyOS', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/galaxy');
  await page.getByRole('button', { name: /Dive to my computer/ }).click();
  await expect(page).toHaveURL(/#\/screen$/, { timeout: 30_000 });
});

test('computer mode is collision-free at the active viewport', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'desktop HUD collision contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await expect(page.locator('.os-window').filter({ hasText: 'Start Here' })).toBeVisible();

  const layout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const node = document.querySelector(selector);
      if (!(node instanceof HTMLElement)) return null;
      const r = node.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        opacity: getComputedStyle(node).opacity,
      };
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
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl2') return null;
      return original.call(this, type as never, ...(args as never[]));
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.getByText('This site is a 3D universe and needs WebGL.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Open the quick portfolio/ })).toHaveAttribute(
    'href',
    '/about.html',
  );
});

test('browser zoom gestures do not move the universe camera', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'wheel gesture contract is desktop-only');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/galaxy');
  await page.mouse.move(200, 200);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -600);
  await page.keyboard.up('Control');
  await expect(page).toHaveURL(/#\/galaxy$/);
});

test('mobile tap controls navigate without requiring pinch or hover', async ({
  page,
}, testInfo) => {
  test.skip(!isMobileProject(testInfo.project.name), 'mobile touch affordance');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/galaxy');

  await page.getByRole('button', { name: 'Travel inward one level' }).click();
  await expect(page).toHaveURL(/#\/solar$/, { timeout: 20_000 });

  await page.getByRole('button', { name: 'Travel outward one level' }).click();
  await expect(page).toHaveURL(/#\/galaxy$/, { timeout: 20_000 });
});

test('mobile secondary tools are collapsed until requested', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo.project.name), 'mobile tools contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/galaxy');
  const tools = page.getByRole('button', { name: 'tools', exact: true });
  await expect(tools).toHaveAttribute('aria-expanded', 'false');
  await tools.click();
  await expect(tools).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Toggle ambient space audio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle Solar System scale mode' })).toBeHidden();
});

test('quick portfolio provides current-work navigation and experience', async ({ page }) => {
  await page.goto('/about.html');
  await expect(page.getByRole('navigation', { name: 'Portfolio sections' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current work' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Explore by scale' })).toBeVisible();
  await expect(page.locator('#scale')).toContainText('The Milky Way');
  await expect(page.locator('#scale')).toContainText('BaileyOS');
  const experience = page.locator('#experience');
  await expect(
    experience.getByRole('heading', { name: /WisdomTree Digital Movement/ }),
  ).toBeVisible();
  await expect(
    experience.getByRole('heading', { name: /Engineering Intern — Polytec/ }),
  ).toBeVisible();
  const projects = page.locator('#projects');
  await expect(projects.locator('.card.featured')).toHaveCount(4);
  await expect(projects).toContainText('Signal');
  await expect(projects).toContainText('Evidence');
  await expect(projects).toContainText('TypeScript · Three.js · WebGL');
  await expect(page.locator('script[type="application/ld+json"]')).not.toContainText('alumniOf');
});

test('true-scale solar system keeps every tracked body discoverable on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/solar');
  await expect(page.getByLabel('Simulation date')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.solar-overlay')).toHaveClass(/active/, { timeout: 20_000 });
  const reticles = page.locator('.planet-reticle:not([hidden])');
  await expect(reticles).toHaveCount(10);
  await expect(reticles.first()).toHaveCSS('border-radius', '50%');
  const boxes = await reticles.evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    }),
  );
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(844);
  }
  const labels = await page.locator('.planet-reticle:not([hidden]) span').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right };
    }),
  );
  for (const label of labels) {
    expect(label.left).toBeGreaterThanOrEqual(0);
    expect(label.right).toBeLessThanOrEqual(390);
  }
});

test('immersive HUD controls toggle scale, drift, and the observation log', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/solar');
  if (isMobileProject(testInfo.project.name)) {
    await page.getByRole('button', { name: 'tools', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Toggle Solar System scale mode' })).toBeVisible({
    timeout: 20_000,
  });
  const solarOverlay = page.locator('.solar-overlay');
  await expect(solarOverlay).toHaveAttribute('data-scale-mode', 'cinematic', { timeout: 20_000 });
  const mercury = page.locator('.planet-reticle[data-body="mercury"]');
  await expect
    .poll(() => mercury.evaluate((node) => getComputedStyle(node, '::before').opacity))
    .toBe('0');
  const reticleMotion = await mercury.evaluate((node) => {
    const style = getComputedStyle(node);
    return { property: style.transitionProperty, duration: style.transitionDuration };
  });
  expect(reticleMotion.property).not.toContain('transform');

  const journey = page.getByRole('button', {
    name: 'Take the guided journey from the galaxy to my desk',
  });
  const controls = page.locator('.solar-controls');
  const [journeyBox, controlsBox] = await Promise.all([
    journey.boundingBox(),
    controls.boundingBox(),
  ]);
  expect(journeyBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();
  expect(
    journeyBox!.x + journeyBox!.width <= controlsBox!.x ||
      journeyBox!.x >= controlsBox!.x + controlsBox!.width ||
      journeyBox!.y + journeyBox!.height <= controlsBox!.y ||
      journeyBox!.y >= controlsBox!.y + controlsBox!.height,
  ).toBe(true);

  await page.getByRole('button', { name: 'Toggle Solar System scale mode' }).click();
  await expect(page.getByRole('button', { name: 'Toggle Solar System scale mode' })).toContainText(
    'scale: real',
  );
  await expect(page.getByText('JPL DE440 · UTC · real scale')).toBeAttached();
  await expect(solarOverlay).toHaveAttribute('data-scale-mode', 'real');
  await expect
    .poll(() => mercury.evaluate((node) => getComputedStyle(node, '::before').opacity))
    .toBe('1');

  await page.getByRole('button', { name: 'Toggle free drift camera mode' }).click();
  await expect(page.getByRole('button', { name: 'Toggle free drift camera mode' })).toContainText(
    'drift: on',
  );

  await page.getByRole('button', { name: 'Open field log' }).click();
  await expect(page.locator('.observation-log.open')).toContainText('The Solar System');
  await page.getByRole('button', { name: 'Continue to Earth →' }).click();
  await expect(page).toHaveURL(/#\/earth$/);
});

test('stage navigation stays pixel-aligned for Safari', async ({ page }) => {
  await page.goto('/#/solar');
  const dot = page.getByRole('button', { name: 'Go to The Solar System' });
  await expect(dot).toBeVisible({ timeout: 20_000 });
  const style = await dot.evaluate((node) => {
    const computed = getComputedStyle(node);
    const parent = getComputedStyle(node.parentElement!);
    return {
      borderWidth: computed.borderTopWidth,
      transform: parent.transform,
    };
  });
  expect(style.borderWidth).toBe('2px');
  expect(style.transform).toBe('none');
});

test('solar reticles stay registered to the rendered orbits during pointer movement', async ({
  page,
}, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'desktop pointer-parallax regression');
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

test('solar focus mode expands inner orbits and keeps Earth travel explicit', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/solar');
  await expect(page.locator('.solar-overlay')).toHaveClass(/active/, { timeout: 20_000 });
  const sun = page.locator('.planet-reticle[data-body="sun"]');
  const earth = page.locator('.planet-reticle[data-body="earth"]');
  const distance = async () => {
    const [a, b] = await Promise.all([sun.boundingBox(), earth.boundingBox()]);
    return Math.hypot(a!.x - b!.x, a!.y - b!.y);
  };
  const overviewDistance = await distance();
  const moon = page.locator('.planet-reticle[data-body="moon"]');
  await earth.click();
  await expect(earth).toHaveClass(/selected/);
  await expect(earth).toBeVisible();
  const [earthZ, moonZ, earthBackground] = await Promise.all([
    earth.evaluate((node) => Number(getComputedStyle(node).zIndex)),
    moon.evaluate((node) => Number(getComputedStyle(node).zIndex)),
    earth.evaluate((node) => getComputedStyle(node, '::before').backgroundImage),
  ]);
  expect(earthZ).toBeGreaterThan(moonZ);
  expect(earthBackground).toBe('none');
  await expect
    .poll(() => earth.evaluate((node) => getComputedStyle(node, '::before').opacity))
    .toBe('1');
  await expect(page.getByRole('button', { name: 'visit Earth', exact: true })).toBeVisible();
  if (testInfo.project.name === 'chromium') {
    await expect.poll(distance).toBeGreaterThan(overviewDistance * 3);
  }
  await page.getByRole('button', { name: 'visit Earth', exact: true }).click();
  await expect(page).toHaveURL(/#\/earth$/);
});

test('solar UI is removed when returning to the Milky Way', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/solar');
  const overlay = page.locator('.solar-overlay');
  await expect(overlay).toHaveClass(/active/, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Go to The Milky Way' }).click();
  await expect(page).toHaveURL(/#\/galaxy$/);
  await expect(overlay).not.toHaveClass(/active/);
});

test('Earth offers explicit exploration without replacing universe navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/earth');
  await expect(page.getByRole('button', { name: 'explore Earth' })).toBeVisible();
  await expect(page).toHaveURL(/#\/earth$/);
});

test('BaileyOS windows resize with accessible controls', async ({ page }, testInfo) => {
  test.skip(
    isMobileProject(testInfo.project.name),
    'mobile windows intentionally use the full available width',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await openTerminal(page, testInfo.project.name);
  const window = page.locator('.os-window').filter({ has: page.getByLabel('terminal input') });
  const before = await window.evaluate((node) => node.getBoundingClientRect().width);
  const handle = page.getByRole('separator', { name: 'Resize terminal — zsh' });
  await handle.press('ArrowRight');
  const after = await window.evaluate((node) => node.getBoundingClientRect().width);
  expect(after).toBeGreaterThan(before);
  await page.getByLabel('Maximize terminal — zsh').click();
  await expect(window).toHaveClass(/maximized/);
  await page.getByLabel('Restore terminal — zsh').click();
  await page.getByLabel('Minimize terminal — zsh').click();
  await expect(window).toHaveClass(/minimized/);
  await page.locator('.os-dock-item').filter({ hasText: 'terminal' }).click();
  await expect(window).not.toHaveClass(/minimized/);
});

test('BaileyOS terminal activation keeps every window control cluster reachable', async ({
  page,
}, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'desktop window cascade contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await closeStartHere(page);
  for (const app of ['research', 'experience', 'about']) {
    await page.locator(`.os-dock-item[data-app-id="${app === 'about' ? 'profile' : app}"]`).click();
  }
  const terminalDock = page.locator('.os-dock-item[data-app-id="terminal"]');
  await terminalDock.click();
  await expect(terminalDock).toHaveAttribute('aria-pressed', 'true');
  await expect(terminalDock).toHaveAttribute('aria-label', /active/);

  const reachable = await page.locator('.os-window').evaluateAll((windows) =>
    windows.map((window) => {
      const control = window.querySelector<HTMLButtonElement>('.os-window-controls button');
      if (!control) return false;
      const box = control.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return top === control || control.contains(top);
    }),
  );
  expect(reachable.every(Boolean)).toBe(true);

  await page.getByRole('button', { name: 'Arrange BaileyOS windows' }).click();
  await expect(page.locator('.os-window.active')).toHaveCount(1);
});

test('opening Terminal does not move existing BaileyOS geometry', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'desktop geometry contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await closeStartHere(page);
  for (const appId of ['research', 'experience', 'profile']) {
    await page.locator(`.os-dock-item[data-app-id="${appId}"]`).click();
  }
  const measure = () =>
    page.evaluate(() => {
      const box = (node: Element) => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      };
      return {
        screen: box(document.querySelector('.screen-ui')!),
        icons: box(document.querySelector('.os-desktop-icons')!),
        windows: [...document.querySelectorAll<HTMLElement>('.os-window')]
          .map((window) => ({ id: window.dataset.windowId, ...box(window) }))
          .sort((a, b) => String(a.id).localeCompare(String(b.id))),
      };
    });
  const before = await measure();
  await page.locator('.os-dock-item[data-app-id="terminal"]').click();
  const after = await measure();
  expect(after.screen).toEqual(before.screen);
  expect(after.icons).toEqual(before.icons);
  expect(after.windows.filter((window) => window.id !== 'terminal')).toEqual(before.windows);
});

test('BaileyOS dock reports open and minimized app state', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'desktop dock state contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await openTerminal(page, testInfo.project.name);
  const terminalDock = page.locator('.os-dock-item[data-app-id="terminal"]');
  await expect(terminalDock).toHaveClass(/open/);
  await page.getByLabel('Minimize terminal — zsh').click();
  await expect(terminalDock).toHaveClass(/minimized/);
  await expect(terminalDock).toHaveAttribute('aria-label', /minimized/);
  await terminalDock.click();
  await expect(page.locator('.os-window.active')).toHaveAttribute('data-window-id', 'terminal');
  await expect(terminalDock).toHaveAttribute('aria-label', /active/);
});

test('BaileyOS starts with dashboard and Command-K opens searchable actions', async ({
  page,
}, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'desktop command palette contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  const start = page.locator('.os-window').filter({ hasText: 'Start Here' });
  await expect(start).toBeVisible();
  await expect(start).toContainText('Featured work');
  await expect(start).toContainText('Scene progress');
  const startDock = page.locator('.os-dock-item[data-app-id="start"]');
  await expect(startDock).toHaveClass(/open/);

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await expect(page.getByRole('dialog', { name: 'BaileyOS command palette' })).toBeVisible();
  await page.getByLabel('Search BaileyOS commands').fill('field');
  await page
    .getByRole('dialog', { name: 'BaileyOS command palette' })
    .getByRole('button', { name: /Field Log mission progress/ })
    .click();
  await expect(page.locator('.os-window').filter({ hasText: 'Mission Report' })).toBeVisible();
});

test('BaileyOS keeps one active app window on mobile', async ({ page }, testInfo) => {
  test.skip(!isMobileProject(testInfo.project.name), 'mobile window-management contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await expect(page.locator('.os-mobile-home')).toBeVisible();
  await expect(page.getByLabel('terminal input')).toHaveCount(0);
  await expect(page.locator('.os-mobile-app')).toHaveCount(17);
  await expect(page.locator('.os-mobile-app').first()).toHaveAttribute('data-app-id', 'start');
  await expect(page.locator('.os-mobile-dock-item')).toHaveCount(4);

  await page.locator('.os-mobile-dock-item[data-app-id="terminal"]').click();
  await expect(page.getByLabel('terminal input')).toBeVisible();
  await page.waitForTimeout(450);
  await expect(page.getByLabel('terminal input')).not.toBeFocused();
  await expect(page.getByLabel('terminal input')).toHaveCSS('font-size', '16px');
  await expect(page.locator('.fake-os')).toHaveCSS(
    'font-family',
    /(-apple-system|BlinkMacSystemFont|SF Pro)/,
  );
  await expect(page.locator('.os-window:not(.mobile-inactive)')).toHaveCount(1);
  await expect(page.getByLabel('Minimize terminal — zsh')).toBeHidden();
  await expect(page.getByLabel('Maximize terminal — zsh')).toBeHidden();

  await page.getByLabel('Close terminal — zsh').click();
  await expect(page.locator('.os-mobile-home')).toBeVisible();
  await page.locator('.os-mobile-app[data-app-id="research"]').click();
  await expect(page.locator('.os-window:not(.mobile-inactive)')).toContainText('research.md');
  await expect(page.locator('.fake-os')).toHaveClass(/app-open/);
});

test('BaileyOS video dock icon is vertically aligned', async ({ page }, testInfo) => {
  test.skip(isMobileProject(testInfo.project.name), 'desktop dock alignment contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  await expect(page.locator('.os-window').filter({ hasText: 'Start Here' })).toBeVisible();
  const centers = await page.locator('.os-dock').evaluate((dock) => {
    const center = (selector: string) => {
      const rect = dock.querySelector(selector)!.getBoundingClientRect();
      return rect.top + rect.height / 2;
    };
    return {
      terminal: center('[data-app-id="terminal"] .os-dock-icon'),
      videos: center('[data-app-id="videos"] .os-play-app-icon'),
    };
  });
  expect(Math.abs(centers.terminal - centers.videos)).toBeLessThanOrEqual(1);
});
