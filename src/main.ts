import './styles/main.css';
import { Quaternion, Vector3 } from 'three';
import { Camera } from './engine/camera';
import { attachInput } from './engine/input';
import { QualityMonitor } from './engine/quality';
import { Renderer3D, webgl2Available } from './engine/renderer';
import { FxPipeline } from './engine/renderer-fx';
import { scaleExponent } from './engine/rig';
import { fxAt, JumpController } from './engine/transitions';
import { World, type SceneSource } from './engine/world';
import type { SceneInstance } from './engine/types3d';
import { CHAIN3D } from './scenes/registry';
import { Hud } from './ui/hud';
import { PanelHost } from './ui/panel';
import { ScaleRibbon } from './ui/scale-ribbon';
import { Router } from './router';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const now = () => performance.now() / 1000;

const canvas = document.getElementById('universe') as HTMLCanvasElement;
const hudEl = document.getElementById('hud')!;

// --- WebGL2 gate: this is a WebGL universe; everyone else gets the plain site ---
if (!webgl2Available()) {
  const note = document.createElement('div');
  note.className = 'webgl-fallback';
  note.innerHTML = `
    <p>This site is a 3D universe and needs WebGL.</p>
    <p><a href="/about.html">Visit the plain version instead →</a></p>`;
  document.body.appendChild(note);
  canvas.remove();
  throw new Error('WebGL2 unavailable');
}

const vp = { w: window.innerWidth, h: window.innerHeight };
const camera = new Camera(CHAIN3D.length, reduced);
const panel = new PanelHost();
const renderer = new Renderer3D(canvas);
renderer.resize(vp.w, vp.h);

/** Synchronous placeholder factories (async loader lands with real scenes). */
class SyncSource implements SceneSource {
  private cache = new Map<number, SceneInstance>();
  get(i: number): SceneInstance | null {
    let inst = this.cache.get(i);
    if (!inst) {
      inst = CHAIN3D[i].create({});
      this.cache.set(i, inst);
    }
    return inst;
  }
  request(): void {}
}

const world = new World(CHAIN3D, new SyncSource());
const fx = new FxPipeline(renderer, world.root, world.camera);
fx.setSize(vp.w, vp.h);
const quality = new QualityMonitor();
const jump = new JumpController(camera, reduced);

let pendingPanel: { scene: number; id: string } | null = null;

const openPanel = (id: string, sceneIndex: number) => {
  panel.open(id);
  router.push(sceneIndex, id);
};

const hud = new Hud(
  hudEl,
  CHAIN3D,
  (index) => {
    hud.hideHint();
    jump.go(index, now());
  },
  (dir) => {
    hud.hideHint();
    camera.tweenTo(Math.round(camera.depth) + dir, now(), 0.9);
  },
);
const ribbon = new ScaleRibbon(hudEl);

const router = new Router(CHAIN3D, (state) => {
  panel.close();
  pendingPanel = state.panel ? { scene: state.scene, id: state.panel } : null;
  if (Math.abs(state.scene - camera.depth) > 1e-6) jump.go(state.scene, now());
});

panel.onClose = () => {
  router.replace(Math.round(camera.depth));
};

const parallaxTarget = { x: 0, y: 0 };
const parallax = { x: 0, y: 0 };
const PARALLAX_MAX = (1.6 * Math.PI) / 180;
const qParallax = new Quaternion();
const vAxisX = new Vector3(1, 0, 0);
const vAxisY = new Vector3(0, 1, 0);

attachInput(canvas, camera, {
  reducedMotion: reduced,
  isModalOpen: () => panel.isOpen,
  onFirstInteraction: () => hud.hideHint(),
  parallaxTarget,
});

window.addEventListener('resize', () => {
  vp.w = window.innerWidth;
  vp.h = window.innerHeight;
  renderer.resize(vp.w, vp.h);
  fx.setSize(vp.w, vp.h);
});

function applyQuality(): void {
  const tier = quality.tier;
  world.setQuality(tier);
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(tier === 'high' ? Math.min(dpr, 2) : tier === 'med' ? Math.min(dpr, 1.5) : 1);
  renderer.resize(vp.w, vp.h);
  fx.setSize(vp.w, vp.h);
}

// --- arrival: deep links start one scene above the target and glide in ---
const initial = router.parse();
if (initial) {
  if (initial.panel) pendingPanel = { scene: initial.scene, id: initial.panel };
  if (initial.scene > 0) {
    camera.depth = initial.scene - 1;
    camera.tweenTo(initial.scene, now() + 0.4, 1.6);
  }
}

function exposureAt(depth: number): number {
  const n = CHAIN3D.length;
  const d = Math.min(Math.max(depth, 0), n - 1);
  const i = Math.min(Math.floor(d), n - 2);
  const t = d - i;
  const a = CHAIN3D[i].exposure ?? 1;
  const b = CHAIN3D[i + 1].exposure ?? 1;
  return a + (b - a) * t;
}

// --- main loop ---
let lastSettled: number | null = -1;
let lastTime = now();

function frame(): void {
  const t = now();
  const dt = Math.min(t - lastTime, 0.05);
  lastTime = t;

  jump.update(t);
  camera.update(dt, t);
  world.update(camera.depth, vp, dt, t, reduced);

  // parallax: damped head-sway, fading out while moving fast and at the screen
  if (!reduced) {
    const speed = Math.min(1, Math.abs(camera.vel) * 2 + (camera.isTweening ? 1 : 0));
    const dockFade = Math.min(1, Math.max(0, (4.6 - camera.depth) / 0.4));
    const amp = PARALLAX_MAX * (1 - speed) * dockFade;
    const k = Math.min(1, dt * 6);
    parallax.x += (parallaxTarget.x - parallax.x) * k;
    parallax.y += (parallaxTarget.y - parallax.y) * k;
    qParallax.setFromAxisAngle(vAxisY, -parallax.x * amp);
    world.camera.quaternion.multiply(qParallax);
    qParallax.setFromAxisAngle(vAxisX, -parallax.y * amp);
    world.camera.quaternion.multiply(qParallax);
  }

  renderer.setExposure(exposureAt(camera.depth));
  if (quality.update(dt, t)) applyQuality();

  if (quality.tier === 'low') {
    renderer.render(world.root, world.camera);
  } else {
    fx.apply(fxAt(camera.depth, CHAIN3D, jump.streak(t)));
    fx.render(dt);
  }

  hud.setActive(Math.round(camera.depth));
  const idx = Math.round(Math.min(Math.max(camera.depth, 0), CHAIN3D.length - 1));
  ribbon.update(scaleExponent(camera.depth, CHAIN3D), camera.depth, CHAIN3D[idx].label);

  const settled = camera.settledIndex;
  if (settled !== lastSettled) {
    lastSettled = settled;
    if (settled !== null) {
      hud.announce(CHAIN3D[settled].label);
      if (!panel.isOpen) router.replace(settled);
      if (pendingPanel && pendingPanel.scene === settled) {
        openPanel(pendingPanel.id, settled);
        pendingPanel = null;
      }
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
