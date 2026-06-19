import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { EPHEMERIS_MAX_MS, EPHEMERIS_MIN_MS, simulationClock } from '../astronomy/clock';
import type { EphemerisBody, EphemerisProvider } from '../astronomy/ephemeris';
type TrackedBody = EphemerisBody | 'sun';

const SPEEDS = [
  ['real time', 1], ['1 day / sec', 86400], ['30 days / sec', 2592000], ['1 year / sec', 31557600],
] as const;

export class SolarOverlay {
  private root = document.createElement('section');
  private date = document.createElement('input');
  private status = document.createElement('span');
  private reticles = new Map<TrackedBody, HTMLButtonElement>();
  private world = new Vector3();

  constructor(private bodies: Map<TrackedBody, Object3D>, private provider: EphemerisProvider) {
    this.root.className = 'solar-overlay';
    this.root.setAttribute('aria-label', 'Solar system time and planet locations');
    const controls = document.createElement('div');
    controls.className = 'solar-controls';
    const live = button('live', () => simulationClock.setLive());
    const pause = button('pause', () => simulationClock.pause());
    const reverse = button('reverse', () => simulationClock.setRate(-Math.max(1, Math.abs(simulationClock.speed))));
    const speed = document.createElement('select');
    speed.setAttribute('aria-label', 'Simulation speed');
    SPEEDS.forEach(([label, value]) => speed.add(new Option(label, String(value))));
    speed.addEventListener('change', () => simulationClock.setRate(Number(speed.value)));
    this.date.type = 'date';
    this.date.min = isoDate(EPHEMERIS_MIN_MS);
    this.date.max = isoDate(EPHEMERIS_MAX_MS);
    this.date.setAttribute('aria-label', 'Simulation date');
    this.date.addEventListener('change', () => {
      const value = Date.parse(`${this.date.value}T12:00:00Z`);
      if (Number.isFinite(value)) simulationClock.setUtcMs(value);
    });
    this.status.className = 'solar-status';
    controls.append(live, pause, reverse, speed, this.date, this.status);
    this.root.appendChild(controls);

    for (const [name] of bodies) {
      const reticle = document.createElement('button');
      reticle.className = 'planet-reticle';
      reticle.dataset.body = name;
      reticle.setAttribute('aria-label', name === 'earth' ? 'Earth — visit Earth' : `${name} — tracked real-time position`);
      reticle.innerHTML = `<i aria-hidden="true"></i><span>${name}</span>`;
      if (name === 'earth') reticle.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('universe:navigate', { detail: 2 }));
      });
      this.root.appendChild(reticle);
      this.reticles.set(name, reticle);
    }
    document.body.appendChild(this.root);
  }

  update(camera: PerspectiveCamera, viewport: { w: number; h: number }, active: boolean): void {
    this.root.classList.toggle('active', active);
    if (!active) return;
    const utcMs = simulationClock.utcMs;
    this.date.value = isoDate(utcMs);
    this.status.textContent = this.provider.status === 'ready' ? 'JPL DE440 · UTC' : 'approximate fallback';
    camera.updateMatrixWorld();
    const placements: Array<{ el: HTMLButtonElement; x: number; y: number }> = [];
    for (const [name, object] of this.bodies) {
      object.getWorldPosition(this.world).project(camera);
      const el = this.reticles.get(name)!;
      const visible = this.world.z < 1 && Math.abs(this.world.x) < 1.15 && Math.abs(this.world.y) < 1.15;
      el.hidden = !visible;
      if (visible) placements.push({
        el,
        x: ((this.world.x + 1) / 2) * viewport.w,
        y: ((1 - this.world.y) / 2) * viewport.h,
      });
    }
    placements.sort((a, b) => a.y - b.y);
    let previousY = 72;
    for (const placement of placements) {
      const y = Math.min(viewport.h - 72, Math.max(72, placement.y, previousY + 38));
      previousY = y;
      const x = Math.min(viewport.w - 70, Math.max(70, placement.x));
      placement.el.classList.toggle('left-label', x > viewport.w - 150);
      placement.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
  }

  dispose(): void { this.root.remove(); }
}

function button(label: string, action: () => void): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.textContent = label;
  node.addEventListener('click', action);
  return node;
}

function isoDate(ms: number): string { return new Date(ms).toISOString().slice(0, 10); }
