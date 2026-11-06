import { renderToString } from '../probability/vendor/katex.mjs';

export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

export function plainLabel(value) {
  return String(value ?? '')
    .replace(/\\(["'])(?:\{([A-Za-z])\}|([A-Za-z]))/g, (_, accent, grouped, letter) =>
      ((grouped ?? letter) + (accent === '"' ? '\u0308' : '\u0301')).normalize('NFC'),
    )
    .replace(/\\(?:emph|textit|textbf)\{([^{}]*)\}/g, '$1')
    .replace(/--/g, '–');
}

export function formatLabel(value) {
  const text = String(value ?? '');
  let html = '';
  let start = 0;
  const math = /\$\$([^$]+)\$\$|(?<!\\)\$([^$\n]+)\$|\\\((.+?)\\\)|\\\[(.+?)\\\]/gs;
  for (const match of text.matchAll(math)) {
    html += escapeHtml(plainLabel(text.slice(start, match.index)));
    try {
      html += renderToString(match[1] ?? match[2] ?? match[3] ?? match[4], {
        trust: false,
        strict: 'ignore',
        maxExpand: 100,
        maxSize: 4,
      });
    } catch {
      html += escapeHtml(match[0]);
    }
    start = match.index + match[0].length;
  }
  return html + escapeHtml(plainLabel(text.slice(start)));
}
