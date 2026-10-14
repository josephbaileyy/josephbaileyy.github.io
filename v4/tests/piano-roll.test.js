import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { renderHome } from '../content/home.js';
import { personal } from '../content/personal.js';
import {
  firstStartingAt,
  isBlackKey,
  notesInWindow,
  parseNotes,
  soundingPitches,
} from '../js/components/piano-roll.js';

const data = JSON.parse(
  readFileSync(new URL('../public/audio/fugue-notes.json', import.meta.url), 'utf8'),
);

describe('piano roll helpers', () => {
  const notes = parseNotes({
    notes: [
      [1000, 500, 60, 80],
      [0, 3000, 48, 70],
      [1200, 100, 61, 90],
      ['bad', 1, 2, 3],
    ],
  });
  const longest = 3;

  it('parses, validates, and sorts rows', () => {
    expect(notes.map((note) => note.pitch)).toEqual([48, 60, 61]);
    expect(notes[0]).toEqual({ start: 0, end: 3, pitch: 48, velocity: 70 });
  });

  it('finds notes by time', () => {
    expect(firstStartingAt(notes, 1)).toBe(1);
    expect(notesInWindow(notes, 1.4, 2, longest).map((note) => note.pitch)).toEqual([48, 60]);
    expect([...soundingPitches(notes, 1.25, longest)]).toEqual([48, 60, 61]);
    expect([...soundingPitches(notes, 2.5, longest)]).toEqual([48]);
  });

  it('identifies black keys', () => {
    expect([60, 61, 62, 63, 64, 65, 66].map(isBlackKey)).toEqual([
      false,
      true,
      false,
      true,
      false,
      false,
      true,
    ]);
  });
});

describe('fugue note data', () => {
  const notes = parseNotes(data);

  it('covers the recording and fits the rendered keyboard', () => {
    expect(notes.length).toBeGreaterThan(600);
    expect(notes.length).toBe(data.notes.length);
    const [low, high] = personal.piano.range;
    expect(data.range).toEqual([low, high]);
    expect(notes.every((note) => note.pitch >= low && note.pitch <= high)).toBe(true);
    expect(Math.max(...notes.map((note) => note.end))).toBeLessThan(126.5);
  });

  it('opens on the fugue subject', () => {
    expect(notes.slice(0, 10).map((note) => note.pitch)).toEqual([
      72, 71, 72, 67, 68, 72, 71, 72, 74, 67,
    ]);
  });

  it('renders one key per pitch in the range', () => {
    const html = renderHome();
    const [low, high] = personal.piano.range;
    const pitches = [...html.matchAll(/data-pitch="(\d+)"/g)].map((match) => Number(match[1]));
    expect(pitches.sort((a, b) => a - b)).toEqual(
      Array.from({ length: high - low + 1 }, (_, index) => low + index),
    );
    expect(html).toContain(`data-notes="${personal.piano.notes}"`);
  });
});
