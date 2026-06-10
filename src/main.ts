import './styles/main.css';
import { Camera } from './engine/camera';
import { attachInput } from './engine/input';
import { Stage } from './engine/stage';
import type { Size } from './engine/types';
import { CHAIN } from './scenes/registry';
import { Hud } from './ui/hud';
import { PanelHost } from './ui/panel';
import { ScreenUi } from './ui/screen-ui';
import { Starfield } from './ui/starfield';
import { Router } from './router';

const SCREEN_INDEX = CHAIN.length - 1;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const now = () => performance.now() / 1000;

const stageEl = document.getElementById('stage')!;
const hudEl = document.getElementById('hud')!;
const canvas = document.getElementById('starfield') as HTMLCanvasElement;

const vp: Size = { w: window.innerWidth, h: window.innerHeight };
const camera = new Camera(CHAIN.length, reduced);
const panel = new PanelHost();
const starfield = new Starfield(canvas);

let pendingPanel: { scene: number; id: string } | null = null;

const openPanel = (id: string, sceneIndex: number) => {
  panel.open(id);
  router.push(sceneIndex, id);
};

const stage = new Stage(stageEl, CHAIN, (sceneIndex, hotspot) => {
  hud.hideHint();
  if (hotspot.action.type === 'panel') {
    openPanel(hotspot.action.panelId, sceneIndex);
  } else {
    camera.tweenTo(sceneIndex + (hotspot.action.dir === 'in' ? 1 : -1), now());
  }
});

const screenUi = new ScreenUi(CHAIN[SCREEN_INDEX].svg, (id) => openPanel(id, SCREEN_INDEX));

const hud = new Hud(
  hudEl,
  CHAIN,
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

const router = new Router(CHAIN, (state) => {
  panel.close();
  pendingPanel = state.panel ? { scene: state.scene, id: state.panel } : null;
  const dist = Math.abs(state.scene - camera.depth);
  if (dist > 1e-6) camera.tweenTo(state.scene, now(), 0.7 + 0.4 * dist);
});

panel.onClose = () => {
  router.replace(Math.round(camera.depth));
};

attachInput(stageEl, camera, {
  reducedMotion: reduced,
  isModalOpen: () => panel.isOpen,
  onFirstInteraction: () => hud.hideHint(),
});

window.addEventListener('resize', () => {
  vp.w = window.innerWidth;
  vp.h = window.innerHeight;
  starfield.resize();
  if (screenUi.visible) screenUi.show(vp);
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

// --- main loop ---
let lastSettled: number | null = -1;
let lastTime = now();

function frame(): void {
  const t = now();
  const dt = Math.min(t - lastTime, 0.05);
  lastTime = t;

  camera.update(dt, t);
  stage.render(camera.depth, vp);
  starfield.render(camera.depth, t);
  hud.setActive(Math.round(camera.depth));

  const settled = camera.settledIndex;
  if (settled !== lastSettled) {
    lastSettled = settled;
    if (settled !== null) {
      hud.announce(CHAIN[settled].label);
      if (!panel.isOpen) router.replace(settled);
      if (settled === SCREEN_INDEX) screenUi.show(vp);
      else screenUi.hide();
      if (pendingPanel && pendingPanel.scene === settled) {
        openPanel(pendingPanel.id, settled);
        pendingPanel = null;
      }
    } else {
      screenUi.hide();
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
