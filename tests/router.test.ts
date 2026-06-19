import { describe, expect, it } from 'vitest';
import { formatRoute, parseRoute } from '../src/router';

const scenes = ['galaxy', 'solar', 'earth', 'stanford', 'room', 'screen'];

describe('route helpers', () => {
  it('parses scene and panel deep links', () => {
    expect(parseRoute('#/galaxy/am-cvn', scenes)).toEqual({ scene: 0, panel: 'am-cvn' });
    expect(parseRoute('#/screen', scenes)).toEqual({ scene: 5, panel: undefined });
  });

  it('rejects malformed and unknown routes', () => {
    expect(parseRoute('#/unknown', scenes)).toBeNull();
    expect(parseRoute('screen', scenes)).toBeNull();
  });

  it('formats stable routes', () => {
    expect(formatRoute(2, scenes)).toBe('#/earth');
    expect(formatRoute(0, scenes, 'research')).toBe('#/galaxy/research');
    expect(() => formatRoute(20, scenes)).toThrow(RangeError);
  });
});
