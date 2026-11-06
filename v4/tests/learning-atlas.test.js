import { readFileSync, readdirSync, existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// This test is installed at v4/tests/ and the atlas ships in v4/public/learning/.
const directory = new URL('../public/learning/', import.meta.url);
const atlas = JSON.parse(readFileSync(new URL('data/atlas.public.json', directory), 'utf8'));

function keysIn(value) {
  if (Array.isArray(value)) return value.flatMap(keysIn);
  if (value && typeof value === 'object') {
    return [...Object.keys(value), ...Object.values(value).flatMap(keysIn)];
  }
  return [];
}

describe('public learning atlas privacy and integrity', () => {
  it('ships a standalone, static learning page', () => {
    for (const filename of ['index.html', 'styles.css', 'app.js', 'data/atlas.public.json']) {
      expect(existsSync(new URL(filename, directory))).toBe(true);
    }
  });

  it('contains curriculum structure without private student assessments', () => {
    expect(atlas.visibility).toBe('public_curriculum_only');
    expect(atlas.course_summaries.stats310a.syllabus_blocks).toBe(9);
    expect(atlas.course_summaries.stats310a.independently_mastered_curriculum_fraction).toBeNull();
    expect(atlas.course_summaries.math120.lecture_blocks).toBe(13);
    expect(atlas.weeks).toHaveLength(9);
    expect(atlas).not.toHaveProperty('diagnostic_queue');
    expect(atlas.nodes).toHaveLength(311);
    expect(atlas.edges).toHaveLength(551);
    expect(atlas.nodes.every((node) => ['lecture', 'note', 'dembo'].includes(node.kind))).toBe(
      true,
    );

    const forbidden =
      /^(?:score|scores|observations|evidence_refs|next_probe|assessment_status|diagnostic_queue|assistant_dependency|confidence_rating)$/i;
    expect(keysIn(atlas).filter((key) => forbidden.test(key))).toEqual([]);
  });

  it('only ships the sanitized export and keeps the private loader local', () => {
    const dataFiles = readdirSync(new URL('data/', directory));
    expect(dataFiles).toEqual(['atlas.public.json']);
    const app = readFileSync(new URL('app.js', directory), 'utf8');
    // The only network request is the public snapshot; the private file never leaves the tab.
    expect(app.match(/fetch\(/g)).toHaveLength(1);
    expect(app).toContain("fetch('./data/atlas.public.json'");
    expect(app).not.toMatch(
      /localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon|WebSocket/,
    );
    expect(app).not.toMatch(
      /api\.github\.com|raw\.githubusercontent|Authorization|ghp_|github_pat_/,
    );
    const html = readFileSync(new URL('index.html', directory), 'utf8');
    expect(html).toContain('href="../"');
  });

  it('keeps all public graph links internally resolvable', () => {
    const ids = new Set(atlas.nodes.map((node) => node.id));
    expect(ids.size).toBe(atlas.nodes.length);
    for (const edge of atlas.edges) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
  });
});
