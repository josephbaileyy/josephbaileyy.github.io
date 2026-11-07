import { readFileSync, readdirSync, existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { organizeCourse } from '../public/learning/curriculum.js';
import { formatLabel } from '../public/learning/labels.js';
import { constrainToSphere, projectCurriculum } from '../public/learning/projection.js';

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
    // Both shipped exports are public curriculum structure; the concept graph is
    // checked separately in concept-space.test.js.
    expect(dataFiles.sort()).toEqual(['atlas.public.json', 'concepts.stats310a.public.json']);
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

describe('course map annotations', () => {
  it('assigns every public topic to one source-based course theme', () => {
    for (const course of Object.keys(atlas.course_summaries)) {
      const points = atlas.nodes.filter((node) => node.course === course).map((node) => ({ node }));
      const map = organizeCourse(course, points, new Map());
      expect(map.ungrouped.points).toEqual([]);
      const assigned = map.sections.flatMap(({ points }) => points);
      expect(assigned).toHaveLength(points.length);
      expect(new Set(assigned)).toEqual(new Set(points));
      if (course === 'math120') {
        expect(map.sections.map(({ label }) => label)).toEqual(['Ring theory', 'Group theory']);
      }
    }
  });

  it('renders exported math and escapes markup in an imported label', () => {
    const ideal = atlas.nodes.find((node) => node.label.startsWith('Ideal arithmetic in'));
    expect(formatLabel(ideal.label)).toContain('class="katex"');
    expect(formatLabel(ideal.label)).toContain('<msqrt>');
    expect(formatLabel('<img src=x>')).toBe('&lt;img src=x&gt;');
    expect(formatLabel(String.raw`M\"obius`)).toBe('Möbius');
  });
});

describe('curriculum projection', () => {
  const topics = [
    ['a', 'Finite measures', 1],
    ['b', 'Signed measure', 3],
    ['c', 'Kernels', 5],
    ['d', 'Normal subgroups', 7],
    ['e', 'Cosets', 9],
    ['f', 'Ideals', 9],
  ].map(([id, label, lecture]) => ({ id, label, lecture, course: 'test', kind: 'note' }));
  const edges = [{ source: 'c', target: 'd', kind: 'prerequisite' }];
  const zero = { meaning: 0, math: 0, source: 0 };
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

  it.each([
    ['meaning', 'a', 'b', 'e'],
    ['math', 'c', 'd', 'a'],
    ['source', 'e', 'f', 'c'],
  ])('can isolate the %s signal', (signal, from, near, far) => {
    const points = projectCurriculum(topics, edges, { ...zero, [signal]: 100 });
    expect(distance(points.get(from), points.get(near))).toBeLessThan(
      distance(points.get(from), points.get(far)),
    );
  });

  it('produces deterministic, centered principal components ordered by variance', () => {
    const projection = projectCurriculum(atlas.nodes, atlas.edges);
    expect(projectCurriculum(atlas.nodes, atlas.edges)).toEqual(projection);
    const points = [...projection.values()];
    const axes = ['x', 'y', 'z'];
    const dot = (a, b) => points.reduce((sum, point) => sum + point[a] * point[b], 0);
    for (const [index, axis] of axes.entries()) {
      expect(Math.abs(points.reduce((sum, point) => sum + point[axis], 0))).toBeLessThan(1e-8);
      for (const later of axes.slice(index + 1)) {
        expect(Math.abs(dot(axis, later))).toBeLessThan(1e-8);
        expect(dot(axis, axis)).toBeGreaterThan(dot(later, later));
      }
    }
  });

  it('softly compresses the outer points while preserving directions and radial order', () => {
    const [near, far] = constrainToSphere([
      { x: 1, y: 1, z: 0 },
      { x: 8, y: 8, z: 0 },
    ]);
    expect(far.x).toBeGreaterThan(near.x);
    expect(far.x / 8).toBeLessThan(near.x);
    expect(far.x).toEqual(far.y);
    expect(far.z).toBe(0);
  });
});
