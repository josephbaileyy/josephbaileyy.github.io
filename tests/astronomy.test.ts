import { afterEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { readFile } from 'node:fs/promises';
import { SimulationClock } from '../src/astronomy/clock';
import { EphemerisProvider, EPHEMERIS_BODIES, unixMsToJdTdb } from '../src/astronomy/ephemeris';
import { AU_KM, EARTH_RADIUS_AU, PLANETS, planetRadius, SUN_RADIUS_AU } from '../src/scenes/lib/astro';
import { osculatingOrbitPoints } from '../src/astronomy/orbit';

afterEach(() => vi.unstubAllGlobals());

describe('SimulationClock', () => {
  it('pauses, runs forward and reverses at the selected rate', () => {
    const clock = new SimulationClock();
    clock.setUtcMs(Date.UTC(2025, 0, 1));
    clock.setRate(86400);
    const forward = clock.tick(1);
    expect(new Date(forward).toISOString().slice(0, 10)).toBe('2025-01-02');
    clock.setRate(-86400);
    const reverse = clock.tick(1);
    expect(new Date(reverse).toISOString().slice(0, 10)).toBe('2025-01-01');
    clock.pause();
    expect(clock.tick(10)).toBe(reverse);
  });
});

describe('JPL ephemeris interpolation', () => {
  it('Hermite-interpolates position and exposes accurate state', async () => {
    const values: number[] = [];
    const bodies: Record<string, { offset: number; count: number; stepDays: number }> = {};
    EPHEMERIS_BODIES.forEach((body) => {
      bodies[body] = { offset: values.length, count: 2, stepDays: 1 };
      values.push(0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
    });
    const data = new Float64Array(values);
    const startJd = unixMsToJdTdb(0);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ version: 1, source: 'test', chunks: [{ startYear: 1970, endYear: 1970, startJd, startUnixMs: 0, file: '/chunk.bin', bodies }] }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => data.buffer });
    vi.stubGlobal('fetch', fetchMock);
    const provider = new EphemerisProvider();
    await provider.loadFor(0);
    const state = provider.state('earth', 43200000, new Vector3(), new Vector3());
    expect(state.accurate).toBe(true);
    expect(state.position.x).toBeCloseTo(0.5, 8);
    expect(state.position.y).toBeCloseTo(0, 8);
  });

  it('matches a stored Horizons Mercury reference vector', async () => {
    const manifestBytes = await readFile(new URL('../public/ephemeris/manifest.json', import.meta.url));
    const chunkBytes = await readFile(new URL('../public/ephemeris/2025-2029.bin', import.meta.url));
    const manifest = JSON.parse(manifestBytes.toString());
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => manifest })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => chunkBytes.buffer.slice(chunkBytes.byteOffset, chunkBytes.byteOffset + chunkBytes.byteLength) }));
    const provider = new EphemerisProvider();
    const date = Date.UTC(2026, 0, 1);
    await provider.loadFor(date);
    const { position } = provider.state('mercury', date);
    // Horizons/SPICE vector at 2026-01-01 00:00:00 UTC (not TDB midnight).
    expect(position.x).toBeCloseTo(-0.2151859044, 7);
    expect(position.y).toBeCloseTo(-0.0137054500, 7);
    expect(position.z).toBeCloseTo(0.4092170140, 7);
  });

  it('keeps the displayed chunk accurate while the next time range buffers', async () => {
    const layouts = Object.fromEntries(EPHEMERIS_BODIES.map((body) => [body, { offset: 0, count: 2, stepDays: 1 }]));
    const first = new Float64Array([0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
    const second = new Float64Array([10, 0, 0, 1, 0, 0, 11, 0, 0, 1, 0, 0]);
    let releaseSecond!: (value: { ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }) => void;
    const delayed = new Promise<{ ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }>((resolve) => { releaseSecond = resolve; });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ version: 1, source: 'test', chunks: [
        { startYear: 1970, endYear: 1974, startJd: 0, startUnixMs: Date.UTC(1970, 0, 1), file: '/first.bin', bodies: layouts },
        { startYear: 1975, endYear: 1979, startJd: 0, startUnixMs: Date.UTC(1975, 0, 1), file: '/second.bin', bodies: layouts },
      ] }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => first.buffer })
      .mockReturnValueOnce(delayed));
    const provider = new EphemerisProvider();
    await provider.loadFor(Date.UTC(1970, 0, 1));
    const buffering = provider.loadFor(Date.UTC(1975, 0, 1));
    expect(provider.state('earth', Date.UTC(1970, 0, 1)).accurate).toBe(true);
    releaseSecond({ ok: true, arrayBuffer: async () => second.buffer });
    await buffering;
    expect(provider.state('earth', Date.UTC(1975, 0, 1)).position.x).toBeCloseTo(10, 8);
  });
});

describe('physical scale', () => {
  it('uses literal kilometer-to-AU radii without readability compression', () => {
    expect(planetRadius(AU_KM)).toBe(1);
    expect(planetRadius(PLANETS[2].radiusKm)).toBeCloseTo(EARTH_RADIUS_AU, 12);
    expect(SUN_RADIUS_AU / EARTH_RADIUS_AU).toBeGreaterThan(100);
  });

  it('builds an osculating guide through the supplied orbital state', () => {
    const mu = 0.0002959122082855911;
    const eccentricity = 0.1;
    const periapsis = 1 - eccentricity;
    const speed = Math.sqrt(mu * (1 + eccentricity) / periapsis);
    const points = osculatingOrbitPoints(new Vector3(periapsis, 0, 0), new Vector3(0, 0, -speed));
    expect(points).not.toBeNull();
    expect(points![0]).toBeCloseTo(periapsis, 6);
    expect(points![1]).toBeCloseTo(0, 6);
    expect(points![2]).toBeCloseTo(0, 6);
  });
});
