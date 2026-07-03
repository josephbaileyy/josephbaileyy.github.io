// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { athleticsBody, musicStudioBody, unfoldingLabBody } from '../src/ui/fake-os/showcase-apps';

describe('interactive showcase apps', () => {
  it('updates the accessible unfolding explanation with the selected pass', () => {
    const app = unfoldingLabBody();
    const range = app.querySelector<HTMLInputElement>('input[type="range"]')!;
    const curve = app.querySelector<SVGPathElement>('.os-curve-unfolded')!;
    const initialPath = curve.getAttribute('d');

    range.value = '5';
    range.dispatchEvent(new Event('input'));

    expect(curve.getAttribute('d')).not.toBe(initialPath);
    expect(app.querySelector('[role="status"]')?.textContent).toContain('Pass 5');
    expect(app.textContent).toMatch(/not a\s+thesis result/);
  });

  it('exposes every playable note as a labeled button', () => {
    const app = musicStudioBody();
    const keys = app.querySelectorAll<HTMLButtonElement>('.os-music-key');

    expect(keys).toHaveLength(8);
    expect([...keys].map((key) => key.getAttribute('aria-label'))).toContain('Play C4');
    expect(app.querySelector('[data-instrument="saxophone"]')?.getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('uses public race results and links to the official profile', () => {
    const app = athleticsBody();

    expect(app.textContent).toContain('52.17');
    expect(app.textContent).toContain('54.65');
    expect(app.querySelector<HTMLAnchorElement>('a')?.hostname).toBe('gostanford.com');
  });
});
