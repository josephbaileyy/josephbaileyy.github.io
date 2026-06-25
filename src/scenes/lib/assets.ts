import {
  LinearFilter,
  LinearMipmapLinearFilter,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';

const loader = new TextureLoader();
const cache = new Map<string, Promise<Texture>>();

/** Memoized texture load (textures shared between scenes survive prune). */
export function loadTexture(url: string, srgb = true): Promise<Texture> {
  let p = cache.get(url);
  if (!p) {
    p = loader
      .loadAsync(url)
      .then((tex) => {
        if (srgb) tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 4;
        return tex;
      })
      .catch((error) => {
        cache.delete(url);
        throw error;
      });
    cache.set(url, p);
  }
  return p;
}

/** Prefer a smaller modern texture while retaining an older-format fallback. */
export function loadTextureWithFallback(
  preferredUrl: string,
  fallbackUrl: string,
  srgb = true,
): Promise<Texture> {
  return loadTexture(preferredUrl, srgb).catch(() => loadTexture(fallbackUrl, srgb));
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
  pixelRatio = 1,
): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * pixelRatio);
  canvas.height = Math.ceil(h * pixelRatio);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(pixelRatio, pixelRatio);
  draw(ctx);
  const tex = new Texture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface TextSpriteLine {
  text: string;
  color?: string;
  size?: number;
  weight?: number;
}

interface TextSpriteOptions {
  worldWidth: number;
  width?: number;
  padding?: number;
  gap?: number;
  background?: string;
  border?: string;
  opacity?: number;
}

/** Crisp, padded world-space label that remains readable over luminous scenes. */
export function textSprite(lines: TextSpriteLine[], options: TextSpriteOptions): Sprite {
  const width = options.width ?? 640;
  const padding = options.padding ?? 20;
  const gap = options.gap ?? 8;
  const heights = lines.map((line) => (line.size ?? 28) * 1.25);
  const height = Math.ceil(
    padding * 2 + heights.reduce((sum, value) => sum + value, 0) + gap * (lines.length - 1),
  );
  const tex = canvasTexture(
    width,
    height,
    (ctx) => {
      const radius = 18;
      ctx.beginPath();
      ctx.roundRect(2, 2, width - 4, height - 4, radius);
      ctx.fillStyle = options.background ?? 'rgba(5, 10, 28, 0.82)';
      ctx.fill();
      ctx.strokeStyle = options.border ?? 'rgba(142, 219, 255, 0.42)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let y = padding;
      lines.forEach((line, index) => {
        const size = line.size ?? 28;
        const lineHeight = heights[index];
        y += lineHeight / 2;
        ctx.font = `${line.weight ?? 600} ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillStyle = line.color ?? '#d9f5ff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 7;
        ctx.fillText(line.text, width / 2, y);
        y += lineHeight / 2 + gap;
      });
    },
    2,
  );
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;

  const sprite = new Sprite(
    new SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: options.opacity ?? 1,
    }),
  );
  sprite.scale.set(options.worldWidth, (options.worldWidth * height) / width, 1);
  sprite.renderOrder = 1000;
  return sprite;
}
