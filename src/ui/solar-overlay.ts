import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { EPHEMERIS_MAX_MS, EPHEMERIS_MIN_MS, simulationClock } from '../astronomy/clock';
import type { EphemerisBody, EphemerisProvider } from '../astronomy/ephemeris';
export type TrackedBody = EphemerisBody | 'sun';

interface ProjectedReticle {
  el: HTMLButtonElement;
  x: number;
  y: number;
  order: number;
}

interface ReticleLayout extends ProjectedReticle {
  labelY: number;
  labelLeft: boolean;
}

const SPEEDS = [
  ['real time', 1], ['1 day / sec', 86400], ['30 days / sec', 2592000], ['1 year / sec', 31557600],
] as const;

const BODY_TEXTURES: Record<TrackedBody, string> = {
  sun: 'radial-gradient(circle at 35% 32%, #fffbd6 0%, #ffc45f 28%, #e96516 68%, #6e1605 100%)',
  mercury: 'url("/tex/mercury.jpg")',
  venus: 'url("/tex/venus.jpg")',
  earth: 'url("/tex/earth_day.jpg")',
  mars: 'url("/tex/mars.jpg")',
  jupiter: 'url("/tex/jupiter.jpg")',
  saturn: 'url("/tex/saturn.jpg")',
  uranus: 'url("/tex/uranus.jpg")',
  neptune: 'url("/tex/neptune.jpg")',
  moon: 'url("/tex/moon.jpg")',
};

export class SolarOverlay {
  private root = document.createElement('section');
  private date = document.createElement('input');
  private status = document.createElement('span');
  private reticles = new Map<TrackedBody, HTMLButtonElement>();
  private focus = document.createElement('select');
  private visitEarth = document.createElement('button');
  private selected: TrackedBody | null = null;
  private world = new Vector3();
  private scaleMode: 'cinematic' | 'real' = 'cinematic';

  constructor(
    private bodies: Map<TrackedBody, Object3D>,
    private provider: EphemerisProvider,
    private onFocus: (body: TrackedBody | null) => void,
  ) {
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
    this.focus.setAttribute('aria-label', 'Focus a planet');
    this.focus.add(new Option('overview', 'overview'));
    for (const name of bodies.keys()) this.focus.add(new Option(name, name));
    this.focus.addEventListener('change', () => {
      this.select(this.focus.value === 'overview' ? null : this.focus.value as TrackedBody);
    });
    this.visitEarth.type = 'button';
    this.visitEarth.className = 'solar-visit-earth';
    this.visitEarth.textContent = 'visit Earth';
    this.visitEarth.hidden = true;
    this.visitEarth.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('universe:navigate', { detail: 2 }));
    });
    controls.append(live, pause, reverse, speed, this.date, this.focus, this.visitEarth, this.status);
    this.root.appendChild(controls);

    for (const [name] of bodies) {
      const reticle = document.createElement('button');
      reticle.className = 'planet-reticle';
      reticle.dataset.body = name;
      reticle.style.setProperty('--body-texture', BODY_TEXTURES[name]);
      reticle.setAttribute('aria-label', `${name} — focus tracked real-time orbit`);
      reticle.innerHTML = `<i aria-hidden="true"></i><span>${name}</span>`;
      reticle.addEventListener('click', () => this.select(name));
      this.root.appendChild(reticle);
      this.reticles.set(name, reticle);
    }
    document.body.appendChild(this.root);
  }

  setScaleMode(mode: 'cinematic' | 'real'): void {
    this.scaleMode = mode;
    this.root.dataset.scaleMode = mode;
  }

  private select(body: TrackedBody | null): void {
    this.selected = body;
    this.focus.value = body ?? 'overview';
    this.visitEarth.hidden = body !== 'earth';
    for (const [name, reticle] of this.reticles) {
      const selected = name === body;
      reticle.classList.toggle('selected', selected);
      reticle.setAttribute('aria-pressed', String(selected));
    }
    this.onFocus(body);
  }

  update(camera: PerspectiveCamera, viewport: { w: number; h: number }, active: boolean): void {
    this.root.classList.toggle('active', active);
    if (!active) return;
    const utcMs = simulationClock.utcMs;
    this.date.value = isoDate(utcMs);
    this.status.textContent = this.provider.status === 'ready'
      ? `JPL DE440 · UTC · ${this.scaleMode} scale`
      : this.provider.status === 'loading' ? 'buffering JPL trajectory…' : 'approximate fallback';
    camera.updateMatrixWorld();
    const placements: ProjectedReticle[] = [];
    let order = 0;
    for (const [name, object] of this.bodies) {
      object.getWorldPosition(this.world).project(camera);
      const el = this.reticles.get(name)!;
      const visible = this.world.z < 1 && Math.abs(this.world.x) < 1.15 && Math.abs(this.world.y) < 1.15;
      el.hidden = !visible;
      if (visible) placements.push({
        el,
        x: ((this.world.x + 1) / 2) * viewport.w,
        y: ((1 - this.world.y) / 2) * viewport.h,
        order,
      });
      order += 1;
    }
    for (const placement of layoutReticles(placements, viewport)) {
      const shift = Math.round(placement.labelY - placement.y);
      const dx = placement.labelLeft ? -28 : 28;
      const leaderLength = Math.hypot(dx, shift);
      const leaderAngle = Math.atan2(shift, dx);
      placement.el.classList.toggle('left-label', placement.labelLeft);
      placement.el.style.setProperty('--label-shift-y', `${shift}px`);
      placement.el.style.setProperty('--leader-length', `${leaderLength.toFixed(1)}px`);
      placement.el.style.setProperty('--leader-angle', `${leaderAngle.toFixed(4)}rad`);
      // The reticle remains centered on the projected body. Decluttering is
      // applied only to its label, never to the astronomical position.
      placement.el.style.transform = `translate(${Math.round(placement.x)}px, ${Math.round(placement.y)}px)`;
    }
  }

  hide(): void {
    this.root.classList.remove('active');
  }

  dispose(): void { this.root.remove(); }
}

export function layoutReticles<T extends ProjectedReticle>(
  placements: T[],
  viewport: { w: number; h: number },
): Array<T & ReticleLayout> {
  const edge = 24;
  const minLabelY = viewport.w < 600 ? 112 : 88;
  const maxLabelY = viewport.h - 40;
  const gap = 26;
  const laidOut = placements.map((placement) => {
    const x = Math.min(viewport.w - edge, Math.max(edge, placement.x));
    const y = Math.min(viewport.h - edge, Math.max(edge, placement.y));
    return {
      ...placement,
      x,
      y,
      labelY: y,
      labelLeft: x > viewport.w - 135 || (x >= 135 && placement.order % 2 === 1),
    };
  });

  for (const labelLeft of [false, true]) {
    const side = laidOut.filter((placement) => placement.labelLeft === labelLeft)
      .sort((a, b) => a.y - b.y);
    let cursor = minLabelY;
    for (const placement of side) {
      placement.labelY = Math.max(placement.y, cursor);
      cursor = placement.labelY + gap;
    }
    const overflow = Math.max(0, cursor - gap - maxLabelY);
    if (overflow > 0) {
      for (const placement of side) placement.labelY -= overflow;
      for (let i = side.length - 2; i >= 0; i--) {
        side[i].labelY = Math.min(side[i].labelY, side[i + 1].labelY - gap);
      }
      const underflow = Math.max(0, minLabelY - (side[0]?.labelY ?? minLabelY));
      for (const placement of side) placement.labelY += underflow;
    }
  }
  return laidOut;
}

function button(label: string, action: () => void): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.textContent = label;
  node.addEventListener('click', action);
  return node;
}

function isoDate(ms: number): string { return new Date(ms).toISOString().slice(0, 10); }
