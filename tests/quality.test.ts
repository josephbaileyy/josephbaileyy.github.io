import { describe, expect, it } from 'vitest';
import { QualityMonitor } from '../src/engine/quality';

describe('scene-aware quality monitor', () => {
  it('starts conservatively on memory-constrained or very dense displays', () => {
    const memoryLimited = new QualityMonitor();
    memoryLimited.configureDevice(2_000_000, 4);
    expect(memoryLimited.tier).toBe('med');

    const pixelLimited = new QualityMonitor();
    pixelLimited.configureDevice(7_000_000, 8);
    expect(pixelLimited.tier).toBe('med');
  });

  it('demotes after a sustained scene-budget overrun', () => {
    const monitor = new QualityMonitor();
    monitor.setScene('screen');
    for (let frame = 0; frame < 80; frame++) monitor.update(0.05, frame * 0.05);
    expect(monitor.tier).toBe('med');
  });
});
