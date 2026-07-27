import { projectTrack } from './event-geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MODES = new Set(['all', 'tracks', 'muons', 'energy']);

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function polarPoint(radius, angle) {
  return {
    x: 400 + Math.cos(angle) * radius,
    y: 400 + Math.sin(angle) * radius,
  };
}

function polarCellPath(hit) {
  const phi = Number.isFinite(hit.phi) ? hit.phi : 0;
  const et = Math.max(0.05, Number.isFinite(hit.et) ? hit.et : 0.05);
  const hcal = String(hit.system).toLowerCase() === 'hcal';
  const inner = hcal ? 305 : 273;
  const outer = inner + 10 + Math.min(50, Math.sqrt(et) * 11);
  const halfAngle = hcal ? 0.025 : 0.018;
  const a = polarPoint(inner, phi - halfAngle);
  const b = polarPoint(outer, phi - halfAngle);
  const c = polarPoint(outer, phi + halfAngle);
  const d = polarPoint(inner, phi + halfAngle);
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(
    1,
  )} A ${outer} ${outer} 0 0 1 ${c.x.toFixed(1)} ${c.y.toFixed(1)} L ${d.x.toFixed(
    1,
  )} ${d.y.toFixed(1)} A ${inner} ${inner} 0 0 0 ${a.x.toFixed(1)} ${a.y.toFixed(1)} Z`;
}

function addDetector(svg) {
  const group = svgElement('g', { class: 'event-lens__fallback-detector' });
  [23, 72, 127, 184, 245, 272, 305, 344].forEach((radius, index) => {
    group.append(
      svgElement('circle', {
        cx: 400,
        cy: 400,
        r: radius,
        class: index === 4 || index === 7 ? 'is-major' : '',
      }),
    );
  });
  group.append(
    svgElement('path', {
      d: 'M 366 400 H 434 M 400 366 V 434',
      class: 'event-lens__fallback-beamline',
    }),
  );
  svg.append(group);
}

function trackPath(track, muon) {
  const points = projectTrack(track, { muon, samples: muon ? 44 : 27 });
  return points
    .map((point, index) => {
      const x = 400 + point.x * 97;
      const y = 400 + point.y * 97;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function addTracks(svg, event, muon) {
  const source = Array.isArray(muon ? event?.muons : event?.tracks)
    ? muon
      ? event.muons
      : event.tracks
    : [];
  const limit = muon ? source.length : 170;
  const selected =
    source.length <= limit
      ? source
      : source
          .map((track, index) => ({ track, index }))
          .sort((a, b) => (b.track.pt ?? 0) - (a.track.pt ?? 0))
          .slice(0, limit)
          .sort((a, b) => a.index - b.index)
          .map(({ track }) => track);
  const group = svgElement('g', {
    class: muon
      ? 'event-lens__fallback-layer event-lens__fallback-muons'
      : 'event-lens__fallback-layer event-lens__fallback-tracks',
  });

  selected.forEach((track) => {
    const pt = Math.max(0.05, Number.isFinite(track.pt) ? track.pt : 0.05);
    group.append(
      svgElement('path', {
        d: trackPath(track, muon),
        class: muon ? 'is-muon' : track.q < 0 ? 'is-negative' : 'is-positive',
        opacity: muon ? 0.96 : Math.min(0.88, 0.24 + Math.log2(pt + 1) * 0.14),
        'stroke-width': muon ? 2.8 : Math.min(2.25, 0.75 + Math.log2(pt + 1) * 0.25),
      }),
    );
  });
  svg.append(group);
}

function addEnergy(svg, event) {
  const group = svgElement('g', {
    class: 'event-lens__fallback-layer event-lens__fallback-energy',
  });
  const hits = Array.isArray(event?.calo) ? event.calo : [];
  hits.forEach((hit) => {
    group.append(
      svgElement('path', {
        d: polarCellPath(hit),
        class:
          String(hit.system).toLowerCase() === 'hcal'
            ? 'event-lens__fallback-hcal'
            : 'event-lens__fallback-ecal',
        opacity: Math.min(0.98, 0.45 + Math.log2(Math.max(0.05, hit.et) + 1) * 0.15),
      }),
    );
  });
  svg.append(group);
}

function addLabels(svg, reason) {
  const label = svgElement('g', { class: 'event-lens__fallback-labels' });
  const top = svgElement('text', { x: 34, y: 70 });
  top.textContent = 'TRANSVERSE PROJECTION / XY';
  const bottom = svgElement('text', { x: 34, y: 728 });
  bottom.textContent = 'CHARGE-CURVED TRACKS / MUON SYSTEM / CALORIMETER';
  label.append(top, bottom);
  if (reason) {
    const status = svgElement('text', {
      x: 766,
      y: 45,
      'text-anchor': 'end',
      class: 'event-lens__fallback-status',
    });
    status.textContent = 'STATIC VIEW';
    label.append(status);
  }
  svg.append(label);
}

/**
 * Replaces the canvas area with a meaningful, mode-aware static SVG.
 */
export function renderEventFallback(
  stage,
  event,
  { mode = 'all', lens = { x: 0.5, y: 0.5 }, reason = '' } = {},
) {
  stage.querySelectorAll('canvas, .event-lens__fallback').forEach((node) => node.remove());

  const wrapper = document.createElement('div');
  wrapper.className = 'event-lens__fallback';
  const svg = svgElement('svg', {
    viewBox: '0 0 800 800',
    role: 'img',
    'aria-labelledby': 'event-lens-fallback-title event-lens-fallback-description',
    preserveAspectRatio: 'xMidYMid meet',
  });
  const title = svgElement('title', { id: 'event-lens-fallback-title' });
  title.textContent = 'Static CMS collision event display';
  const description = svgElement('desc', { id: 'event-lens-fallback-description' });
  description.textContent =
    'A transverse detector view. Curved red and blue charged-particle tracks emerge from the beamline, white muon tracks reach the outer detector, and amber calorimeter cells show measured energy.';
  svg.append(title, description);
  svg.append(svgElement('rect', { width: 800, height: 800, class: 'event-lens__fallback-bg' }));
  addDetector(svg);
  addTracks(svg, event, false);
  addTracks(svg, event, true);
  addEnergy(svg, event);
  addLabels(svg, reason);

  const lensCircle = svgElement('circle', {
    class: 'event-lens__fallback-lens',
    cx: lens.x * 800,
    cy: lens.y * 800,
    r: 182.4,
  });
  svg.append(lensCircle);
  wrapper.append(svg);
  stage.prepend(wrapper);

  function setMode(nextMode) {
    if (!MODES.has(nextMode)) {
      return;
    }
    svg.dataset.mode = nextMode;
  }

  function setLens(x, y) {
    lensCircle.setAttribute('cx', String(x * 800));
    lensCircle.setAttribute('cy', String(y * 800));
  }

  setMode(mode);
  return {
    setMode,
    setLens,
    destroy() {
      wrapper.remove();
    },
  };
}
