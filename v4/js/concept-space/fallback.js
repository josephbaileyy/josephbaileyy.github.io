// Orthographic SVG view of the same positions, selection and relation mask.
import { escapeHtml } from './inspector.js';
import { RELATION_STYLE } from './scene.js';

const NS = 'http://www.w3.org/2000/svg';

export function createFallback({ stage, canvas, model, bridges, onSelect, reducedMotion }) {
  canvas.hidden = true;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'cs-fallback');
  svg.setAttribute('viewBox', '-1.22 -1.22 2.44 2.44');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '2D projection of the concept graph');
  stage.prepend(svg);
  const endpoints = model.relations.map(({ source, target }) => [
    model.index.get(source),
    model.index.get(target),
  ]);
  let points = model.concepts.map(() => [0, 0, 0]);
  let colors = model.concepts.map(() => '#888');
  let visible = model.concepts.map(() => false);
  let relationMask = model.relations.map(() => false);
  let selected = -1;
  let rings;
  let landmarks = [];
  let neighbours = [];
  let yaw = 0.3;
  let pitch = -0.2;
  let frame;
  let transition;
  let inset;

  function project([x, y, z]) {
    const cx = Math.cos(yaw) * x + Math.sin(yaw) * z;
    const cz = -Math.sin(yaw) * x + Math.cos(yaw) * z;
    return [
      cx,
      -(Math.cos(pitch) * y - Math.sin(pitch) * cz),
      Math.sin(pitch) * y + Math.cos(pitch) * cz,
    ];
  }

  function draw(now) {
    frame = undefined;
    if (transition) {
      const { from, to, start } = transition;
      const fraction = Math.min(1, (now - start) / 650);
      const t = fraction * fraction * (3 - 2 * fraction);
      points = from.map((p, i) => p.map((v, d) => v + (to[i][d] - v) * t));
      if (fraction < 1) schedule();
      else transition = null;
    }
    const centre = selected >= 0 ? project(points[selected]) : [0, 0];
    if (selected >= 0 && inset) {
      const rect = svg.getBoundingClientRect();
      const scale = 1.22 / Math.min(rect.width, rect.height);
      if (matchMedia('(max-width: 960px)').matches)
        centre[1] += Math.min(0.56, inset.height * scale);
      else centre[0] -= Math.min(0.82, inset.width * scale);
    }
    const projected = points.map((p) => {
      const [x, y, z] = project(p);
      return [x - centre[0], y - centre[1], z];
    });
    const order = [...projected.keys()]
      .filter((i) => visible[i])
      .sort((a, b) => projected[a][2] - projected[b][2]);
    const lines = endpoints
      .map(([i, j], k) => {
        if (!relationMask[k]) return '';
        const [ax, ay] = projected[i];
        let [bx, by] = projected[j];
        const r = model.relations[k];
        const bridge = bridges.has(k);
        const directed = selected >= 0 && model.types[r.type].directed;
        if (directed) {
          const d = Math.hypot(bx - ax, by - ay);
          if (d > 0.07) {
            bx -= (0.03 * (bx - ax)) / d;
            by -= (0.03 * (by - ay)) / d;
          }
        }
        return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"
        stroke="${bridge ? '#f1d58e' : RELATION_STYLE[r.type].color}"
        class="${bridge ? 'is-bridge' : ''}${selected >= 0 ? ' is-local' : ''}"
        ${directed ? 'marker-end="url(#cs-arrow)"' : ''}/>`;
      })
      .join('');
    const dots = order
      .map((i) => {
        const [x, y] = projected[i];
        const r = i === selected ? 0.034 : 0.019;
        return `${rings?.[i] || i === selected ? `<circle class="cs-fallback-ring" cx="${x}" cy="${y}" r="${r + 0.011}" stroke="${rings?.[i]?.color ?? '#fff'}"/>` : ''}
        <circle data-select="${i}" cx="${x}" cy="${y}" r="${r}" fill="${colors[i]}"><title>${escapeHtml(model.concepts[i].name)}</title></circle>`;
      })
      .join('');
    const placed = [];
    const labels = (selected >= 0 ? [selected, ...neighbours] : landmarks)
      .map((i) => {
        if (!visible[i]) return '';
        const [x, y] = projected[i];
        const name = model.concepts[i].name;
        const w = Math.min(1.05, name.length * 0.032);
        const left = Math.min(x + 0.035, 1.19 - w);
        if (
          left < -1.2 ||
          y < -0.93 ||
          y > 1.12 ||
          placed.some(([px, py, pw]) => Math.abs(py - y) < 0.085 && left < px + pw && left + w > px)
        )
          return '';
        placed.push([left, y, w]);
        return `<text x="${left}" y="${y}" dominant-baseline="central">${escapeHtml(name.length > 35 ? name.slice(0, 32) + '…' : name)}</text>`;
      })
      .join('');
    svg.innerHTML = `<defs><marker id="cs-arrow" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 8 4 0 8Z" fill="context-stroke" stroke="none"/></marker></defs>
      <circle cx="${-centre[0]}" cy="${-centre[1]}" r="1" class="cs-fallback-sphere"/>
      <g class="cs-fallback-lines">${lines}</g>${dots}${labels}`;
  }

  function schedule() {
    if (frame === undefined) frame = requestAnimationFrame(draw);
  }

  let drag;
  svg.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, y: event.clientY, moved: 0 };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag = { x: event.clientX, y: event.clientY, moved: drag.moved + Math.abs(dx) + Math.abs(dy) };
    yaw += dx * 0.01;
    pitch = Math.max(-1.4, Math.min(1.4, pitch + dy * 0.01));
    schedule();
  });
  svg.addEventListener('pointercancel', () => {
    drag = null;
  });
  svg.addEventListener('pointerup', (event) => {
    const moved = drag?.moved ?? 0;
    drag = null;
    if (moved < 6) {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('circle[data-select]');
      onSelect(target ? Number(target.dataset.select) : -1);
    }
  });

  return {
    setLayout(to, { animate } = {}) {
      if (animate && !reducedMotion) transition = { from: points, to, start: performance.now() };
      else {
        points = to;
        transition = null;
      }
      schedule();
    },
    setColors(list) {
      colors = list;
      schedule();
    },
    setVisibility(list) {
      visible = list;
      schedule();
    },
    setRelationMask(list) {
      relationMask = list;
      schedule();
    },
    setRings(list) {
      rings = list;
      schedule();
    },
    setSelection(i, links) {
      selected = i;
      neighbours = [...new Set(links.relations.flatMap((k) => endpoints[k]))].filter(
        (j) => j !== i,
      );
      schedule();
    },
    setLandmarks(list) {
      landmarks = list;
      schedule();
    },
    setGeometry() {},
    setInset(rect) {
      inset = rect;
      schedule();
    },
    focusOn: schedule,
    resetCamera() {
      yaw = 0.3;
      pitch = -0.2;
      schedule();
    },
  };
}
