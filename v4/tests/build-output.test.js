import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    expect(html).toContain('coterminal physics B.S.');
    expect(html).toContain(
      'whether high-dimensional unbinned unfolding reduces structural model bias is the question under test',
    );
    expect(html).toContain('WisdomTree Connect');
    expect(html).toContain('MTAC Level 10 piano');
    expect(html).not.toContain('<!-- RESEARCH_CONTENT -->');
    expect(html).not.toContain('<!-- HOME_CONTENT -->');
    expect(html).not.toContain('id="unfolding-machine"');
    expect(html).toContain('Explanation and demonstration');
    const lab = readFileSync(path.join(outputDir, 'lab/index.html'), 'utf8');
    expect(lab).toContain('id="unfolding-machine"');
    expect(lab).toContain('href="../papers/neutrino-unfolding.pdf"');
    expect(lab).toContain('href="../resume.pdf"');
    expect(existsSync(path.join(outputDir, 'assets'))).toBe(true);
  });
});
