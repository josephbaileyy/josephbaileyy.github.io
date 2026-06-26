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
  ['real time', 1],
  ['1 day / sec', 86400],
  ['30 days / sec', 2592000],
  ['1 year / sec', 31557600],
] as const;

const BODY_FACTS: Record<TrackedBody, { radius: string; note: string }> = {
  sun: { radius: '696,340 km', note: 'The gravity well everything else is orbiting.' },
  mercury: { radius: '2,440 km', note: 'A small rocky planet with the fastest orbit.' },
  venus: { radius: '6,052 km', note: 'Earth-sized, cloud-wrapped, and brutally hot.' },
  earth: { radius: '6,371 km', note: 'The amber route inward to coordinates and campus.' },
  mars: { radius: '3,390 km', note: 'A nearby rocky world with a thin CO₂ atmosphere.' },
  jupiter: { radius: '69,911 km', note: 'The giant that dominates planetary angular momentum.' },
  saturn: { radius: '58,232 km', note: 'A gas giant whose rings make scale immediately legible.' },
  uranus: { radius: '25,362 km', note: 'An ice giant tipped dramatically onto its side.' },
  neptune: { radius: '24,622 km', note: 'The outer classical planet in this ephemeris view.' },
  moon: { radius: '1,737 km', note: 'Earth’s companion, shown as a tracked body for orientation.' },
};

export interface BodyCardModel {
  title: string;
  distance: string;
  radius: string;
  date: string;
  scaleMode: string;
  note: string;
}

export function bodyCardModel(
  body: TrackedBody | null,
  distanceAu: number | null,
  utcMs: number,
  scaleMode: 'cinematic' | 'real',
): BodyCardModel {
  const name = body ?? 'sun';
  const facts = BODY_FACTS[name];
  return {
    title: body ? body[0].toUpperCase() + body.slice(1) : 'Solar overview',
    distance:
      distanceAu === null
        ? 'system barycentric view'
        : `${distanceAu.toFixed(distanceAu < 1 ? 3 : 2)} AU from Sun`,
    radius: body ? facts.radius : 'varies by body',
    date: new Date(utcMs).toISOString().slice(0, 10),
    scaleMode: `${scaleMode} scale`,
    note: body ? facts.note : 'Choose a body to focus the camera and reveal its motion trail.',
  };
}

export class SolarOverlay {
  private root = document.createElement('section');
  private date = document.createElement('input');
  private status = document.createElement('span');
  private reticles = new Map<TrackedBody, HTMLButtonElement>();
  private focus = document.createElement('select');
  private visitEarth = document.createElement('button');
  private drawer = document.createElement('div');
  private drawerToggle = document.createElement('button');
  private bodyCard = document.createElement('aside');
  private trail = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  private trailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  private trailPoints: Array<{ body: TrackedBody; x: number; y: number; t: number }> = [];
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
    this.drawerToggle.type = 'button';
    this.drawerToggle.className = 'solar-drawer-toggle';
    this.drawerToggle.textContent = 'Ephemeris';
    this.drawerToggle.setAttribute('aria-expanded', 'true');
    this.drawerToggle.setAttribute('aria-controls', 'solar-ephemeris-drawer');
    this.drawerToggle.addEventListener('click', () => {
      const open = !this.drawer.classList.contains('closed');
      this.drawer.classList.toggle('closed', open);
      this.drawerToggle.setAttribute('aria-expanded', String(!open));
    });
    this.root.appendChild(this.drawerToggle);
    this.drawer.id = 'solar-ephemeris-drawer';
    this.drawer.className = 'solar-drawer';
    const controls = document.createElement('div');
    controls.className = 'solar-controls';
    const live = button('live', () => simulationClock.setLive());
    const pause = button('pause', () => simulationClock.pause());
    const reverse = button('reverse', () =>
      simulationClock.setRate(-Math.max(1, Math.abs(simulationClock.speed))),
    );
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
      this.select(this.focus.value === 'overview' ? null : (this.focus.value as TrackedBody));
    });
    this.visitEarth.type = 'button';
    this.visitEarth.className = 'solar-visit-earth';
    this.visitEarth.textContent = 'visit Earth';
    this.visitEarth.hidden = true;
    this.visitEarth.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('universe:navigate', { detail: 2 }));
    });
    controls.append(
      live,
      pause,
      reverse,
      speed,
      this.date,
      this.focus,
      this.visitEarth,
      this.status,
    );
    this.drawer.appendChild(controls);
    this.root.appendChild(this.drawer);
    this.bodyCard.className = 'solar-body-card';
    this.bodyCard.setAttribute('aria-live', 'polite');
    this.root.appendChild(this.bodyCard);
    this.trail.classList.add('solar-motion-trail');
    this.trail.setAttribute('aria-hidden', 'true');
    this.trailPath.setAttribute('fill', 'none');
    this.trailPath.setAttribute('stroke', 'currentColor');
    this.trailPath.setAttribute('stroke-width', '2');
    this.trailPath.setAttribute('stroke-linecap', 'round');
    this.trailPath.setAttribute('stroke-linejoin', 'round');
    this.trail.appendChild(this.trailPath);
    this.root.appendChild(this.trail);

    for (const [name] of bodies) {
      const reticle = document.createElement('button');
      reticle.className = 'planet-reticle';
      reticle.dataset.body = name;
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
    this.trailPoints = [];
    window.dispatchEvent(
      new CustomEvent('universe:signal', {
        detail: { signalId: 'solar-ephemeris', route: false },
      }),
    );
    if (body === 'earth') {
      window.dispatchEvent(
        new CustomEvent('universe:signal', {
          detail: { signalId: 'solar-earth-route', route: false },
        }),
      );
    }
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
    this.status.textContent =
      this.provider.status === 'ready'
        ? `JPL DE440 · UTC · ${this.scaleMode} scale`
        : this.provider.status === 'loading'
          ? 'buffering JPL trajectory…'
          : 'approximate fallback';
    camera.updateMatrixWorld();
    const placements: ProjectedReticle[] = [];
    let order = 0;
    let selectedDistance: number | null = null;
    let selectedScreen: { x: number; y: number } | null = null;
    for (const [name, object] of this.bodies) {
      object.getWorldPosition(this.world).project(camera);
      const el = this.reticles.get(name)!;
      const visible =
        this.world.z < 1 && Math.abs(this.world.x) < 1.15 && Math.abs(this.world.y) < 1.15;
      if (name === this.selected) {
        const worldPosition = new Vector3();
        object.getWorldPosition(worldPosition);
        selectedDistance = name === 'sun' ? 0 : worldPosition.length();
        selectedScreen = {
          x: ((this.world.x + 1) / 2) * viewport.w,
          y: ((1 - this.world.y) / 2) * viewport.h,
        };
      }
      el.hidden = !visible;
      if (visible)
        placements.push({
          el,
          x: ((this.world.x + 1) / 2) * viewport.w,
          y: ((1 - this.world.y) / 2) * viewport.h,
          order,
        });
      order += 1;
    }
    this.updateBodyCard(bodyCardModel(this.selected, selectedDistance, utcMs, this.scaleMode));
    this.updateTrail(this.selected, selectedScreen, viewport);
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

  dispose(): void {
    this.root.remove();
  }

  private updateBodyCard(model: BodyCardModel): void {
    this.bodyCard.innerHTML = `<span>${model.scaleMode} · ${model.date}</span><strong>${model.title}</strong><dl><div><dt>Distance</dt><dd>${model.distance}</dd></div><div><dt>Radius</dt><dd>${model.radius}</dd></div></dl><p>${model.note}</p>`;
  }

  private updateTrail(
    body: TrackedBody | null,
    point: { x: number; y: number } | null,
    viewport: { w: number; h: number },
  ): void {
    this.trail.setAttribute('viewBox', `0 0 ${viewport.w} ${viewport.h}`);
    if (!body || !point || Math.abs(simulationClock.speed) < 2) {
      this.trailPath.setAttribute('d', '');
      return;
    }
    const last = this.trailPoints.at(-1);
    if (!last || Math.hypot(last.x - point.x, last.y - point.y) > 3) {
      this.trailPoints.push({ body, x: point.x, y: point.y, t: performance.now() });
    }
    const cutoff = performance.now() - 9000;
    this.trailPoints = this.trailPoints.filter((p) => p.body === body && p.t >= cutoff).slice(-48);
    const d = this.trailPoints
      .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    this.trailPath.setAttribute('d', d);
  }
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
    const side = laidOut
      .filter((placement) => placement.labelLeft === labelLeft)
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

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
