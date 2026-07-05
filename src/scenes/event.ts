import '../styles/event.css';
import {
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import type { QualityTier, SceneAssets, SceneInstance } from '../engine/types3d';

interface EventSummary {
  eMuon: number;
  thetaMuon: number;
  recoil: number;
  q2: number;
  visible: number;
  clusters: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function eventSummary(seed: number, count: number): EventSummary {
  const random = seededRandom(seed ^ 0x51f15e);
  return {
    eMuon: 2.2 + random() * 2.8,
    thetaMuon: 4 + random() * 15,
    recoil: 0.18 + random() * 0.72,
    q2: 0.08 + random() * 0.55,
    visible: 0.45 + random() * 1.25,
    clusters: count,
  };
}

function renderSummary(card: HTMLElement, summary: EventSummary): void {
  card.innerHTML = `
    <dl>
      <div><dt>E<sub>μ</sub></dt><dd>${summary.eMuon.toFixed(2)} GeV</dd></div>
      <div><dt>θ<sub>μ</sub></dt><dd>${summary.thetaMuon.toFixed(1)}°</dd></div>
      <div><dt>recoil energy</dt><dd>${summary.recoil.toFixed(2)} GeV</dd></div>
      <div><dt>Q²</dt><dd>${summary.q2.toFixed(2)} GeV²</dd></div>
      <div><dt>visible energy</dt><dd>${summary.visible.toFixed(2)} GeV</dd></div>
      <div><dt>clusters</dt><dd>${summary.clusters}</dd></div>
    </dl>`;
}

export function createEvent(_assets: SceneAssets): SceneInstance {
  const group = new Group();
  const cloud = new Group();
  group.add(cloud);
  group.add(new AmbientLight(0x8bb8d7, 1.4));
  let seed = 20260705;
  let quality: QualityTier = 'high';
  let clusterCount = 0;

  const rebuild = () => {
    cloud.clear();
    const random = seededRandom(seed);
    clusterCount = quality === 'low' ? 34 : quality === 'med' ? 46 : 58;
    for (let i = 0; i < clusterCount; i++) {
      const alongTrack = i < 17;
      const energy = 0.15 + random() ** 2 * 0.85;
      const position = alongTrack
        ? new Vector3(-4 + i * 0.48, -0.9 + i * 0.095, -0.4 + i * 0.06)
        : new Vector3((random() - 0.5) * 5.4, (random() - 0.5) * 3.8, (random() - 0.5) * 3.2);
      if (!alongTrack && i % 3 === 0) position.add(new Vector3(1.2, 0.25, 0.15));
      const color = alongTrack ? 0x76eaff : energy > 0.62 ? 0xff9b63 : 0xffdf72;
      const voxel = new Mesh(
        new SphereGeometry(0.07 + energy * 0.2, 10, 8),
        new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.48 + energy * 0.5,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      voxel.position.copy(position);
      voxel.userData.energy = energy;
      cloud.add(voxel);
    }
    const muon = new Line(
      new BufferGeometry().setFromPoints([
        new Vector3(-4.6, -1.02, -0.48),
        new Vector3(5, 0.92, 0.75),
      ]),
      new LineBasicMaterial({ color: 0xb6f5ff, transparent: true, opacity: 0.86 }),
    );
    muon.name = 'muon-track';
    cloud.add(muon);
  };
  rebuild();

  const ui = document.createElement('section');
  ui.className = 'event-display-ui';
  ui.setAttribute('aria-label', 'MINERvA event display');
  ui.innerHTML = `
    <div class="event-display-heading">
      <span>schematic — illustrative, not real data</span>
      <h2>one neutrino interaction</h2>
      <p>energy-weighted calorimeter clusters + reconstructed muon track</p>
    </div>
    <div class="event-display-switch" role="group" aria-label="Event representation">
      <button type="button" data-event-mode="cloud" aria-pressed="true">raw cluster cloud</button>
      <button type="button" data-event-mode="scalars" aria-pressed="false">engineered scalars</button>
    </div>
    <div class="event-scalar-card" data-event-scalars hidden></div>
    <p class="event-display-caption">the transformer unfolds this directly.</p>
    <div class="event-display-actions">
      <button type="button" data-cycle-event aria-label="Cycle to the next synthetic event">cycle event</button>
      <button type="button" data-unfolding-handoff>What did the detector actually see?</button>
    </div>`;
  document.body.appendChild(ui);
  const scalarCard = ui.querySelector<HTMLElement>('[data-event-scalars]')!;
  const caption = ui.querySelector<HTMLElement>('.event-display-caption')!;
  const modeButtons = ui.querySelectorAll<HTMLButtonElement>('[data-event-mode]');

  const setMode = (mode: 'cloud' | 'scalars') => {
    cloud.visible = mode === 'cloud';
    scalarCard.hidden = mode !== 'scalars';
    caption.textContent =
      mode === 'cloud'
        ? 'the transformer unfolds this directly.'
        : 'traditional analysis compresses the event before unfolding.';
    modeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.eventMode === mode));
    });
    ui.dataset.mode = mode;
  };
  modeButtons.forEach((button) =>
    button.addEventListener('click', () =>
      setMode(button.dataset.eventMode as 'cloud' | 'scalars'),
    ),
  );
  ui.querySelector<HTMLButtonElement>('[data-cycle-event]')!.addEventListener('click', () => {
    seed += 1;
    rebuild();
    renderSummary(scalarCard, eventSummary(seed, clusterCount));
    ui.dataset.seed = String(seed);
  });
  ui.querySelector<HTMLButtonElement>('[data-unfolding-handoff]')!.addEventListener('click', () => {
    window.dispatchEvent(
      new CustomEvent('universe:branch-route', {
        detail: { branch: 'stanford', route: 'screen/app/unfolding-lab' },
      }),
    );
  });
  renderSummary(scalarCard, eventSummary(seed, clusterCount));
  ui.dataset.seed = String(seed);
  setMode('cloud');

  return {
    group,
    hotspots: [],
    update(ctx) {
      ui.classList.toggle('active', Math.abs(ctx.localT) < 0.02);
      if (!ctx.reducedMotion) {
        cloud.rotation.y = Math.sin(ctx.time * 0.25) * 0.08;
        for (const object of cloud.children) {
          if (!(object instanceof Mesh)) continue;
          const energy = object.userData.energy as number;
          object.scale.setScalar(1 + Math.sin(ctx.time * 2.4 + object.id) * 0.08 * energy);
        }
      }
    },
    hideUi() {
      ui.classList.remove('active');
    },
    setQuality(next) {
      if (quality === next) return;
      quality = next;
      rebuild();
      renderSummary(scalarCard, eventSummary(seed, clusterCount));
    },
    dispose() {
      ui.remove();
      group.traverse((object) => {
        const mesh = object as Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else mesh.material?.dispose();
      });
    },
  };
}
