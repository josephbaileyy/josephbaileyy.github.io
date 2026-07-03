import { expect, test, type Page } from '@playwright/test';

const isMobile = (projectName: string): boolean => projectName.includes('mobile');
const destinations = [
  'Research',
  'Projects',
  'CV',
  'Music',
  'Athletics',
  'Notes',
  'Contact',
] as const;

async function openDestination(page: Page, label: (typeof destinations)[number]): Promise<number> {
  let taps = 0;
  await page.getByRole('link', { name: new RegExp(`^${label}`) }).click();
  taps += 1;
  await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
  return taps;
}

test('mobile default renders the seven-destination DOM home without WebGL', async ({
  page,
}, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'mobile adaptive entry contract');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/');
  await expect(page.locator('#mobile-app')).toBeVisible();
  await expect(page.locator('canvas#universe')).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Portfolio destinations' }).getByRole('link'),
  ).toHaveCount(7);
  await expect(page.getByRole('link', { name: /Explore the universe/ })).toBeVisible();
  expect(requests.filter((url) => /(?:three|universe)-[^/]+\.js/.test(url))).toEqual([]);

  for (const label of destinations) {
    await expect(page.getByRole('link', { name: new RegExp(`^${label}`) })).toBeVisible();
  }
});

for (const destination of destinations) {
  test(`${destination} is reachable within two taps`, async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), 'mobile destination contract');
    await page.goto('/');
    const taps = await openDestination(page, destination);
    expect(taps).toBeLessThanOrEqual(2);

    if (destination === 'Research') {
      await expect(page.getByRole('link', { name: /Report|Paper|Poster/ }).first()).toBeVisible();
    } else if (destination === 'Projects') {
      await expect(page.locator('.panel-list > li')).not.toHaveCount(0);
    } else if (destination === 'CV') {
      await expect(page.getByRole('link', { name: /Open CV/ })).toHaveAttribute(
        'href',
        '/resume.pdf',
      );
    } else if (destination === 'Notes') {
      await expect(page.getByRole('link', { name: 'How this site works' })).toBeVisible();
    } else if (destination === 'Contact') {
      await expect(page.getByRole('link', { name: /Email/ })).toHaveAttribute(
        'href',
        'mailto:jrbailey555@gmail.com',
      );
    }
  });
}

test('a playable music note is reachable within three taps', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'mobile music contract');
  await page.goto('/');
  let taps = await openDestination(page, 'Music');
  const note = page.locator('.os-music-key').first();
  await note.click();
  taps += 1;
  await expect(page.locator('.os-music-status')).toContainText('Piano');
  expect(taps).toBeLessThanOrEqual(3);
});

test('mobile DOM controls meet target size and viewport-area contracts', async ({
  page,
}, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'mobile target-size contract');
  await page.goto('/');

  const failures: Array<Record<string, unknown>> = [];
  for (const route of ['home', ...destinations]) {
    if (route !== 'home') {
      await page.goto(`/#/mobile/${route.toLowerCase()}`);
      await expect(page.getByRole('heading', { level: 1, name: route })).toBeVisible();
    }
    const routeFailures = await page.locator('a, button, [role="button"]').evaluateAll((elements) =>
      elements
        .filter((element) => {
          const style = getComputedStyle(element);
          return style.visibility !== 'hidden' && style.display !== 'none';
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute('aria-label') ?? element.textContent?.trim(),
            width: rect.width,
            height: rect.height,
            areaRatio: (rect.width * rect.height) / (innerWidth * innerHeight),
          };
        })
        .filter(({ width, height, areaRatio }) => width < 44 || height < 44 || areaRatio > 0.2),
    );
    failures.push(...routeFailures.map((failure) => ({ route, ...failure })));
  }
  expect(failures).toEqual([]);
});

test('universe opt-in persists and simple home clears it', async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'mobile universe preference contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: /Explore the universe/ }).click();
  await expect(page.locator('canvas#universe')).toBeVisible();
  await expect(page.getByText('Now viewing: The Milky Way', { exact: true })).toBeAttached({
    timeout: 15_000,
  });

  await page.goto('/');
  await expect(page.locator('canvas#universe')).toBeVisible();
  await page.getByRole('link', { name: '← Simple home' }).click();
  await expect(page.locator('#mobile-app')).toBeVisible();
  await expect(page.locator('canvas#universe')).toHaveCount(0);
});

test('mobile destination history returns home, then exits the entry', async ({
  page,
}, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'mobile history contract');
  await page.goto('/about.html');
  await page.goto('/');
  await openDestination(page, 'Research');
  await page.goBack();
  await expect(page.getByRole('navigation', { name: 'Portfolio destinations' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/about\.html$/);
});

test('desktop retains the universe default', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'desktop adaptive entry contract');
  await page.goto('/');
  await expect(page.locator('canvas#universe')).toBeVisible();
  await expect(page.locator('#mobile-app')).toHaveCount(0);
});

test('BaileyOS mobile launcher exposes eight primary choices and all apps in More', async ({
  page,
}, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), 'mobile launcher regrouping contract');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/screen');
  const primary = page.locator('.os-mobile-app');
  await expect(primary).toHaveCount(8);
  const primaryIds = await primary.evaluateAll((apps) =>
    apps.map((app) => app.getAttribute('data-app-id')),
  );
  expect(primaryIds).toEqual([
    'research',
    'projects',
    'cv',
    'email',
    'music',
    'athletics',
    'notes',
    'more',
  ]);

  await page.locator('.os-mobile-app[data-app-id="more"]').click();
  await expect(page.locator('.os-mobile-more-sheet')).toBeVisible();
  for (const appId of ['journey', 'terminal', 'field-log']) {
    await expect(page.locator(`.os-mobile-more-app[data-app-id="${appId}"]`)).toBeVisible();
  }
  await expect(page.locator('.os-mobile-more-app[data-app-id^="project:"]')).toHaveCount(5);
});
