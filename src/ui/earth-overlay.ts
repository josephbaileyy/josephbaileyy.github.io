import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { SCENE_SIGNALS, type SceneSignal } from '../content/portfolio';

export interface EarthPinProjection {
  id: string;
  object: Object3D;
  priority: number;
}

interface ProjectedEarthPin {
  el: HTMLButtonElement;
  x: number;
  y: number;
  priority: number;
}

export interface EarthPinLayout extends ProjectedEarthPin {
  labelY: number;
  labelLeft: boolean;
}

const EARTH_SIGNALS = SCENE_SIGNALS.filter((signal) => signal.scene === 'earth');
const SIGNAL_BY_ID = new Map(EARTH_SIGNALS.map((signal) => [signal.id, signal]));

export function layoutEarthPins(
  pins: ProjectedEarthPin[],
  viewport: { w: number; h: number },
): EarthPinLayout[] {
  const edge = 26;
  const minLabelY = viewport.w < 640 ? 92 : 74;
  const maxLabelY = viewport.h - (viewport.w < 640 ? 170 : 70);
  const gap = viewport.w < 640 ? 38 : 32;
  const laidOut: EarthPinLayout[] = pins
    .map((pin) => {
      const x = Math.min(viewport.w - edge, Math.max(edge, pin.x));
      const y = Math.min(viewport.h - edge, Math.max(edge, pin.y));
      return {
        ...pin,
        x,
        y,
        labelY: y,
        labelLeft: x > viewport.w - 170 || (x > 170 && pin.priority % 2 === 1),
      };
    })
    .sort((a, b) => a.priority - b.priority);

  for (const labelLeft of [false, true]) {
    const side = laidOut
      .filter((pin) => pin.labelLeft === labelLeft)
      .sort((a, b) => a.y - b.y || a.priority - b.priority);
    let cursor = minLabelY;
    for (const pin of side) {
      pin.labelY = Math.max(pin.y, cursor);
      cursor = pin.labelY + gap;
    }
    const overflow = Math.max(0, cursor - gap - maxLabelY);
    if (overflow > 0) {
      for (const pin of side) pin.labelY -= overflow;
      for (let i = side.length - 2; i >= 0; i--) {
        side[i].labelY = Math.min(side[i].labelY, side[i + 1].labelY - gap);
      }
      const underflow = Math.max(0, minLabelY - (side[0]?.labelY ?? minLabelY));
      for (const pin of side) pin.labelY += underflow;
    }
  }
  return laidOut;
}

export class EarthOverlay {
  private root = document.createElement('section');
  private card = document.createElement('aside');
  private readout = document.createElement('span');
  private pins = new Map<string, HTMLButtonElement>();
  private world = new Vector3();
  private selectedId = 'earth-stanford-slac';
  private locateBtn: HTMLButtonElement | null = null;
  private locationNote: HTMLSpanElement | null = null;

  constructor(
    private readonly signals: SceneSignal[] = EARTH_SIGNALS,
    private readonly onFocus: (id: string) => void,
    private readonly onReset: () => void,
    onLocate?: () => void,
  ) {
    this.root.className = 'earth-overlay';
    this.root.setAttribute('aria-label', 'Earth coordinate evidence layer');
    const toolbar = document.createElement('div');
    toolbar.className = 'earth-globe-toolbar';
    this.readout.className = 'earth-globe-readout';
    this.readout.textContent = 'drag Earth · wheel to inspect';
    const reset = button('reset globe', () => this.onReset());
    if (onLocate) {
      this.locateBtn = button('locate me', onLocate);
      this.locateBtn.setAttribute(
        'aria-label',
        'Locate me on the globe (asks for browser location permission)',
      );
      this.locationNote = document.createElement('span');
      this.locationNote.className = 'earth-location-note';
      this.locationNote.textContent = 'browser location · stays on this device';
      toolbar.append(this.readout, this.locateBtn, reset, this.locationNote);
    } else {
      toolbar.append(this.readout, reset);
    }
    this.root.append(toolbar, this.card);

    for (const signal of this.signals) {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'earth-pin';
      pin.dataset.signal = signal.id;
      pin.setAttribute('aria-label', `${signal.title} coordinate evidence`);
      pin.innerHTML = `<i aria-hidden="true"></i><span>${signal.title}</span>`;
      pin.addEventListener('click', () => this.select(signal.id, true));
      this.root.appendChild(pin);
      this.pins.set(signal.id, pin);
    }
    document.body.appendChild(this.root);
    this.updateCard();
  }

  select(id: string, collect = false): void {
    if (!SIGNAL_BY_ID.has(id)) return;
    this.selectedId = id;
    this.onFocus(id);
    this.updateCard();
    for (const [signalId, pin] of this.pins) {
      const selected = signalId === id;
      pin.classList.toggle('selected', selected);
      pin.setAttribute('aria-pressed', String(selected));
    }
    if (collect) {
      window.dispatchEvent(
        new CustomEvent('universe:signal', { detail: { signalId: id, route: false } }),
      );
    }
  }

  sync(
    camera: PerspectiveCamera,
    viewport: { w: number; h: number },
    active: boolean,
    pinObjects: EarthPinProjection[],
    zoom: number,
  ): void {
    this.root.classList.toggle('active', active);
    if (!active) return;
    this.readout.textContent = `drag Earth · ${zoom.toFixed(2)}× globe`;
    camera.updateMatrixWorld();
    const placements: ProjectedEarthPin[] = [];
    for (const pin of pinObjects) {
      const el = this.pins.get(pin.id);
      if (!el) continue;
      pin.object.getWorldPosition(this.world).project(camera);
      const visible =
        this.world.z < 1 && Math.abs(this.world.x) < 1.12 && Math.abs(this.world.y) < 1.12;
      el.hidden = !visible;
      if (!visible) continue;
      placements.push({
        el,
        x: ((this.world.x + 1) / 2) * viewport.w,
        y: ((1 - this.world.y) / 2) * viewport.h,
        priority: pin.priority,
      });
    }
    for (const placement of layoutEarthPins(placements, viewport)) {
      const shift = Math.round(placement.labelY - placement.y);
      const dx = placement.labelLeft ? -30 : 30;
      const leaderLength = Math.hypot(dx, shift);
      const leaderAngle = Math.atan2(shift, dx);
      placement.el.classList.toggle('left-label', placement.labelLeft);
      placement.el.style.setProperty('--label-shift-y', `${shift}px`);
      placement.el.style.setProperty('--leader-length', `${leaderLength.toFixed(1)}px`);
      placement.el.style.setProperty('--leader-angle', `${leaderAngle.toFixed(4)}rad`);
      placement.el.style.transform = `translate(${Math.round(placement.x)}px, ${Math.round(placement.y)}px)`;
    }
  }

  setLocateState(options: {
    label: string;
    ariaLabel?: string;
    message?: string;
    disabled?: boolean;
  }): void {
    if (!this.locateBtn) return;
    this.locateBtn.textContent = options.label;
    this.locateBtn.setAttribute('aria-label', options.ariaLabel ?? options.label);
    this.locateBtn.disabled = options.disabled ?? false;
    if (this.locationNote && options.message) this.locationNote.textContent = options.message;
  }

  hide(): void {
    this.root.classList.remove('active');
  }

  dispose(): void {
    this.root.remove();
  }

  private updateCard(): void {
    const signal = SIGNAL_BY_ID.get(this.selectedId) ?? this.signals[0];
    const links =
      signal.links
        ?.map(
          (link) =>
            `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`,
        )
        .join('') ?? '';
    this.card.className = `earth-evidence-card ${signal.category}`;
    const action = signal.destination ? '<button type="button">open evidence</button>' : '';
    this.card.innerHTML = `<span>${escapeHtml(signal.category)} coordinate</span><strong>${escapeHtml(signal.title)}</strong><p>${escapeHtml(signal.body)}</p><div class="earth-card-actions">${action}${links}</div>`;
    this.card.querySelector('button')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('universe:signal', { detail: signal.id }));
    });
  }
}

function button(label: string, action: () => void): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.textContent = label;
  node.addEventListener('click', action);
  return node;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char]!,
  );
}
