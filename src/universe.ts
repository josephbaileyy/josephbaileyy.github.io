import './styles/main.css';
import { Object3D, Quaternion, Vector3 } from 'three';
import { Camera } from './engine/camera';
import { HotspotManager } from './engine/hotspots';
import { attachInput } from './engine/input';
import { QualityMonitor } from './engine/quality';
import { Renderer3D, webgl2Available } from './engine/renderer';
import type { FxPipeline } from './engine/renderer-fx';
import { detectDeviceProfile, isKeyboardOnlyViewportResize, viewportSize } from './engine/device';
import { projectToPx, scaleExponent } from './engine/rig';
import { fxAt, JumpController } from './engine/transitions';
import { World } from './engine/world';
import { SceneLoader } from './engine/loader';
import { branchForHash, chainForBranch } from './scenes/registry';
import { Hud, type ObservationDestination } from './ui/hud';
import { LoadingOverlay } from './ui/loading';
import { PanelHost } from './ui/panel';
import { ScaleRibbon } from './ui/scale-ribbon';
import { ScreenUi } from './ui/screen-ui';
import { Tour } from './ui/tour';
import { Router } from './router';
import { simulationClock } from './astronomy/clock';
import { AmbientSound } from './ui/ambient';
import { SCENES, SIGNAL_BY_ID, type SceneDestination } from './content/portfolio';
import { initAnalytics, trackEvent } from './analytics';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const now = () => performance.now() / 1000;
const BRANCH = branchForHash(location.hash);
const CHAIN3D = chainForBranch(BRANCH);

const canvas = document.getElementById('universe') as HTMLCanvasElement;
const hudEl = document.getElementById('hud')!;
const device = detectDeviceProfile();
document.body.dataset.browserEngine = device.isWebKit ? 'webkit' : 'other';
document.body.dataset.deviceClass = device.isMobile ? 'mobile' : 'desktop';
document.body.dataset.inputMode = device.isCoarsePointer ? 'touch' : 'pointer';
document.body.dataset.postfx = device.disablePostFx ? 'off' : device.softenPostFx ? 'soft' : 'full';
document.body.dataset.textureDecode = device.constrainedTextureDecode ? 'constrained' : 'full';
initAnalytics();

// --- WebGL2 gate: this is a WebGL universe; everyone else gets the quick portfolio ---
if (!webgl2Available()) {
  const note = document.createElement('div');
  note.className = 'webgl-fallback';
  note.innerHTML = `
    <p>This site is a 3D universe and needs WebGL.</p>
    <p><a href="/about.html">Open the quick portfolio instead →</a></p>`;
  document.body.appendChild(note);
  canvas.remove();
  trackEvent('webgl-fallback');
  throw new Error('WebGL2 unavailable');
}

const vp = viewportSize();
function syncViewportCss(): void {
  document.documentElement.style.setProperty('--app-height', `${vp.h}px`);
  document.documentElement.style.setProperty('--app-width', `${vp.w}px`);
}
syncViewportCss();
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
let fx: FxPipeline | null = null;
if (!device.disablePostFx) {
  void import('./engine/renderer-fx').then(({ FxPipeline: Pipeline }) => {
    fx = new Pipeline(renderer, world.root, world.camera, { soft: device.softenPostFx });
    fx.setSize(vp.w, vp.h);
  });
}
const quality = new QualityMonitor();
const deviceMemory =
  (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? (device.lowPowerGpu ? 4 : 8);
quality.configureDevice(vp.w * vp.h * (window.devicePixelRatio || 1) ** 2, deviceMemory, device);
const jump = new JumpController(camera, reduced);
const ambient = new AmbientSound();
let scaleMode: 'cinematic' | 'real' = 'cinematic';
let driftMode = false;
let pendingOsApp: string | null = null;
let osBuilt = false;
document.body.dataset.scaleMode = scaleMode;

function clampedSceneIndex(index: number): number {
  return Math.min(Math.max(Math.round(index), 0), CHAIN3D.length - 1);
}

function requestOsAppOpen(appId: string): void {
  if (osBuilt && Math.round(camera.depth) === SCREEN_INDEX) {
    window.dispatchEvent(new CustomEvent('universe:open-app', { detail: appId }));
  } else {
    pendingOsApp = appId;
  }
}

window.addEventListener('universe:navigate', (event) => {
  const index = (event as CustomEvent<number>).detail;
  if (!Number.isInteger(index) || index < 0 || index >= CHAIN3D.length) return;
  tour.cancel();
  navigateTo(index);
});

let pendingPanel: { scene: number; id: string } | null = null;

const openPanel = (id: string, sceneIndex: number, syncRoute = true) => {
  trackEvent(`panel-${id}`);
  panel.open(id);
  if (syncRoute) router.push(sceneIndex, id);
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
    travelToScene(target, 0.9);
  },
  () => tour.start(),
  {
    onScaleToggle: () => {
      scaleMode = scaleMode === 'cinematic' ? 'real' : 'cinematic';
      document.body.dataset.scaleMode = scaleMode;
      window.dispatchEvent(new CustomEvent('universe:scale-mode', { detail: scaleMode }));
      return scaleMode;
    },
    onAmbientToggle: () => ambient.toggle(),
    onDriftToggle: () => {
      driftMode = !driftMode;
      document.body.dataset.driftMode = driftMode ? 'on' : 'off';
      return driftMode;
    },
    onOpenPanel: (id) => {
      tour.cancel();
      openPanel(id, Math.round(camera.depth));
    },
    onOpenDestination: (destination: ObservationDestination) => {
      tour.cancel();
      performDestination(destination);
    },
  },
);

// Shared navigation path (HUD dots + guided tour): prefetch, then fly via the
// JumpController so multi-level hops ramp/teleport/dive consistently.
const navigateTo = (index: number, syncRoute = true): void => {
  const target = clampedSceneIndex(index);
  hud.hideHint();
  beginTravel(target, { kind: 'jump', syncRoute });
};

const travelToScene = (index: number, duration = 1.2, syncRoute = true): void => {
  const target = clampedSceneIndex(index);
  hud.hideHint();
  beginTravel(target, { kind: 'tween', duration, syncRoute });
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
    if (active) {
      markVisited();
      trackEvent('tour-start');
    }
  },
});
if (firstVisit) hud.pulseJourney();

// The BaileyOS terminal command and dock 'journey' icon hand off to the tour.
window.addEventListener('universe:tour', () => tour.start());
window.addEventListener('universe:signal', (event) => {
  const detail = (event as CustomEvent<string | { signalId: string; route?: boolean }>).detail;
  const signalId = typeof detail === 'string' ? detail : detail.signalId;
  const shouldRoute = typeof detail === 'string' ? true : detail.route !== false;
  const signal = SIGNAL_BY_ID.get(signalId);
  if (!signal) return;
  const destination = toHudDestination(signal.destination);
  hud.collectSignal(signal.id, signal.title, signal.body, destination);
  if (shouldRoute && destination) performDestination(destination);
});

const ribbon = new ScaleRibbon(hudEl);
const SCENE_HINTS = [
  ...(BRANCH === 'fermilab'
    ? [
        'select a glowing research object · scroll inward to travel',
        'choose a planet to focus · adjust UTC and playback above',
        'drag the globe · choose Fermilab or Stanford',
        'descend from the prairie into the NuMI hall',
        'enter the MINERvA active volume',
        'compare raw clusters with engineered scalars',
      ]
    : [
        'select a glowing research object · scroll inward to travel',
        'choose a planet to focus · adjust UTC and playback above',
        'drag the globe · select a coordinate · choose Stanford to continue inward',
        'select the illuminated dorm window',
        'click the monitor to enter BaileyOS',
        'use the dock · drag, resize, minimize, or maximize windows',
      ]),
];

const OBSERVATIONS: Record<string, { body: string; destination?: ObservationDestination }> = {
  galaxy: {
    body: 'The Milky Way scene uses layered procedural stars, dust, and research beacons.',
    destination: { type: 'panel', panelId: 'research', label: 'Open research signals' },
  },
  solar: {
    body: 'Planet positions come from checked-in JPL ephemeris data; the scale toggle changes visual body size only.',
    destination: { type: 'scene', index: 2, label: 'Continue to Earth' },
  },
  earth: {
    body: 'Earth uses a live terminator so day and night follow the selected time.',
    destination: { type: 'scene', index: 3, label: 'Locate Stanford' },
  },
  stanford: {
    body: 'The Stanford scene is the handoff from planet scale into a lived-in campus scale.',
    destination: { type: 'scene', index: 4, label: 'Enter the room' },
  },
  room: {
    body: 'The dorm-room hop uses the lit monitor as a physical portal into BaileyOS.',
    destination: { type: 'scene', index: 5, label: 'Dock at BaileyOS' },
  },
  screen: {
    body: 'BaileyOS is a DOM mission desktop projected onto the monitor inside the 3D universe.',
    destination: { type: 'app', appId: 'start', label: 'Open Start Here' },
  },
  fermilab: {
    body: 'Detour: Batavia, IL — Wilson Hall, the Main Injector, and the source of the MINERvA data.',
    destination: { type: 'scene', index: 4, label: 'Descend into NuMI' },
  },
  'numi-hall': {
    body: 'Hexagonal MINERvA scintillator planes sit upstream of the MINOS near-detector muon spectrometer.',
    destination: { type: 'scene', index: 5, label: 'Inspect one interaction' },
  },
  event: {
    body: 'A deterministic synthetic event contrasts engineered summary variables with the raw cluster cloud.',
  },
};

const HOTSPOT_OBSERVATIONS: Record<string, { body: string; destination?: ObservationDestination }> =
  {
    'am-cvn': {
      body: 'AM CVn systems are helium-transferring compact binaries; the model shows a disk, stream, and hot spot.',
      destination: { type: 'panel', panelId: 'am-cvn', label: 'Reopen observation note' },
    },
    research: {
      body: 'The pulsar marker gathers the particle, neutrino, and collider-ML side of the portfolio.',
      destination: { type: 'panel', panelId: 'research', label: 'Open research dossier' },
    },
  };

const SCREEN_INDEX = CHAIN3D.findIndex((scene) => scene.id === 'screen');
const a11yLayer = document.getElementById('a11y-layer')!;
const screenUi = new ScreenUi((id) => openPanel(id, SCREEN_INDEX));
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
      if (pendingOsApp) {
        requestOsAppOpen(pendingOsApp);
        pendingOsApp = null;
      }
    }
  });
};

const hotspots = new HotspotManager(canvas, a11yLayer, world.camera, vp, (h) => {
  tour.cancel();
  hud.hideHint();
  if (h.action.type === 'signal') {
    const signal = SIGNAL_BY_ID.get(h.action.signalId);
    if (!signal) return;
    const destination = toHudDestination(signal.destination);
    hud.collectSignal(signal.id, signal.title, signal.body, destination);
    if (h.action.route !== false && destination) performDestination(destination);
  } else if (h.action.type === 'panel') {
    const observation = HOTSPOT_OBSERVATIONS[h.action.panelId];
    hud.collectSignal(
      h.action.panelId,
      h.label,
      observation?.body ?? 'Opened a research note from the 3D scene.',
      observation?.destination,
    );
    openPanel(h.action.panelId, world.baseIndex());
  } else if (h.action.type === 'navigate') {
    navigateTo(h.action.index);
  } else if (h.action.type === 'app') {
    performDestination({ type: 'app', appId: h.action.appId, label: h.label });
  } else if (h.action.type === 'branch') {
    switchBranch(h.action.branch, h.action.destination);
  } else {
    const target = world.baseIndex() + (h.action.dir === 'in' ? 1 : -1);
    travelToScene(target);
  }
});

function switchBranch(branch: 'stanford' | 'fermilab', route: string): void {
  if (branch === BRANCH) return;
  const place = branch === 'fermilab' ? 'Batavia, IL' : 'Stanford, CA';
  hud.announceStatus(`Rerouting: ${place}`);
  document.body.dataset.rerouting = branch;
  history.pushState({ universeBranch: branch }, '', `#/${route}`);
  window.setTimeout(() => location.reload(), reduced ? 0 : 180);
}

window.addEventListener('universe:branch-route', (event) => {
  const detail = (event as CustomEvent<{ branch: 'stanford' | 'fermilab'; route: string }>).detail;
  if (!detail) return;
  switchBranch(detail.branch, detail.route);
});

const reloadForCrossBranchHistory = () => {
  const uniqueIntent = location.hash.match(
    /^#\/(stanford|room|screen|fermilab|numi-hall|event)(?:\/|$)/,
  )?.[1];
  if (!uniqueIntent) return;
  const intended = /^(fermilab|numi-hall|event)$/.test(uniqueIntent) ? 'fermilab' : 'stanford';
  if (intended !== BRANCH) location.reload();
};
window.addEventListener('hashchange', reloadForCrossBranchHistory);
window.addEventListener('popstate', reloadForCrossBranchHistory);

function performDestination(destination: ObservationDestination): void {
  if (destination.type === 'panel') {
    openPanel(destination.panelId, Math.round(camera.depth));
  } else if (destination.type === 'scene') {
    navigateTo(destination.index);
  } else if (destination.type === 'app') {
    if (SCREEN_INDEX < 0) {
      switchBranch('stanford', `screen/app/${encodeURIComponent(destination.appId)}`);
      return;
    }
    if (osBuilt && Math.round(camera.depth) === CHAIN3D.length - 1) {
      requestOsAppOpen(destination.appId);
    } else {
      pendingOsApp = destination.appId;
      navigateTo(CHAIN3D.length - 1);
    }
  } else if (destination.type === 'url') {
    window.open(
      destination.href,
      destination.href.startsWith('http') ? '_blank' : '_self',
      'noopener',
    );
  }
}

function toHudDestination(destination?: SceneDestination): ObservationDestination | undefined {
  if (!destination) return undefined;
  if (destination.type === 'panel' && destination.panelId) {
    return { type: 'panel', panelId: destination.panelId, label: destination.label };
  }
  if (destination.type === 'scene' && typeof destination.index === 'number') {
    return { type: 'scene', index: destination.index, label: destination.label };
  }
  if (destination.type === 'app' && destination.appId) {
    return { type: 'app', appId: destination.appId, label: destination.label };
  }
  if (destination.type === 'url' && destination.href) {
    return { type: 'url', href: destination.href, label: destination.label };
  }
  return undefined;
}

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
  tour.cancel();
  panel.close();
  pendingPanel = state.panel ? { scene: state.scene, id: state.panel } : null;
  if (!state.app && activeRouteApp && state.scene === SCREEN_INDEX) {
    suppressNextAppCloseRoute = true;
    window.dispatchEvent(new CustomEvent('universe:close-app', { detail: activeRouteApp }));
    activeRouteApp = null;
  }
  if (state.app) {
    activeRouteApp = state.app;
    requestOsAppOpen(state.app);
  } else if (state.scene !== SCREEN_INDEX) {
    activeRouteApp = null;
    pendingOsApp = null;
  }
  if (Math.abs(state.scene - camera.depth) > 1e-6) {
    beginTravel(state.scene, { kind: 'jump', syncRoute: false });
  } else if (pendingPanel && camera.settledIndex === state.scene) {
    openPanel(pendingPanel.id, state.scene, false);
    pendingPanel = null;
  } else if (state.app && camera.settledIndex === SCREEN_INDEX) {
    requestOsAppOpen(state.app);
  }
});

panel.onClose = () => {
  router.replace(Math.round(camera.depth));
};

let activeRouteApp: string | null = null;
let suppressNextAppCloseRoute = false;

window.addEventListener('universe:app-opened', (event) => {
  const appId = (event as CustomEvent<string>).detail;
  if (!appId || Math.round(camera.depth) !== SCREEN_INDEX) return;
  activeRouteApp = appId;
  if (router.parse()?.app === appId) return;
  router.push(SCREEN_INDEX, undefined, appId);
});

window.addEventListener('universe:app-closed', () => {
  if (suppressNextAppCloseRoute) {
    suppressNextAppCloseRoute = false;
    return;
  }
  if (!activeRouteApp || Math.round(camera.depth) !== SCREEN_INDEX) return;
  activeRouteApp = null;
  router.replace(SCREEN_INDEX);
});

const parallaxTarget = { x: 0, y: 0 };
const parallax = { x: 0, y: 0 };
const PARALLAX_MAX = (1.6 * Math.PI) / 180;
const qParallax = new Quaternion();
const vAxisX = new Vector3(1, 0, 0);
const vAxisY = new Vector3(0, 1, 0);
const vDriftRight = new Vector3();
const vDriftUp = new Vector3();

attachInput(canvas, camera, {
  reducedMotion: reduced,
  isModalOpen: () => panel.isOpen,
  onFirstInteraction: () => {
    hud.hideHint();
    hud.stopPulse();
    markVisited();
    scheduleIntentIdlePrefetch();
  },
  // onSceneIntent fires only on genuine user gestures (wheel/pinch/dblclick/
  // keyboard), so it's the clean signal to bail out of the guided tour.
  onSceneIntent: (index) => {
    tour.cancel();
    const direction = Math.sign(index - Math.round(camera.depth));
    const routeScene = router.parse()?.scene;
    const target = clampedSceneIndex(
      reduced && routeScene !== undefined ? routeScene + direction : index,
    );
    beginTravel(target, { kind: 'tween', duration: 0.9, syncRoute: true });
    return true;
  },
  parallaxTarget,
});

function handleViewportChange(): void {
  const next = viewportSize();
  const active = document.activeElement;
  const editing =
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    (active instanceof HTMLElement && active.isContentEditable);
  const keyboardOnlyResize = isKeyboardOnlyViewportResize(vp, next, device.isMobile, editing);
  if (keyboardOnlyResize) return;
  vp.w = next.w;
  vp.h = next.h;
  syncViewportCss();
  renderer.resize(vp.w, vp.h);
  fx?.setSize(vp.w, vp.h);
  hotspots.rebuildProxies();
  if (screenUi.visible) syncScreenUi(camera.settledIndex);
}

window.addEventListener('resize', handleViewportChange);
window.visualViewport?.addEventListener('resize', handleViewportChange);
window.visualViewport?.addEventListener('scroll', handleViewportChange);

function applyQuality(): void {
  const tier = quality.renderTier;
  world.setQuality(tier);
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(Math.min(dpr, device.maxDpr[tier]));
  renderer.resize(vp.w, vp.h);
  fx?.setSize(vp.w, vp.h);
  document.body.dataset.quality = tier;
}

applyQuality();

type TravelOptions =
  | { kind: 'jump'; syncRoute: boolean; deferPrepare?: boolean }
  | { kind: 'tween'; duration: number; syncRoute: boolean; deferPrepare?: boolean };

let travelToken = 0;
let activeTravel:
  | {
      token: number;
      target: number;
      started: boolean;
      preparingTimer: number;
    }
  | undefined;
let intentIdleScheduled = false;
let sceneReadyToken = 0;

function clearSceneReady(): number {
  sceneReadyToken += 1;
  delete document.body.dataset.sceneReady;
  document.body.dataset.sceneReadyState = 'loading';
  return sceneReadyToken;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function prepareSettledSceneReady(scene: number, token: number): Promise<void> {
  const instance = world.baseInstance();
  if (!instance || !world.isReady(scene)) return;
  instance.setQuality(quality.renderTier);

  if (scene === SCREEN_INDEX) {
    const uiMount = world.baseInstance()?.uiMount;
    if (uiMount) {
      await ensureFakeOs();
      if (camera.settledIndex !== SCREEN_INDEX || !world.isReady(scene)) return;
      world.camera.updateMatrixWorld();
      screenUi.show(projectUiMountRect(uiMount), vp);
    }
  }

  await nextAnimationFrame();
  if (token !== sceneReadyToken || camera.settledIndex !== scene || !world.isReady(scene)) return;
  document.body.dataset.sceneReady = CHAIN3D[scene].id;
  document.body.dataset.sceneReadyState = 'ready';
  window.dispatchEvent(
    new CustomEvent('universe:scene-ready', {
      detail: {
        index: scene,
        scene: CHAIN3D[scene].id,
        quality: quality.renderTier,
        textureDecode: document.body.dataset.textureDecode,
      },
    }),
  );
}

function requiredScenesForTravel(target: number): number[] {
  const inward = target > camera.depth;
  const indexes = inward ? [target - 1, target] : [target, target + 1];
  return [...new Set(indexes.filter((index) => index >= 0 && index < CHAIN3D.length))];
}

function scenesForDeepLink(target: number): number[] {
  const approach = target > 0 ? target - 1 : target;
  return [...new Set([approach, target].filter((index) => index >= 0 && index < CHAIN3D.length))];
}

function scenesToPrepare(target: number): number[] {
  const distance = Math.abs(target - camera.depth);
  if (distance <= 1.5) return [target];
  const approach = target > camera.depth ? target - 1 : target + 1;
  return [approach, target].filter((index) => index >= 0 && index < CHAIN3D.length);
}

function cancelPreparation(token = activeTravel?.token): void {
  if (!activeTravel || activeTravel.token !== token || activeTravel.started) return;
  travelToken += 1;
  clearSceneReady();
  clearTimeout(activeTravel.preparingTimer);
  activeTravel = undefined;
  jump.cancel();
  camera.stop();
  if (quality.endTransition(now())) applyQuality();
  const current = clampedSceneIndex(camera.depth);
  router.replace(current);
  hud.setActive(current);
  if (world.isReady(current)) hud.announce(CHAIN3D[current].label);
}

function beginTravel(target: number, options: TravelOptions): void {
  target = clampedSceneIndex(target);
  if (activeTravel?.target === target) return;
  if (!activeTravel && camera.settledIndex === target && world.isReady(target)) {
    if (options.syncRoute) router.push(target);
    hud.announce(CHAIN3D[target].label);
    return;
  }

  if (activeTravel && !activeTravel.started) cancelPreparation(activeTravel.token);
  const token = ++travelToken;
  clearSceneReady();
  jump.cancel();
  camera.stop();
  hud.traveling(target);
  if (options.syncRoute) router.push(target);
  if (quality.beginTransition()) applyQuality();

  const preparingTimer = window.setTimeout(() => {
    if (activeTravel?.token === token && !activeTravel.started) {
      hud.showPreparing(target, () => cancelPreparation(token));
    }
  }, 400);
  activeTravel = { token, target, started: false, preparingTimer };
  if (reduced) {
    activeTravel.started = true;
    clearTimeout(preparingTimer);
    camera.tweenTo(target, now(), 0);
  }

  void (async () => {
    const required = requiredScenesForTravel(target);
    // Reduced motion uses an instant cut, so there is no visible tween to
    // protect and no reason to delay arrival on shader preparation.
    const prepare = reduced || options.deferPrepare ? [] : scenesToPrepare(target);
    await Promise.all(required.map((index) => loader.ensure(index)));
    if (reduced) return;
    if (activeTravel?.token !== token) return;
    if (required.some((index) => !loader.isReady(index))) {
      cancelPreparation(token);
      return;
    }

    for (const index of prepare) {
      const instance = loader.get(index);
      if (instance) {
        instance.setQuality(quality.renderTier);
        await renderer.prepare(instance.group, world.camera);
      }
      if (activeTravel?.token !== token) return;
    }

    clearTimeout(preparingTimer);
    if (!activeTravel || activeTravel.token !== token) return;
    activeTravel.started = true;
    hud.traveling(target);
    const startedAt = now();
    if (options.kind === 'jump') jump.go(target, startedAt);
    else camera.tweenTo(target, startedAt, options.duration);
  })().catch((error) => {
    console.error(`failed to prepare ${CHAIN3D[target].id}`, error);
    cancelPreparation(token);
  });
}

function scheduleIntentIdlePrefetch(): void {
  if (intentIdleScheduled) return;
  intentIdleScheduled = true;
  const run = () => {
    intentIdleScheduled = false;
    const target = Math.min(CHAIN3D.length - 1, Math.round(camera.depth) + 1);
    if (target !== Math.round(camera.depth)) loader.request(target);
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 3000 });
  } else {
    globalThis.setTimeout(run, 1500);
  }
}

// --- arrival: deep links start one scene above the target and glide in ---
const initial = router.parse();
const initialRequests = new Set<number>();
clearSceneReady();
if (initial) {
  if (initial.panel) pendingPanel = { scene: initial.scene, id: initial.panel };
  if (initial.app) {
    activeRouteApp = initial.app;
    requestOsAppOpen(initial.app);
  }
  for (const index of scenesForDeepLink(initial.scene)) initialRequests.add(index);
  if (initial.scene === SCREEN_INDEX) void ensureFakeOs();
  if (initial.scene > 0) {
    camera.depth = reduced ? initial.scene : initial.scene - 1;
    beginTravel(initial.scene, {
      kind: 'tween',
      duration: 0.9,
      syncRoute: false,
      deferPrepare: CHAIN3D[initial.scene].id === 'solar',
    });
  }
}
// Initial paint needs only the visible base. Adjacent JavaScript manifests are
// cheap to speculate; their texture/ephemeris loaders remain untouched.
initialRequests.add(Math.floor(camera.depth));
for (const index of initialRequests) loader.request(index);
void loader.warmManifest(Math.floor(camera.depth) + 1);

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
  const rawDt = t - lastTime;
  const dt = Math.min(rawDt, 0.05);
  lastTime = t;

  jump.update(t, (target) => {
    loader.request(target);
    if (target > 0) loader.request(target - 1);
    return loader.isReady(target) && (target === 0 || loader.isReady(target - 1));
  });
  camera.update(dt, t);

  // Hold a dive just short of an unloaded child. Keep momentum so motion
  // resumes as soon as the adjacent-scene prefetch completes.
  if (camera.isTweening || Math.abs(camera.vel) > 1e-4) {
    const maxD = world.maxTravelDepth(camera.depth);
    if (camera.depth > maxD) camera.depth = maxD;
  }

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
    if (driftMode) {
      const sceneIndex = Math.round(Math.min(Math.max(camera.depth, 0), CHAIN3D.length - 1));
      const driftAmp = CHAIN3D[sceneIndex].restPose.frameWidth * 0.028 * dockFade;
      vDriftRight
        .set(1, 0, 0)
        .applyQuaternion(world.camera.quaternion)
        .multiplyScalar(parallax.x * driftAmp);
      vDriftUp
        .set(0, 1, 0)
        .applyQuaternion(world.camera.quaternion)
        .multiplyScalar(-parallax.y * driftAmp);
      world.camera.position.add(vDriftRight).add(vDriftUp);
    }
  }

  world.camera.updateMatrixWorld();
  world.syncUi(vp);

  renderer.setExposure(exposureAt(camera.depth));
  if (quality.update(rawDt, t)) applyQuality();

  if (quality.tier === 'low' || !fx) {
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
  const settledReady = settled !== null && world.isReady(settled);
  const activeSettled = settledReady ? settled : null;
  tour.update(t, activeSettled);
  const baseInstance = activeSettled !== null ? world.baseInstance() : null;
  if (activeSettled !== lastSettled || baseInstance !== lastBaseInstance) {
    lastSettled = activeSettled;
    lastBaseInstance = baseInstance;
    hotspots.setActive(baseInstance);
    syncScreenUi(activeSettled);
    syncEarthExplorer(activeSettled);
    if (activeSettled !== null) {
      if (activeTravel?.started && activeTravel.target === activeSettled) {
        clearTimeout(activeTravel.preparingTimer);
        activeTravel = undefined;
        if (quality.endTransition(t)) applyQuality();
      }
      quality.setScene(CHAIN3D[activeSettled].id);
      // Depth milestones: measure how far into the universe visitors travel.
      trackEvent(`scene-${activeSettled}-${CHAIN3D[activeSettled].id}`);
      hud.announce(CHAIN3D[activeSettled].label);
      const observation = OBSERVATIONS[CHAIN3D[activeSettled].id];
      const sceneData = SCENES.find((scene) => scene.id === CHAIN3D[activeSettled].id);
      hud.markSceneVisited(
        CHAIN3D[activeSettled].id,
        CHAIN3D[activeSettled].label,
        sceneData
          ? `${sceneData.scale} · ${sceneData.meaning} ${sceneData.route}`
          : observation.body,
        observation.destination,
      );
      if (!tour.active) hud.showHint(SCENE_HINTS[activeSettled]);
      if (!panel.isOpen && !router.parse()?.app) router.replace(activeSettled);
      if (pendingPanel && pendingPanel.scene === activeSettled) {
        openPanel(pendingPanel.id, activeSettled, false);
        pendingPanel = null;
      }
      const token = sceneReadyToken;
      void prepareSettledSceneReady(activeSettled, token).catch((error) => {
        console.error(`failed to prepare settled scene ${CHAIN3D[activeSettled].id}`, error);
      });
      void loader.warmManifest(activeSettled - 1);
      void loader.warmManifest(activeSettled + 1);
      loader.prune(activeSettled, 1);
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
