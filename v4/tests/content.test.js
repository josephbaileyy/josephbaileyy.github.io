import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { education } from '../content/education.js';
import { experience } from '../content/experience.js';
import { manifest } from '../content/manifest.js';
import { profile } from '../content/profile.js';
import { projects } from '../content/projects.js';
import { research } from '../content/research.js';

const v4Root = fileURLToPath(new URL('../', import.meta.url));

describe('v4 content integrity', () => {
  it('keeps the profile in first person', () => {
    expect(profile.statement).toMatch(/\bI\b/);
    expect(profile.statement).not.toMatch(/\b(?:he|him|his)\b/i);
  });

  it('keeps the MINERvA structural-bias claim under test', () => {
    const claims = [
      ...research.map((item) => item.result),
      ...projects.map((item) => item.evidence),
    ].filter((claim) => /structural model bias/i.test(claim));

    expect(claims.length).toBeGreaterThan(0);
    claims.forEach((claim) => {
      expect(claim).toMatch(/under test/i);
      expect(claim).not.toMatch(/\b(?:reduced|lowered|eliminated) structural model bias\b/i);
    });
  });

  it('contains complete, unique content records', () => {
    expect(research).toHaveLength(5);
    expect(projects).toHaveLength(7);
    expect(experience).toHaveLength(2);
    expect(education.coursework.length).toBeGreaterThanOrEqual(10);
    expect(education.honors).toHaveLength(4);

    const ids = [...research, ...projects, ...experience].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves every local paper and resume link inside v4/public', () => {
    const links = [
      ...profile.links,
      ...research.flatMap((item) => item.links),
      ...projects.flatMap((item) => item.links),
    ];
    const localLinks = links.filter((link) => link.href.startsWith('./'));
    expect(localLinks.length).toBeGreaterThan(0);
    localLinks.forEach((link) => {
      expect(existsSync(path.join(v4Root, 'public', link.href.slice(2))), link.href).toBe(true);
    });
  });
});

describe('shared chamber manifest', () => {
  const labelled = manifest.bodies.filter((body) => body.id);

  it('provides the exact shared shape and a dense authored composition', () => {
    expect(manifest).toEqual({ bodies: expect.any(Array) });
    expect(manifest.bodies.length).toBeGreaterThanOrEqual(60);
    expect(manifest.bodies.length).toBeLessThanOrEqual(100);
    expect(labelled).toHaveLength(15);

    manifest.bodies.forEach((body) => {
      expect(body).toEqual({
        id: body.id,
        label: expect.any(String),
        massClass: expect.stringMatching(/^(?:heavy|mid|light)$/),
        slot: {
          x: expect.any(Number),
          y: expect.any(Number),
        },
        kind: expect.stringMatching(/^(?:research|project|link)$/),
        href: body.href,
      });
      expect(body.slot.x).toBeGreaterThanOrEqual(-1);
      expect(body.slot.x).toBeLessThanOrEqual(1);
      expect(body.slot.y).toBeGreaterThanOrEqual(-1);
      expect(body.slot.y).toBeLessThanOrEqual(1);
    });
  });

  it('resolves every manifest id to a real content item', () => {
    const resolvable = new Set([
      ...research.map((item) => item.id),
      ...projects.map((item) => item.id),
      ...profile.links.map((item) => item.id),
    ]);
    const ids = labelled.map((body) => body.id);

    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(resolvable.has(id), id).toBe(true));
  });

  it('assigns real items to the contracted mass classes', () => {
    const byKind = Object.groupBy(labelled, (body) => body.kind);
    expect(byKind.research).toHaveLength(5);
    expect(byKind.research.every((body) => body.massClass === 'heavy')).toBe(true);
    expect(byKind.project).toHaveLength(7);
    expect(byKind.project.every((body) => body.massClass === 'mid')).toBe(true);
    expect(byKind.link).toHaveLength(3);
    expect(byKind.link.every((body) => body.massClass === 'light' && body.href)).toBe(true);
    expect(
      labelled.every((body) => body.label.length <= 10 && body.label === body.label.toUpperCase()),
    ).toBe(true);
  });
});
