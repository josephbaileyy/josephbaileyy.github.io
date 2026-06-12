import './styles/main.css';
import { Camera } from './engine/camera';
import { attachInput } from './engine/input';
import { Renderer3D, webgl2Available } from './engine/renderer';
import { scaleExponent } from './engine/rig';
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

/** Milestone source: synchronous placeholder factories (async loader lands later). */
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
    const dist = Math.abs(index - camera.depth);
    camera.tweenTo(index, now(), 0.7 + 0.4 * dist);
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
  const dist = Math.abs(state.scene - camera.depth);
  if (dist > 1e-6) camera.tweenTo(state.scene, now(), 0.7 + 0.4 * dist);
});

panel.onClose = () => {
  router.replace(Math.round(camera.depth));
};

attachInput(canvas, camera, {
  reducedMotion: reduced,
  isModalOpen: () => panel.isOpen,
  onFirstInteraction: () => hud.hideHint(),
});

window.addEventListener('resize', () => {
  vp.w = window.innerWidth;
  vp.h = window.innerHeight;
  renderer.resize(vp.w, vp.h);
});

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

  camera.update(dt, t);

  world.update(camera.depth, vp, dt, t, reduced);
  renderer.setExposure(exposureAt(camera.depth));
  renderer.render(world.root, world.camera);

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
