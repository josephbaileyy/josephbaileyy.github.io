// Flat SVG fallback when WebGL is unavailable: an orthographic projection of the
// same layout that can be rotated by dragging. It implements the subset of the
// scene interface that app.js uses.
const NS = 'http://www.w3.org/2000/svg';

export function createFallback({ stage, canvas, model, onSelect }) {
  canvas.hidden = true;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'cs-fallback');
  svg.setAttribute('viewBox', '-1.15 -1.15 2.3 2.3');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Flat projection of the concept graph');
  stage.prepend(svg);
  let points = model.concepts.map(() => [0, 0, 0]);
  let colors = model.concepts.map(() => '#888');
  let visible = model.concepts.map(() => true);
  let selected = -1;
  let yaw = 0.6;
  let pitch = -0.3;

  function project([x, y, z]) {
    const cx = Math.cos(yaw) * x + Math.sin(yaw) * z;
    const cz = -Math.sin(yaw) * x + Math.cos(yaw) * z;
    const cy = Math.cos(pitch) * y - Math.sin(pitch) * cz;
    const depth = Math.sin(pitch) * y + Math.cos(pitch) * cz;
    return [cx, -cy, depth];
  }

  function draw() {
    const projected = points.map(project);
    const order = [...projected.keys()].sort((a, b) => projected[a][2] - projected[b][2]);
    const lines = model.relations
      .map((relation) => {
        const a = projected[model.index.get(relation.source)];
        const b = projected[model.index.get(relation.target)];
        return `<line x1="${a[0].toFixed(3)}" y1="${a[1].toFixed(3)}" x2="${b[0].toFixed(3)}" y2="${b[1].toFixed(3)}"/>`;
      })
      .join('');
    const dots = order
      .filter((i) => visible[i])
      .map((i) => {
        const [x, y, z] = projected[i];
        return `<circle data-select="${i}" cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${i === selected ? 0.034 : 0.022}" fill="${colors[i]}" opacity="${(0.55 + (0.45 * (z + 1)) / 2).toFixed(2)}"><title>${model.concepts[i].name}</title></circle>`;
      })
      .join('');
    svg.innerHTML = `<circle r="1" class="cs-fallback-sphere"/><g class="cs-fallback-lines">${lines}</g>${dots}`;
  }

  let drag = null;
  svg.addEventListener('pointerdown', (event) => {
    drag = { x: event.clientX, y: event.clientY, moved: 0 };
    try {
      svg.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic or already-released pointers cannot be captured; dragging still works.
    }
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag = { x: event.clientX, y: event.clientY, moved: drag.moved + Math.abs(dx) + Math.abs(dy) };
    yaw += dx * 0.01;
    pitch = Math.max(-1.4, Math.min(1.4, pitch + dy * 0.01));
    draw();
  });
  svg.addEventListener('pointerup', (event) => {
    const moved = drag?.moved ?? 0;
    drag = null;
    if (moved < 6) {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest?.('[data-select]');
      onSelect(target ? Number(target.dataset.select) : -1);
    }
  });

  const noop = () => {};
  return {
    setLayout(list) {
      points = list;
      draw();
    },
    setColors(list) {
      colors = list;
      draw();
    },
    setVisibility(list) {
      visible = list;
      draw();
    },
    setSelection(index) {
      selected = index;
      draw();
    },
    setGeometry: noop,
    setRings: noop,
    setRelationTypes: noop,
    setLandmarks: noop,
    setInset: noop,
    focusOn: noop,
    resetCamera() {
      yaw = 0.6;
      pitch = -0.3;
      draw();
    },
    redraw: draw,
  };
}
