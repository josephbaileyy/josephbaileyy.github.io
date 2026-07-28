import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const baseCssPath = fileURLToPath(new URL('../styles/base.css', import.meta.url));

describe('v4 scroll authority', () => {
  it('does not let a global smooth-scroll animation revert user input', () => {
    const css = readFileSync(baseCssPath, 'utf8');
    const htmlRule = css.match(/html\s*{(?<declarations>[^}]*)}/)?.groups?.declarations ?? '';

    expect(htmlRule).not.toMatch(/scroll-behavior\s*:\s*smooth/);
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*scroll-behavior:\s*auto\s*!important/,
    );
  });
});
