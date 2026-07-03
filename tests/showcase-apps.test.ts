// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  athleticsBody,
  musicStudioBody,
  naiveInversionBins,
  nextUnfoldingScene,
  seededToyEvents,
  unfoldingLabBody,
} from '../src/ui/fake-os/showcase-apps';

describe('interactive showcase apps', () => {
  it('uses one deterministic seed for the detector toy', () => {
    expect(seededToyEvents(8, 0.42)).toEqual(seededToyEvents(8, 0.42));
    expect(seededToyEvents(8, 0.42)).not.toEqual(seededToyEvents(8, 0.7));
  });

  it('makes the naive inverse alternate sign while growing at the edges', () => {
    const bins = naiveInversionBins();

    expect(
      bins.every((value, index) => index === 0 || Math.sign(value) !== Math.sign(bins[index - 1])),
    ).toBe(true);
    expect(Math.abs(bins[0])).toBeGreaterThan(Math.abs(bins[4]));
    expect(Math.abs(bins.at(-1)!)).toBeGreaterThan(Math.abs(bins[5]));
  });

  it('moves through the three-scene state machine without overflowing', () => {
    expect(nextUnfoldingScene(1, 'next')).toBe(2);
    expect(nextUnfoldingScene(2, 'next')).toBe(3);
    expect(nextUnfoldingScene(3, 'next')).toBe(3);
    expect(nextUnfoldingScene(3, 'previous')).toBe(2);
    expect(nextUnfoldingScene(2, 'restart')).toBe(1);
  });

  it('exposes keyboard-operable scene transitions and qualitative research context', () => {
    const app = unfoldingLabBody();
    const next = app.querySelector<HTMLButtonElement>('[data-next]')!;
    next.click();

    expect(app.querySelector<HTMLElement>('[data-scene-panel="1"]')?.hidden).toBe(true);
    expect(app.querySelector<HTMLElement>('[data-scene-panel="2"]')?.hidden).toBe(false);
    expect(app.textContent).toContain('schematic — illustrative, not real data');
    expect(app.textContent).toContain('no unpublished numerical results shown');
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
