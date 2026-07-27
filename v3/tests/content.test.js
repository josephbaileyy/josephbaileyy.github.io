import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { profile } from '../content/profile.js';
import { research } from '../content/research.js';
import { projects } from '../content/projects.js';
import { experience } from '../content/experience.js';
import { education } from '../content/education.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');

describe('v3 content modules', () => {
  it('exports frozen data structures', () => {
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(research)).toBe(true);
    expect(Object.isFrozen(projects)).toBe(true);
    expect(Object.isFrozen(experience)).toBe(true);
    expect(Object.isFrozen(education)).toBe(true);
  });

  describe('profile', () => {
    it('contains required profile fields', () => {
      expect(profile.name).toBe('Joseph Bailey');
      expect(profile.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(profile.statement.length).toBeGreaterThan(10);
      expect(profile.tagline.length).toBeGreaterThan(0);
      expect(Array.isArray(profile.links)).toBe(true);
    });
  });

  describe('research', () => {
    it('has non-empty array of research items', () => {
      expect(Array.isArray(research)).toBe(true);
      expect(research.length).toBeGreaterThan(0);
    });

    it('has unique ids', () => {
      const ids = research.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('flags MINERvA OmniFold work as current: true', () => {
      const minerva = research.find((r) => r.id.includes('minerva'));
      expect(minerva).toBeDefined();
      expect(minerva.current).toBe(true);
    });

    it('has required fields on every research item', () => {
      research.forEach((r) => {
        expect(r.id).toBeTruthy();
        expect(r.title).toBeTruthy();
        expect(r.role).toBeTruthy();
        expect(r.venue).toBeTruthy();
        expect(r.period).toBeTruthy();
        expect(r.question).toBeTruthy();
        expect(r.method).toBeTruthy();
        expect(r.result).toBeTruthy();
        expect(Array.isArray(r.tags)).toBe(true);
        expect(Array.isArray(r.links)).toBe(true);
      });
    });
  });

  describe('projects', () => {
    it('has unique ids', () => {
      const ids = projects.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('has required fields on every project item', () => {
      projects.forEach((p) => {
        expect(p.id).toBeTruthy();
        expect(p.title).toBeTruthy();
        expect(p.summary).toBeTruthy();
        expect(p.work).toBeTruthy();
        expect(p.evidence).toBeTruthy();
        expect(Array.isArray(p.stack)).toBe(true);
        expect(Array.isArray(p.links)).toBe(true);
      });
    });
  });

  describe('experience', () => {
    it('has unique ids', () => {
      const ids = experience.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('has required fields on every experience item', () => {
      experience.forEach((e) => {
        expect(e.id).toBeTruthy();
        expect(e.role).toBeTruthy();
        expect(e.org).toBeTruthy();
        expect(e.location).toBeTruthy();
        expect(e.period).toBeTruthy();
        expect(e.summary).toBeTruthy();
      });
    });
  });

  describe('education', () => {
    it('contains required education fields', () => {
      expect(education.school).toBeTruthy();
      expect(education.degree).toBeTruthy();
      expect(education.period).toBeTruthy();
      expect(Array.isArray(education.coursework)).toBe(true);
      expect(education.coursework.length).toBeGreaterThan(0);
      expect(Array.isArray(education.honors)).toBe(true);
      expect(education.honors.length).toBeGreaterThan(0);
    });
  });

  describe('paper link verification', () => {
    it('every link href pointing to ./papers/ resolves to a real file on disk', () => {
      const allModules = [...research, ...projects];
      const paperLinks = [];

      allModules.forEach((item) => {
        if (item.links) {
          item.links.forEach((link) => {
            if (link.href && link.href.startsWith('./papers/')) {
              paperLinks.push(link.href);
            }
          });
        }
      });

      expect(paperLinks.length).toBeGreaterThan(0);

      paperLinks.forEach((relHref) => {
        const fileName = path.basename(relHref);
        // Check in public/papers/ or v3/public/papers/
        const pathPublic = path.join(repoRoot, 'public/papers', fileName);
        const pathV3Public = path.join(repoRoot, 'v3/public/papers', fileName);

        const existsInPublic = fs.existsSync(pathPublic);
        const existsInV3Public = fs.existsSync(pathV3Public);

        expect(
          existsInPublic || existsInV3Public,
          `Paper file does not exist: ${relHref} (checked ${pathPublic} and ${pathV3Public})`,
        ).toBe(true);
      });
    });
  });
});
