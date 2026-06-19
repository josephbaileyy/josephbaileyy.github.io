import { Vector3 } from 'three';
import { PLANETS, daysSinceJ2000, planetPosition } from '../scenes/lib/astro';

export const EPHEMERIS_BODIES = [
  'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon',
] as const;
export type EphemerisBody = typeof EPHEMERIS_BODIES[number];

interface BodyLayout { offset: number; count: number; stepDays: number }
interface ChunkMeta { startYear: number; endYear: number; startJd: number; startUnixMs?: number; file: string; bodies: Record<EphemerisBody, BodyLayout> }
interface Manifest { version: number; source: string; chunks: ChunkMeta[] }

export interface BodyState { position: Vector3; velocity: Vector3; accurate: boolean }

const JD_UNIX = 2440587.5;
const TDB_MINUS_UTC_DAYS = 69.184 / 86400;

export function unixMsToJdTdb(ms: number): number {
  return JD_UNIX + ms / 86400000 + TDB_MINUS_UTC_DAYS;
}

export class EphemerisProvider extends EventTarget {
  private manifest: Manifest | null = null;
  private chunks = new Map<number, Promise<Float64Array>>();
  private loaded = new Map<number, Float64Array>();
  private currentChunk: ChunkMeta | null = null;
  status: 'idle' | 'loading' | 'ready' | 'fallback' = 'idle';

  async loadFor(utcMs: number): Promise<void> {
    this.status = 'loading';
    try {
      let manifest: Manifest;
      if (this.manifest) manifest = this.manifest;
      else manifest = await fetch('/ephemeris/manifest.json').then((r) => {
          if (!r.ok) throw new Error(`ephemeris manifest ${r.status}`);
          return r.json() as Promise<Manifest>;
        });
      this.manifest = manifest;
      const year = new Date(utcMs).getUTCFullYear();
      const meta = manifest.chunks.find((c) => year >= c.startYear && year <= c.endYear);
      if (!meta) throw new Error(`date ${year} outside ephemeris range`);
      this.currentChunk = meta;
      let job = this.chunks.get(meta.startYear);
      if (!job) {
        job = fetch(meta.file).then(async (r) => {
          if (!r.ok) throw new Error(`ephemeris chunk ${r.status}`);
          return new Float64Array(await r.arrayBuffer());
        });
        this.chunks.set(meta.startYear, job);
      }
      const data = await job;
      this.loaded.set(meta.startYear, data);
      this.status = 'ready';
    } catch (error) {
      console.warn('JPL ephemeris unavailable; using approximate orbital fallback', error);
      this.status = 'fallback';
    }
    this.dispatchEvent(new Event('status'));
  }

  hasDate(utcMs: number): boolean {
    const year = new Date(utcMs).getUTCFullYear();
    return Boolean(this.currentChunk && year >= this.currentChunk.startYear && year <= this.currentChunk.endYear);
  }

  state(body: EphemerisBody, utcMs: number, outPosition = new Vector3(), outVelocity = new Vector3()): BodyState {
    const meta = this.currentChunk;
    const data = meta ? this.loaded.get(meta.startYear) : undefined;
    if (!meta || !data || !this.hasDate(utcMs)) return this.fallback(body, utcMs, outPosition, outVelocity);
    const layout = meta.bodies[body];
    const sample = meta.startUnixMs === undefined
      ? (unixMsToJdTdb(utcMs) - meta.startJd) / layout.stepDays
      : (utcMs - meta.startUnixMs) / 86400000 / layout.stepDays;
    const i = Math.max(0, Math.min(layout.count - 2, Math.floor(sample)));
    const t = Math.max(0, Math.min(1, sample - i));
    const a = layout.offset + i * 6;
    const b = a + 6;
    const h = layout.stepDays;
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
    const h10 = t ** 3 - 2 * t ** 2 + t;
    const h01 = -2 * t ** 3 + 3 * t ** 2;
    const h11 = t ** 3 - t ** 2;
    const x = h00 * data[a] + h10 * h * data[a + 3] + h01 * data[b] + h11 * h * data[b + 3];
    const y = h00 * data[a + 1] + h10 * h * data[a + 4] + h01 * data[b + 1] + h11 * h * data[b + 4];
    const z = h00 * data[a + 2] + h10 * h * data[a + 5] + h01 * data[b + 2] + h11 * h * data[b + 5];
    outPosition.set(x, z, -y);
    outVelocity.set(data[a + 3], data[a + 5], -data[a + 4]);
    return { position: outPosition, velocity: outVelocity, accurate: true };
  }

  private fallback(body: EphemerisBody, utcMs: number, position: Vector3, velocity: Vector3): BodyState {
    if (body === 'moon') {
      const earth = planetPosition(PLANETS[2], daysSinceJ2000(utcMs), position);
      const phase = daysSinceJ2000(utcMs) * Math.PI * 2 / 27.321661;
      position.add(new Vector3(Math.cos(phase), 0.08 * Math.sin(phase * 0.9), -Math.sin(phase)).multiplyScalar(0.00257));
    } else {
      const p = PLANETS.find((planet) => planet.name === body)!;
      planetPosition(p, daysSinceJ2000(utcMs), position);
    }
    velocity.set(0, 0, 0);
    return { position, velocity, accurate: false };
  }
}

export const ephemeris = new EphemerisProvider();
