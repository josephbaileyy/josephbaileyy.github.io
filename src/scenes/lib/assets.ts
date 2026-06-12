import { SRGBColorSpace, Texture, TextureLoader } from 'three';

const loader = new TextureLoader();
const cache = new Map<string, Promise<Texture>>();

/** Memoized texture load (textures shared between scenes survive prune). */
export function loadTexture(url: string, srgb = true): Promise<Texture> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((tex) => {
      if (srgb) tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    });
    cache.set(url, p);
  }
  return p;
}

export interface StarData {
  positions: Float32Array; // unit-sphere xyz
  colors: Float32Array;
  sizes: Float32Array;
  count: number;
}

let starsPromise: Promise<StarData> | null = null;

/** Decode public/stars.bin (see scripts/pack-stars.mjs for the format). */
export function loadStars(url = '/stars.bin'): Promise<StarData> {
  if (starsPromise) return starsPromise;
  starsPromise = fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      const view = new DataView(buf);
      const count = buf.byteLength / 6;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const o = i * 6;
        const ra = (view.getUint16(o, true) / 65535) * 2 * Math.PI;
        const dec = (view.getInt16(o + 2, true) / 100) * (Math.PI / 180);
        const mag = view.getUint8(o + 4) / 25 - 1.5;
        const ci = view.getUint8(o + 5) / 64 - 0.4;
        positions[i * 3] = Math.cos(dec) * Math.cos(ra);
        positions[i * 3 + 1] = Math.sin(dec);
        positions[i * 3 + 2] = -Math.cos(dec) * Math.sin(ra);
        const [r, g, b] = bvToRgb(ci);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
        sizes[i] = Math.min(13, 7.5 * Math.pow(10, -0.16 * mag));
      }
      return { positions, colors, sizes, count };
    });
  return starsPromise;
}

/** B−V color index → linear RGB, 5-stop astronomical ramp. */
function bvToRgb(ci: number): [number, number, number] {
  const stops: Array<[number, number, number, number]> = [
    [-0.3, 0.61, 0.7, 1.0],
    [0.0, 0.79, 0.85, 1.0],
    [0.5, 1.0, 0.96, 0.91],
    [1.0, 1.0, 0.82, 0.63],
    [1.6, 1.0, 0.69, 0.43],
  ];
  if (ci <= stops[0][0]) return [stops[0][1], stops[0][2], stops[0][3]];
  for (let i = 1; i < stops.length; i++) {
    if (ci <= stops[i][0]) {
      const t = (ci - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return [
        stops[i - 1][1] + (stops[i][1] - stops[i - 1][1]) * t,
        stops[i - 1][2] + (stops[i][2] - stops[i - 1][2]) * t,
        stops[i - 1][3] + (stops[i][3] - stops[i - 1][3]) * t,
      ];
    }
  }
  const last = stops[stops.length - 1];
  return [last[1], last[2], last[3]];
}

/** Small canvas → texture helper for sprites/posters. */
export function canvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const tex = new Texture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
