import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';
import { build } from 'vite';

const v3Root = fileURLToPath(new URL('../', import.meta.url));
const outputDir = mkdtempSync(path.join(tmpdir(), 'joseph-v3-build-'));

afterAll(() => {
  rmSync(outputDir, { recursive: true, force: true });
});

describe('v3 production asset seam', () => {
  it('ships the event, signal, and AM CVn source assets in a production build', async () => {
    await build({
      configFile: path.join(v3Root, 'vite.config.js'),
      logLevel: 'silent',
      build: {
        outDir: outputDir,
        emptyOutDir: true,
      },
    });

    const eventPath = path.join(outputDir, 'data/event.json');
    const signalsPath = path.join(outputDir, 'data/signals.json');
    const imagePath = path.join(outputDir, 'img/am-cvn-light-curve.png');

    expect(existsSync(eventPath)).toBe(true);
    expect(existsSync(signalsPath)).toBe(true);
    expect(existsSync(imagePath)).toBe(true);

    const signals = JSON.parse(readFileSync(signalsPath, 'utf8'));
    expect(signals.star).not.toHaveProperty('phaseModel');
    expect(signals.star.fitStatistics).toHaveLength(4);
  });
});
