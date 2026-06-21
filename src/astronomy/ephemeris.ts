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
  private manifestJob: Promise<Manifest> | null = null;
  private chunks = new Map<number, Promise<Float64Array>>();
  private loaded = new Map<number, Float64Array>();
  private pending = 0;
  status: 'idle' | 'loading' | 'ready' | 'fallback' = 'idle';

  async loadFor(utcMs: number): Promise<void> {
    this.pending += 1;
    this.status = 'loading';
    try {
      const manifest = await this.getManifest();
      const meta = this.metaFor(utcMs, manifest);
      if (!meta) throw new Error(`date ${new Date(utcMs).getUTCFullYear()} outside ephemeris range`);
      if (this.loaded.has(meta.startYear)) return;
      let job = this.chunks.get(meta.startYear);
      if (!job) {
        job = fetch(meta.file).then(async (r) => {
          if (!r.ok) throw new Error(`ephemeris chunk ${r.status}`);
          return new Float64Array(await r.arrayBuffer());
        }).catch((error) => {
          this.chunks.delete(meta.startYear);
          throw error;
        });
        this.chunks.set(meta.startYear, job);
      }
      this.loaded.set(meta.startYear, await job);
    } catch (error) {
      console.warn('JPL ephemeris unavailable; using approximate orbital fallback', error);
      this.status = 'fallback';
    } finally {
      this.pending -= 1;
      if (this.pending === 0 && this.status !== 'fallback') this.status = this.loaded.size ? 'ready' : 'idle';
      this.dispatchEvent(new Event('status'));
    }
  }

  isLoaded(utcMs: number): boolean {
    const meta = this.metaFor(utcMs);
    return Boolean(meta && this.loaded.has(meta.startYear));
  }

  hasDate(utcMs: number): boolean { return this.isLoaded(utcMs); }

  private async getManifest(): Promise<Manifest> {
    if (this.manifest) return this.manifest;
    this.manifestJob ??= fetch('/ephemeris/manifest.json').then((r) => {
          if (!r.ok) throw new Error(`ephemeris manifest ${r.status}`);
          return r.json() as Promise<Manifest>;
        });
    try { this.manifest = await this.manifestJob; }
    catch (error) { this.manifestJob = null; throw error; }
    return this.manifest;
  }

  private metaFor(utcMs: number, manifest = this.manifest): ChunkMeta | undefined {
    if (!manifest) return undefined;
    const year = new Date(utcMs).getUTCFullYear();
    return manifest.chunks.find((chunk) => year >= chunk.startYear && year <= chunk.endYear);
  }

  state(body: EphemerisBody, utcMs: number, outPosition = new Vector3(), outVelocity = new Vector3()): BodyState {
    const meta = this.metaFor(utcMs);
    const data = meta ? this.loaded.get(meta.startYear) : undefined;
    if (!meta || !data) return this.fallback(body, utcMs, outPosition, outVelocity);
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
    const dh00 = 6 * t ** 2 - 6 * t;
    const dh10 = 3 * t ** 2 - 4 * t + 1;
    const dh01 = -dh00;
    const dh11 = 3 * t ** 2 - 2 * t;
    const vx = (dh00 * data[a] + dh01 * data[b]) / h + dh10 * data[a + 3] + dh11 * data[b + 3];
    const vy = (dh00 * data[a + 1] + dh01 * data[b + 1]) / h + dh10 * data[a + 4] + dh11 * data[b + 4];
    const vz = (dh00 * data[a + 2] + dh01 * data[b + 2]) / h + dh10 * data[a + 5] + dh11 * data[b + 5];
    outPosition.set(x, z, -y);
    outVelocity.set(vx, vz, -vy);
    return { position: outPosition, velocity: outVelocity, accurate: true };
  }

  private fallback(body: EphemerisBody, utcMs: number, position: Vector3, velocity: Vector3): BodyState {
    if (body === 'moon') {
      planetPosition(PLANETS[2], daysSinceJ2000(utcMs), position);
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
