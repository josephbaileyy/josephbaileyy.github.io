import './styles/main.css';
import { Object3D, Quaternion, Vector3 } from 'three';
import { Camera } from './engine/camera';
import { HotspotManager } from './engine/hotspots';
import { attachInput } from './engine/input';
import { QualityMonitor } from './engine/quality';
import { Renderer3D, webgl2Available } from './engine/renderer';
import { FxPipeline } from './engine/renderer-fx';
import { projectToPx, scaleExponent } from './engine/rig';
import { fxAt, JumpController } from './engine/transitions';
import { World } from './engine/world';
import { SceneLoader } from './engine/loader';
import { CHAIN3D } from './scenes/registry';
import { Hud } from './ui/hud';
import { LoadingOverlay } from './ui/loading';
import { PanelHost } from './ui/panel';
import { ScaleRibbon } from './ui/scale-ribbon';
import { ScreenUi } from './ui/screen-ui';
import { Tour } from './ui/tour';
import { Router } from './router';
import { simulationClock } from './astronomy/clock';

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

const loading = new LoadingOverlay();
const loader = new SceneLoader(
  CHAIN3D,
  (_i, p) => {
    if (loading.visible) loading.progress(p);
  },
  (index, status) => {
    if (status === 'failed' && Math.abs(index - camera.depth) <= 1) {
      loading.fail(CHAIN3D[index].label, () => loader.retry(index));
    }
    if (status === 'ready' && loading.visible && world?.isReady(camera.depth)) loading.hide();
  },
);
const world = new World(CHAIN3D, loader);
const fx = new FxPipeline(renderer, world.root, world.camera);
fx.setSize(vp.w, vp.h);
const quality = new QualityMonitor();
const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
quality.configureDevice(vp.w * vp.h * (window.devicePixelRatio || 1) ** 2, deviceMemory);
const jump = new JumpController(camera, reduced);
const requestDestination = (index: number): void => {
  loader.request(index);
  loader.request(index - 1);
  loader.request(index + 1);
};

window.addEventListener('universe:navigate', (event) => {
  const index = (event as CustomEvent<number>).detail;
  if (!Number.isInteger(index) || index < 0 || index >= CHAIN3D.length) return;
  tour.cancel();
  requestDestination(index);
  jump.go(index, now());
});

let pendingPanel: { scene: number; id: string } | null = null;

const openPanel = (id: string, sceneIndex: number) => {
  panel.open(id);
  router.push(sceneIndex, id);
  if (id === 'am-cvn') {
    import('./ui/chirp').then(({ playChirp }) => playChirp());
  }
};

const hud = new Hud(
  hudEl,
  CHAIN3D,
  (index) => {
    tour.cancel();
    navigateTo(index);
  },
  (dir) => {
    tour.cancel();
    hud.hideHint();
    const target = Math.round(camera.depth) + dir;
    requestDestination(target);
    camera.tweenTo(target, now(), 0.9);
  },
  () => tour.start(),
);

// Shared navigation path (HUD dots + guided tour): prefetch, then fly via the
// JumpController so multi-level hops ramp/teleport/dive consistently.
const navigateTo = (index: number): void => {
  hud.hideHint();
  requestDestination(index);
  jump.go(index, now());
};

const markVisited = (): void => {
  try {
    localStorage.setItem('jb-visited', '1');
  } catch {
    /* private mode: just skip persistence */
  }
};
const firstVisit = ((): boolean => {
  try {
    return !localStorage.getItem('jb-visited');
  } catch {
    return false;
  }
})();

const tour = new Tour(hudEl, {
  navigateTo,
  reduced,
  onActiveChange: (active) => {
    hud.setTouring(active);
    if (active) markVisited();
  },
});
if (firstVisit) hud.pulseJourney();

// The BaileyOS terminal's hidden `tour` command hands off to the guided journey.
window.addEventListener('universe:tour', () => tour.start());

const ribbon = new ScaleRibbon(hudEl);
const SCENE_HINTS = [
  'select a glowing research object · scroll inward to travel',
  'choose a planet to focus · adjust UTC and playback above',
  'explore the globe · select Stanford to continue inward',
  'select the illuminated dorm window',
  'click the monitor to enter BaileyOS',
  'use the dock · drag, resize, minimize, or maximize windows',
] as const;

const SCREEN_INDEX = CHAIN3D.length - 1;
const a11yLayer = document.getElementById('a11y-layer')!;
const screenUi = new ScreenUi((id) => openPanel(id, SCREEN_INDEX));
let osBuilt = false;
let earthExplorer: import('./ui/earth-explorer').EarthExplorer | null = null;
let earthExplorerJob: Promise<void> | null = null;
const syncEarthExplorer = (settled: number | null) => {
  if (settled === 2) {
    earthExplorerJob ??= import('./ui/earth-explorer').then(({ EarthExplorer }) => {
      earthExplorer = new EarthExplorer();
      earthExplorer.setAvailable(camera.settledIndex === 2);
    });
  } else {
    earthExplorer?.setAvailable(false);
  }
};
const ensureFakeOs = () => {
  if (osBuilt) return Promise.resolve();
  return import('./ui/fake-os/os').then(({ buildFakeOs }) => {
    if (!osBuilt) {
      screenUi.setContent(buildFakeOs());
      osBuilt = true;
    }
  });
};

const hotspots = new HotspotManager(canvas, a11yLayer, world.camera, vp, (h) => {
  tour.cancel();
  hud.hideHint();
  if (h.action.type === 'panel') {
    openPanel(h.action.panelId, world.baseIndex());
  } else {
    const target = world.baseIndex() + (h.action.dir === 'in' ? 1 : -1);
    requestDestination(target);
    camera.tweenTo(target, now());
  }
});

function projectUiMountRect(uiMount: Object3D): { x: number; y: number; w: number; h: number } {
  uiMount.updateWorldMatrix(true, false);
  const w: number = uiMount.userData.w;
  const h: number = uiMount.userData.h;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const corner = new Vector3((sx * w) / 2, (sy * h) / 2, 0).applyMatrix4(uiMount.matrixWorld);
    const px = projectToPx(corner, world.camera, vp);
    minX = Math.min(minX, px.x);
    minY = Math.min(minY, px.y);
    maxX = Math.max(maxX, px.x);
    maxY = Math.max(maxY, px.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function syncScreenUi(settled: number | null): void {
  const uiMount = settled === SCREEN_INDEX ? world.baseInstance()?.uiMount : undefined;
  if (uiMount) {
    hud.setMode('computer');
    void ensureFakeOs().then(() => {
      if (camera.settledIndex !== SCREEN_INDEX) return;
      world.camera.updateMatrixWorld();
      screenUi.show(projectUiMountRect(uiMount), vp);
    });
  } else {
    hud.setMode('travel');
    screenUi.hide();
  }
}

const router = new Router(CHAIN3D, (state) => {
  panel.close();
  pendingPanel = state.panel ? { scene: state.scene, id: state.panel } : null;
  if (Math.abs(state.scene - camera.depth) > 1e-6) {
    tour.cancel();
    requestDestination(state.scene);
    jump.go(state.scene, now());
  }
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
  onFirstInteraction: () => {
    hud.hideHint();
    hud.stopPulse();
    markVisited();
  },
  // onSceneIntent fires only on genuine user gestures (wheel/pinch/dblclick/
  // keyboard), so it's the clean signal to bail out of the guided tour.
  onSceneIntent: (index) => {
    tour.cancel();
    requestDestination(index);
  },
  parallaxTarget,
});

window.addEventListener('resize', () => {
  vp.w = window.innerWidth;
  vp.h = window.innerHeight;
  renderer.resize(vp.w, vp.h);
  fx.setSize(vp.w, vp.h);
  hotspots.rebuildProxies();
  if (screenUi.visible) syncScreenUi(camera.settledIndex);
});

function applyQuality(): void {
  const tier = quality.tier;
  world.setQuality(tier);
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(
    tier === 'high' ? Math.min(dpr, 2) : tier === 'med' ? Math.min(dpr, 1.5) : 1,
  );
  renderer.resize(vp.w, vp.h);
  fx.setSize(vp.w, vp.h);
  document.body.dataset.quality = tier;
}

applyQuality();

// --- arrival: deep links start one scene above the target and glide in ---
const initial = router.parse();
if (initial) {
  if (initial.panel) pendingPanel = { scene: initial.scene, id: initial.panel };
  if (initial.scene > 0) {
    camera.depth = initial.scene - 1;
    camera.tweenTo(initial.scene, now() + 0.4, 1.6);
  }
}
// Warm only the active scene pair. Every settled scene prefetches its direct
// neighbours; the world remounts a plan as soon as a delayed instance arrives.
loader.request(Math.floor(camera.depth));
loader.request(Math.floor(camera.depth) + 1);

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
let lastBaseInstance: ReturnType<World['baseInstance']> = null;
let lastTime = now();

function frame(): void {
  const t = now();
  const dt = Math.min(t - lastTime, 0.05);
  lastTime = t;

  jump.update(t, (target) => {
    loader.request(target);
    if (target > 0) loader.request(target - 1);
    return loader.isReady(target) && (target === 0 || loader.isReady(target - 1));
  });
  camera.update(dt, t);

  // Hold a dive just short of an unloaded child. Keep momentum so motion
  // resumes as soon as the adjacent-scene prefetch completes.
  const maxD = world.maxTravelDepth(camera.depth);
  if (camera.depth > maxD) camera.depth = maxD;

  if (loading.visible && world.isReady(camera.depth)) loading.hide();
  const utcMs = simulationClock.tick(dt);
  world.update(camera.depth, vp, dt, t, reduced, utcMs);

  // parallax: damped head-sway, fading out while moving fast and at the screen
  if (!reduced) {
    const speed = Math.min(1, Math.abs(camera.vel) * 2 + (camera.isTweening ? 1 : 0));
    const dockFade = Math.min(1, Math.max(0, (4.6 - camera.depth) / 0.4));
    // The solar scene has screen-space scientific markers. Decorative head
    // sway there obscures orbital motion and can imply that bodies left their
    // trajectories, so it fades fully out at the settled solar level.
    const solarFade = Math.min(1, Math.abs(camera.depth - 1) / 0.2);
    const amp = PARALLAX_MAX * (1 - speed) * dockFade * solarFade;
    const k = Math.min(1, dt * 6);
    parallax.x += (parallaxTarget.x - parallax.x) * k;
    parallax.y += (parallaxTarget.y - parallax.y) * k;
    qParallax.setFromAxisAngle(vAxisY, -parallax.x * amp);
    world.camera.quaternion.multiply(qParallax);
    qParallax.setFromAxisAngle(vAxisX, -parallax.y * amp);
    world.camera.quaternion.multiply(qParallax);
  }

  world.camera.updateMatrixWorld();
  world.syncUi(vp);

  renderer.setExposure(exposureAt(camera.depth));
  if (quality.update(dt, t)) applyQuality();

  if (quality.tier === 'low') {
    renderer.render(world.root, world.camera);
  } else {
    fx.apply(fxAt(camera.depth, CHAIN3D, jump.streak(t), jump.flare(t)));
    fx.render(dt);
  }

  hud.setActive(Math.round(camera.depth));
  const idx = Math.round(Math.min(Math.max(camera.depth, 0), CHAIN3D.length - 1));
  ribbon.update(scaleExponent(camera.depth, CHAIN3D), camera.depth, CHAIN3D[idx].label);

  hotspots.update();

  const settled = camera.settledIndex;
  tour.update(t, settled);
  const baseInstance = settled !== null ? world.baseInstance() : null;
  if (settled !== lastSettled || baseInstance !== lastBaseInstance) {
    lastSettled = settled;
    lastBaseInstance = baseInstance;
    hotspots.setActive(baseInstance);
    syncScreenUi(settled);
    syncEarthExplorer(settled);
    if (settled !== null) {
      quality.setScene(CHAIN3D[settled].id);
      hud.announce(CHAIN3D[settled].label);
      if (!tour.active) hud.showHint(SCENE_HINTS[settled]);
      if (!panel.isOpen) router.replace(settled);
      if (pendingPanel && pendingPanel.scene === settled) {
        openPanel(pendingPanel.id, settled);
        pendingPanel = null;
      }
      for (let offset = -2; offset <= 2; offset++) loader.request(settled + offset);
      // Two scenes of headroom keeps rapid wheel/touch travel from outrunning
      // a dynamic import (most noticeably when returning to Stanford).
      loader.prune(settled, 2);
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
