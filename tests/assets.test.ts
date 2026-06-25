import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('optimized showcase assets', () => {
  it('keeps modern textures within explicit transfer budgets', () => {
    expect(statSync('public/tex/milkyway.webp').size).toBeLessThan(1_700_000);
    expect(statSync('public/tex/baileyos-wallpaper.webp').size).toBeLessThan(100_000);
  });

  it('retains compatible source-format fallbacks', () => {
    expect(statSync('public/tex/milkyway.jpg').size).toBeGreaterThan(0);
    expect(statSync('public/tex/baileyos-wallpaper.png').size).toBeGreaterThan(0);
  });
});
