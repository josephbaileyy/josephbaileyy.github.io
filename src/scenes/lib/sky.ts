import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Texture,
} from 'three';
import { daysSinceJ2000 } from './astro';
import type { StarData } from './assets';

const OBLIQUITY = (23.44 * Math.PI) / 180;

export interface SkyOptions {
  radius?: number;
  /** rotate equatorial→ecliptic (solar scene's y=0 is the ecliptic) */
  ecliptic?: boolean;
  /** rotate by Greenwich sidereal time (earth scene is Earth-fixed) */
  earthFixed?: boolean;
  panorama?: Texture;
  panoramaIntensity?: number;
}

/**
 * The night sky: real HYG stars as screen-sized points (constellations are
 * correct) over the ESO Milky Way panorama band.
 */
export function makeSky(stars: StarData, opts: SkyOptions = {}): Group {
  const group = new Group();
  const R = opts.radius ?? 900;

  const geo = new BufferGeometry();
  const positions = new Float32Array(stars.count * 3);
  for (let i = 0; i < stars.count * 3; i++) positions[i] = stars.positions[i] * R;
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new BufferAttribute(stars.colors, 3));
  geo.setAttribute('aSize', new BufferAttribute(stars.sizes, 1));

  const mat = new ShaderMaterial({
    uniforms: { uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uScale;
      attribute vec3 aColor;
      attribute float aSize;
      varying vec3 vColor;
      void main() {
        vColor = aColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.12, d);
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  group.add(new Points(geo, mat));

  if (opts.panorama) {
    const pano = new Mesh(
      new SphereGeometry(R * 1.4, 48, 32),
      new MeshBasicMaterial({
        map: opts.panorama,
        side: BackSide,
        transparent: true,
        opacity: opts.panoramaIntensity ?? 0.5,
        depthWrite: false,
      }),
    );
    // ESO pano is in galactic-ish orientation; tip it so the band crosses the
    // sky plausibly relative to the equatorial star grid.
    pano.rotation.set(1.05, 0.4, 0.0);
    group.add(pano);
  }

  if (opts.ecliptic) group.rotation.x = -OBLIQUITY;
  if (opts.earthFixed) {
    // approximate GMST so the sky sits right for the actual time of day
    const gmstDeg = (280.46061837 + 360.98564736629 * daysSinceJ2000()) % 360;
    group.rotation.y = (-gmstDeg * Math.PI) / 180;
  }
  return group;
}
