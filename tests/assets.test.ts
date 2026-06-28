import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('optimized showcase assets', () => {
  it('keeps modern textures within explicit transfer budgets', () => {
    expect(statSync('public/tex/milkyway.webp').size).toBeLessThan(1_700_000);
    expect(statSync('public/tex/baileyos-wallpaper.webp').size).toBeLessThan(100_000);
    for (const asset of [
      'fortnite-omega.webp',
      'league-katarina.webp',
      'clash-princess.webp',
      'instagram-glyph.webp',
      'letterboxd-dots.webp',
    ]) {
      expect(statSync(`public/tex/room-socials/${asset}`).size).toBeLessThan(100_000);
    }
  });

  it('retains compatible source-format fallbacks', () => {
    expect(statSync('public/tex/milkyway.jpg').size).toBeGreaterThan(0);
    expect(statSync('public/tex/baileyos-wallpaper.png').size).toBeGreaterThan(0);
    for (const asset of [
      'fortnite-omega.png',
      'league-katarina.jpg',
      'clash-princess.png',
      'instagram-glyph.png',
      'letterboxd-dots.png',
    ]) {
      expect(statSync(`public/tex/room-socials/${asset}`).size).toBeGreaterThan(0);
    }
  });
});
