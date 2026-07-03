// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildTerminal, UNFOLD_TERMINAL_OUTPUT } from '../src/ui/fake-os/terminal';

describe('BaileyOS terminal unfolding command', () => {
  it('registers unfold in help and prints the three-act rendition', () => {
    const terminal = buildTerminal();
    const input = terminal.querySelector<HTMLInputElement>('input')!;

    input.value = 'help';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(terminal.textContent).toContain('unfold');

    input.value = 'unfold';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(terminal.textContent).toContain('[1] SHOOT');
    expect(terminal.textContent).toContain('[2] TRY TO INVERT');
    expect(terminal.textContent).toContain('[3] REWEIGHT INSTEAD');
    expect(terminal.textContent).toContain('open the Unfolding Lab for the real thing');
    expect(UNFOLD_TERMINAL_OUTPUT.split('\n').length).toBeLessThanOrEqual(25);
  });
});
