import '../styles/event.css';
import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  Vector3,
} from 'three';
import type { QualityTier, SceneAssets, SceneInstance } from '../engine/types3d';

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createEvent(_assets: SceneAssets): SceneInstance {
  const seed = 20260705;
  let quality: QualityTier = 'high';
  let event = new Float32Array();
  const group = new Group();
  const data = new Group();
  const envelope = new Mesh(
    new CylinderGeometry(2.1, 2.1, 2.5, 6, 1, true),
    new MeshBasicMaterial({
      color: 0x7890aa,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    }),
  );
  envelope.rotation.x = Math.PI / 2;
  const ticks: number[] = [];
  for (let x = -3.5; x <= 3.5; x += 0.7) ticks.push(x, -1.72, 0, x, -1.84, 0);
  const tickGeometry = new BufferGeometry();
  tickGeometry.setAttribute('position', new Float32BufferAttribute(ticks, 3));
  group.add(
    envelope,
    new LineSegments(
      tickGeometry,
      new LineBasicMaterial({ color: 0x7890aa, transparent: true, opacity: 0.12 }),
    ),
    data,
  );

  const ui = document.createElement('section');
  ui.className = 'event-display-ui';
  ui.setAttribute('aria-label', 'MINERvA event display');
  ui.innerHTML = `
    <div class="event-display-heading">
      <span>schematic · illustrative, not real data</span>
      <h2>one neutrino interaction</h2>
    </div>
    <div class="event-display-switch" role="group" aria-label="Event representation">
      <button type="button" data-event-mode="cloud" aria-pressed="true">raw cluster cloud</button>
      <button type="button" data-event-mode="scalars" aria-pressed="false">engineered scalars</button>
    </div>
    <div class="event-representation">
      <figure data-event-hit-map>
        <canvas role="img" aria-label="X view hit map of module, strip, and deposited energy"></canvas>
        <figcaption>X view — how physicists scan events (cf. Arachne, MINERvA's web event viewer)</figcaption>
      </figure>
      <div class="event-scalar-card" data-event-scalars hidden></div>
    </div>
    <p class="event-display-caption">The transformer unfolds the raw event directly.</p>
    <button class="event-handoff" type="button" data-unfolding-handoff>What did the detector actually see?</button>`;
  document.body.appendChild(ui);
  const scalarCard = ui.querySelector<HTMLElement>('[data-event-scalars]')!;
  const hitMap = ui.querySelector<HTMLElement>('[data-event-hit-map]')!;
  const canvas = hitMap.querySelector('canvas')!;
  const caption = ui.querySelector<HTMLElement>('.event-display-caption')!;
  const buttons = ui.querySelectorAll<HTMLButtonElement>('[data-event-mode]');

  const rebuild = () => {
    data.traverse((object) => {
      const drawable = object as Points;
      drawable.geometry?.dispose();
      if (!Array.isArray(drawable.material)) drawable.material?.dispose();
    });
    data.clear();
    const count = quality === 'low' ? 38 : quality === 'med' ? 52 : 68;
    event = new Float32Array(count * 6);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const random = seededRandom(seed);
    for (let i = 0; i < count; i++) {
      const muon = i < 22;
      const module = muon ? 5 + i * 2 : 18 + Math.floor(random() * 29);
      const strip = muon ? 10 + Math.round(i * 0.55) : 8 + Math.floor(random() * 22);
      const energy = muon ? 0.22 + random() * 0.3 : 0.15 + random() ** 2 * 0.85;
      const x = (module - 28) * 0.14;
      const y = (strip - 18) * 0.1;
      const z = (random() - 0.5) * (muon ? 0.18 : 1.55);
      event.set([x, y, z, energy, module, strip], i * 6);
      positions.set([x, y, z], i * 3);
      const hot = energy ** 0.72;
      colors.set([0.09 + hot * 0.91, 0.22 + hot * 0.78, 0.49 + hot * 0.51], i * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    data.add(
      new Points(
        geometry,
        new PointsMaterial({
          size: quality === 'low' ? 0.13 : 0.16,
          vertexColors: true,
        }),
      ),
      new Line(
        new BufferGeometry().setFromPoints([
          new Vector3(event[0], event[1], event[2]),
          new Vector3(event[126], event[127], event[128]),
        ]),
        new LineBasicMaterial({ color: 0xd8edf5 }),
      ),
    );
    void import('./lib/event-hit-map').then(({ drawEventHitMap, renderEventSummary }) => {
      drawEventHitMap(canvas, event);
      renderEventSummary(scalarCard, count);
    });
  };

  const setMode = (mode: 'cloud' | 'scalars') => {
    data.visible = mode === 'cloud';
    hitMap.hidden = mode !== 'cloud';
    scalarCard.hidden = mode !== 'scalars';
    caption.textContent =
      mode === 'cloud'
        ? 'The transformer unfolds the raw event directly.'
        : 'Traditional analysis compresses the event first.';
    buttons.forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.eventMode === mode)),
    );
  };
  buttons.forEach((button) =>
    button.addEventListener('click', () =>
      setMode(button.dataset.eventMode as 'cloud' | 'scalars'),
    ),
  );
  ui.querySelector<HTMLButtonElement>('[data-unfolding-handoff]')!.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('universe:branch-route', {
        detail: { branch: 'stanford', route: 'screen/app/unfolding-lab' },
      }),
    );
  });
  rebuild();
  setMode('cloud');

  return {
    group,
    hotspots: [],
    update(ctx) {
      ui.classList.toggle('active', Math.abs(ctx.localT) < 0.02);
      data.rotation.y = ctx.reducedMotion ? 0 : Math.sin(ctx.time * 0.2) * 0.045;
    },
    hideUi: () => ui.classList.remove('active'),
    setQuality(next) {
      if (quality !== next) {
        quality = next;
        rebuild();
      }
    },
    dispose() {
      ui.remove();
      group.traverse((object) => {
        const drawable = object as Mesh;
        drawable.geometry?.dispose();
        if (!Array.isArray(drawable.material)) drawable.material?.dispose();
      });
    },
  };
}
