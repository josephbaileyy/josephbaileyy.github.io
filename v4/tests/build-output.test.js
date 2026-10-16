import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';
import { build } from 'vite';

const v4Root = fileURLToPath(new URL('../', import.meta.url));
const outputDir = mkdtempSync(path.join(tmpdir(), 'joseph-v4-build-'));

afterAll(() => {
  rmSync(outputDir, { recursive: true, force: true });
});

function listFiles(directory, prefix = '') {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    const relative = path.join(prefix, entry);
    return statSync(absolute).isDirectory() ? listFiles(absolute, relative) : [relative];
  });
}

describe('v4 production output', () => {
  // This test builds the entire site and hashes every reader asset. Hosted
  // runners can exceed Vitest's five-second unit-test default during the build.
  it('ships fonts, licences, evidence, and statically rendered content', async () => {
    await build({
      configFile: path.join(v4Root, 'vite.config.js'),
      logLevel: 'silent',
      build: {
        outDir: outputDir,
        emptyOutDir: true,
      },
    });

    const files = listFiles(outputDir);
    [
      'fonts/outfit-latin-variable.woff2',
      'fonts/google-sans-flex-latin-variable.woff2',
      'fonts/google-sans-code-latin-variable.woff2',
      'fonts/outfit-OFL.txt',
      'fonts/google-sans-flex-OFL.txt',
      'fonts/google-sans-code-OFL.txt',
      'fonts/mona-sans-variable.woff2',
      'fonts/inter-variable.woff2',
      'fonts/jetbrains-mono-variable.woff2',
      'fonts/LICENSE-MONA-SANS.txt',
      'fonts/LICENSE-INTER.txt',
      'fonts/LICENSE-JETBRAINS-MONO.txt',
      'fonts/source-serif-4-regular.ttf',
      'fonts/source-serif-4-semibold.ttf',
      'fonts/LICENSE-SOURCE-SERIF-4.txt',
      'lab/index.html',
      'about.html',
      'notes/index.html',
      'notes/how-this-site-works.html',
      'img/home/track-start.webp',
      'img/projects/splora-chart.webp',
      'img/projects/lord-model.webp',
      'img/projects/lord-architecture.svg',
      'img/projects/neutrino-video.webp',
      'audio/fugue.m4a',
      'audio/fugue-notes.json',
      'img/home/with-camera.jpg',
      'img/home/amcvn-fit.png',
      'img/unfolding/face2024.png',
      'img/unfolding/face2025.png',
      'data/acc-2025-400mh-splits.csv',
      'resume.pdf',
      'og-preview.jpg',
      'papers/neutrino-unfolding.pdf',
      'papers/xcc-pileup-poster.pdf',
      'papers/x17-bump-hunt-apsfws.pdf',
      'papers/am-cvn-report.pdf',
      'papers/ligo-caltech-report.pdf',
    ].forEach((asset) => expect(files, asset).toContain(asset));

    const html = readFileSync(path.join(outputDir, 'index.html'), 'utf8');
    const about = readFileSync(path.join(outputDir, 'about.html'), 'utf8');
    expect(html).toContain('Coterm B.S. Physics');
    expect(about).toContain('url=./#experience');
    expect(html).toContain('Neutrino unfolding with machine learning');
    expect(html).toContain('WisdomTree Connect');
    expect(html).toContain('BWV 847');
    expect(html).toContain('ry0rKeoQI0o');
    expect(html).not.toContain('<!-- RESEARCH_CONTENT -->');
    expect(html).not.toContain('<!-- HOME_CONTENT -->');
    expect(html).not.toContain('id="unfolding-machine"');
    expect(html).toContain('What is unfolding?');
    const note = readFileSync(path.join(outputDir, 'notes/how-this-site-works.html'), 'utf8');
    const notesIndex = readFileSync(path.join(outputDir, 'notes/index.html'), 'utf8');
    for (const page of [html, about, note, notesIndex]) expect(page).not.toContain('eyebrow');
    expect(note).toContain('The seam theorem');
    expect(note).toContain('earlier universe version');
    expect(note).not.toContain('<!-- NOTE_CONTENT:');
    expect(html).toContain('Try the interactive demo');
    expect(html).not.toContain('Details and links');
    const lab = readFileSync(path.join(outputDir, 'lab/index.html'), 'utf8');
    expect(lab).toContain('id="unfolding-machine"');
    expect(lab).toContain('href="../papers/neutrino-unfolding.pdf"');
    expect(lab).toContain('href="../resume.pdf"');
    expect(existsSync(path.join(outputDir, 'assets'))).toBe(true);

    // Vite must copy the complete standalone reader unchanged beneath its public
    // subpath: bundling only its HTML would lose dynamic modules, fonts or the PDF.
    const snapshot = JSON.parse(
      readFileSync(path.join(v4Root, '../docs/probability-snapshot.json'), 'utf8'),
    );
    expect(snapshot.files.length).toBeGreaterThan(100);
    for (const { file, sha256 } of snapshot.files) {
      const shipped = readFileSync(path.join(outputDir, 'probability', file));
      expect(createHash('sha256').update(shipped).digest('hex'), file).toBe(sha256);
    }
    expect(html).toContain('href="./probability/"');
  }, 30_000);
});
