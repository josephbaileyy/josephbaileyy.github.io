import { describe, expect, it } from 'vitest';
import { isKeyboardOnlyViewportResize } from '../src/engine/device';

describe('mobile viewport stability', () => {
  it('recognizes a software-keyboard height reduction', () => {
    expect(isKeyboardOnlyViewportResize({ w: 390, h: 844 }, { w: 390, h: 492 }, true, true)).toBe(
      true,
    );
  });

  it('still accepts orientation and ordinary viewport changes', () => {
    expect(isKeyboardOnlyViewportResize({ w: 390, h: 844 }, { w: 844, h: 390 }, true, true)).toBe(
      false,
    );
    expect(isKeyboardOnlyViewportResize({ w: 390, h: 844 }, { w: 390, h: 760 }, true, true)).toBe(
      false,
    );
    expect(isKeyboardOnlyViewportResize({ w: 390, h: 844 }, { w: 390, h: 492 }, true, false)).toBe(
      false,
    );
  });
});
