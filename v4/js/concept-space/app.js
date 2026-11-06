import '../../styles/concept-space.css';

import {
  CHANNELS,
  DEFAULT_WEIGHTS,
  computeLayout,
  decode,
  diagnose,
  normalizeWeights,
} from './model.js';
import { KIND_SHAPES, RELATION_STYLE, createScene, webglAvailable } from './scene.js';
import { createFallback } from './fallback.js';
import { EVIDENCE_STATES, readOverlay } from './overlay.js';

const DATA_URL = '../data/concepts.stats310a.public.json';
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch],
  );

export const CHAPTER_COLORS = { 1: '#3987e5', 2: '#d95926', 3: '#199e70' };
const CHAPTER_NAMES = {
  1: 'Measure, integration, independence',
  2: 'Laws of large numbers',
  3: 'Weak convergence and the CLT',
};
const CHANNEL_LABELS = { semantic: 'Language', math: 'Structure', source: 'Syllabus' };
const CHANNEL_GREEK = { semantic: 'α', math: 'β', source: 'γ' };
const PRESETS = {
  semantic: { semantic: 1, math: 0, source: 0 },
  source: { semantic: 0, math: 0, source: 1 },
  balanced: { semantic: 0.3, math: 0.5, source: 0.2 },
  default: DEFAULT_WEIGHTS,
};
const SUPPORT_BADGE = {
  verified: { label: 'Verified', color: '#0ca30c' },
  cited: { label: 'Dembo cites', color: '#7fa7ee' },
  named: { label: 'Dembo names', color: '#a9b2c6' },
  notes: { label: 'Lecture notes', color: '#6cc3a2' },
  agent_only: { label: 'No citation found', color: '#8b92a3' },
};
const STATUS_BADGE = {
  verified: { label: 'Verified', color: '#0ca30c' },
  agent_reviewed: { label: 'Agent-reviewed', color: '#c3b7fb' },
  proposed: { label: 'Unreviewed', color: '#8b92a3' },
};
const isReviewed = (relation) => ['agent_reviewed', 'verified'].includes(relation.status);
const RESULT_KIND = {
  theo: 'Theorem',
  lemm: 'Lemma',
  prop: 'Proposition',
  coro: 'Corollary',
  defi: 'Definition',
  exer: 'Exercise',
  exam: 'Example',
  rema: 'Remark',
};
const resultLabel = (ref) => {
  const [kind, number] = ref.split(':');
  return `${RESULT_KIND[kind] ?? kind} ${number}`;
};
const MODE_NOTES = {
  pca: 'Kernel PCA of the weighted kernel: the three directions of largest variance. Axes mean something; most variance is discarded.',
  force:
    'Springs along strong affinities and relations, repulsion between all concepts, seeded start. Axes are arbitrary.',
  hybrid:
    'Starts from PCA, then relaxes with the force model. Keeps PCA’s global arrangement and sharpens local neighbourhoods.',
};
const KIND_LABELS = {
  definition: 'Definition',
  construction: 'Construction',
  theorem: 'Theorem',
  inequality: 'Inequality',
  technique: 'Technique',
  example: 'Example',
};
const SHAPE_SVG = {
  sphere: '<circle cx="8" cy="8" r="5"/>',
  cube: '<rect x="3.5" y="3.5" width="9" height="9" rx="1"/>',
  octahedron: '<path d="M8 2 14 8 8 14 2 8Z"/>',
  tetrahedron: '<path d="M8 2.5 14 13H2Z"/>',
  ring: '<circle cx="8" cy="8" r="4.5" fill="none" stroke-width="2.4"/>',
  cone: '<path d="M8 2 12.5 13h-9Z"/>',
};
const shape = (kind, color = 'currentColor') =>
  `<svg class="cs-shape" viewBox="0 0 16 16" aria-hidden="true" fill="${color}" stroke="${color}">${SHAPE_SVG[KIND_SHAPES[kind]]}</svg>`;

export const chapterOf = (concept) => Number(concept.sources.dembo_sections[0].split('.')[0]);

function depthColor(level, max) {
  // One-hue sequential ramp on the dark surface: deep blue (foundations) to pale blue.
  const t = max ? level / max : 0;
  const mix = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${mix(46, 176)}, ${mix(88, 208)}, ${mix(168, 255)})`;
}

async function main() {
  const status = $('cs-status');
  status.textContent = 'Loading concepts…';
  let data;
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    status.textContent = `Could not load the concept graph (${error.message}).`;
    return;
  }
  if (data.visibility !== 'public_curriculum_only') {
    status.textContent = 'Refusing to display a non-public export.';
    return;
  }
  const model = decode(data);
  const params = new URLSearchParams(location.search);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {
    mode:
      params.get('mode') && ['pca', 'force', 'hybrid'].includes(params.get('mode'))
        ? params.get('mode')
        : 'hybrid',
    geometry: 'volume',
    shells: false,
    weights: { ...DEFAULT_WEIGHTS },
    colorBy: 'chapter',
    kinds: new Set(data.concept_kinds),
    relationTypes: Object.fromEntries(Object.keys(RELATION_STYLE).map((type) => [type, true])),
    chapter: 'all',
    week: 9,
    showUnsourced: true,
    selected: -1,
    layout: null,
    overlay: null,
  };
  const degree = model.concepts.map(() => 0);
  for (const relation of model.relations) {
    degree[model.index.get(relation.source)]++;
    degree[model.index.get(relation.target)]++;
  }
  const maxDepth = Math.max(...model.concepts.map((c) => c.depth));
  const weeks = data.weeks ?? [];
  const weekIndex = new Map(weeks.map((w, i) => [w.id, i + 1]));
  // A concept's week is the first syllabus week covering one of its subsections (null if unscheduled).
  const conceptWeek = model.concepts.map((concept) => {
    const ids = concept.sources.syllabus_weeks.map((id) => weekIndex.get(id)).filter(Boolean);
    return ids.length ? Math.min(...ids) : null;
  });
  const reached = weeks.filter((w) => w.dates[0] <= data.as_of).length;
  const supportCounts = {};
  for (const relation of model.relations) {
    supportCounts[relation.support] = (supportCounts[relation.support] ?? 0) + 1;
  }
  const sourcedShare = model.concepts.map((_, i) => {
    let total = 0;
    let good = 0;
    for (const relation of model.relations) {
      if (model.index.get(relation.source) !== i && model.index.get(relation.target) !== i)
        continue;
      total++;
      if (relation.support !== 'agent_only' || isReviewed(relation)) good++;
    }
    return total ? good / total : 0;
  });
  const sourcedRelations = model.relations.length - (supportCounts.agent_only ?? 0);
  const reviewedRelations = model.relations.filter(isReviewed).length;
  const unbacked = model.relations.filter(
    (r) => r.support === 'agent_only' && !isReviewed(r),
  ).length;

  $('cs-lede').textContent =
    `Probability theory (STATS 310A / MATH 230A): ${model.n} concepts and ${model.relations.length} typed relations, projected from a high-dimensional space into a sphere. ${reviewedRelations} relations have been checked against the Dembo notes by an independent reviewer agent; ${sourcedRelations} also carry an automatic citation or mention${unbacked ? `; ${unbacked} are still unchecked` : ''}. None is verified by a person yet.`;

  const hasWebGL = webglAvailable();
  const callbacks = {
    canvas: $('cs-canvas'),
    labels: $('cs-labels'),
    gizmo: $('cs-gizmo'),
    model,
    reducedMotion,
    onSelect: (index) => select(index, { focus: index >= 0 }),
    onHover: () => {},
  };
  let view;
  let flat = !hasWebGL;
  try {
    view = hasWebGL
      ? createScene(callbacks)
      : createFallback({ ...callbacks, stage: $('cs-stage') });
  } catch (error) {
    console.warn('WebGL scene failed, using fallback', error);
    flat = true;
    view = createFallback({ ...callbacks, stage: $('cs-stage') });
  }
  if (flat) {
    status.classList.add('is-note');
    status.textContent =
      'WebGL is unavailable, so this is a flat projection of the same layout. The List view has every concept.';
  } else status.textContent = '';

  // ---------------------------------------------------------------- controls
  const weightsEl = $('cs-weights');
  weightsEl.innerHTML = CHANNELS.map(
    (name) => `
      <label class="cs-weight" for="w-${name}">
        <span>${CHANNEL_LABELS[name]} <i>${CHANNEL_GREEK[name]}</i></span>
        <input id="w-${name}" type="range" min="0" max="100" step="1" data-channel="${name}" value="${Math.round(state.weights[name] * 100)}" />
        <output id="o-${name}"></output>
      </label>`,
  ).join('');
  const kindsEl = $('cs-kinds');
  kindsEl.insertAdjacentHTML(
    'beforeend',
    data.concept_kinds
      .map(
        (kind) =>
          `<label><input type="checkbox" checked data-kind="${kind}" />${shape(kind)}${KIND_LABELS[kind]}</label>`,
      )
      .join(''),
  );
  const relationsEl = $('cs-relations');
  relationsEl.insertAdjacentHTML(
    'beforeend',
    Object.entries(RELATION_STYLE)
      .map(
        ([type, style]) =>
          `<label title="${escapeHtml(data.relation_types[type]?.meaning)}"><input type="checkbox" checked data-relation="${type}" /><i class="cs-swatch" style="background:${style.color}"></i>${style.label}</label>`,
      )
      .join(''),
  );

  function syncControls() {
    const shares = normalizeWeights(state.weights);
    for (const name of CHANNELS) {
      $(`w-${name}`).value = String(Math.round(state.weights[name] * 100));
      $(`o-${name}`).textContent = `${Math.round(shares[name] * 100)}%`;
    }
    for (const button of $('cs-mode').querySelectorAll('button')) {
      button.setAttribute('aria-checked', String(button.dataset.mode === state.mode));
    }
    for (const button of $('cs-geometry').querySelectorAll('button')) {
      button.setAttribute('aria-checked', String(button.dataset.geometry === state.geometry));
    }
    $('cs-shells').checked = state.shells;
    $('cs-shells').disabled = state.geometry === 'surface' || state.mode === 'pca';
    $('cs-mode-note').textContent = MODE_NOTES[state.mode];
    $('cs-color').value = state.colorBy;
    $('cs-chapter').value = state.chapter;
    $('cs-week').value = String(state.week);
    const week = weeks[state.week - 1];
    $('cs-week-label').textContent = week ? `week ${state.week} (${week.dates[0].slice(5)})` : '';
    $('cs-week-note').textContent =
      state.week >= weeks.length
        ? `Every concept shown. As of ${data.as_of} the syllabus has reached week ${reached}; drag left to fade later material.`
        : `Concepts first scheduled after week ${state.week} are faded. As of ${data.as_of} the syllabus has reached week ${reached}.`;
    const pure = state.weights.math > 0 && !state.weights.semantic && !state.weights.source;
    $('cs-shape-note').textContent = pure
      ? 'Positions come from mathematical structure alone: typed relations, at full weight once reviewed.'
      : 'Positions mix structure with the affinities chosen below. Language and syllabus proximity are not dependencies.';
  }

  let layoutTimer = 0;
  function relayout({ animate = true, delay = 0, warm = false } = {}) {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(() => {
      const layout = computeLayout(model, {
        mode: state.mode,
        weights: state.weights,
        geometry: state.geometry,
        shells: state.shells,
        previous: state.layout?.points,
        warm,
      });
      state.layout = layout;
      view.setLayout(layout.points, { animate });
      view.setGeometry(state);
      if (state.selected >= 0) select(state.selected, { focus: false });
      // Diagnostics cost a few milliseconds; run them after the frame that starts the transition.
      setTimeout(() => renderDiagnostics(layout), 60);
    }, delay);
  }

  function renderDiagnostics(layout) {
    const result = diagnose(model, layout, data.review_pairs);
    const passed = result.reviews.filter((review) => review.ok).length;
    const bars = CHANNELS.map((name) => {
      const value = result.channel[name].overlap;
      return `<div class="cs-bar"><span>${CHANNEL_LABELS[name]}</span><b style="--v:${Math.min(1, value / 0.8)}"></b><em>${value.toFixed(2)}</em></div>`;
    }).join('');
    const pca =
      state.mode === 'pca'
        ? `<p>These three axes keep <b>${Math.round(result.explained.reduce((a, b) => a + b, 0) * 100)}%</b> of the weighted kernel's variance (${result.explained.map((v) => `${Math.round(v * 100)}%`).join(' + ')}).</p>`
        : '';
    const support = Object.entries(SUPPORT_BADGE)
      .filter(([key]) => supportCounts[key])
      .map(([key, badge]) => `${badge.label.toLowerCase()} ${supportCounts[key]}`)
      .join(' · ');
    $('cs-diagnostic').innerHTML = `
      <p>Relations: ${support}. Reviewed by an independent agent: ${reviewedRelations}.</p>
      <p>Which channel the 3D neighbourhoods agree with (mean overlap of 8 nearest neighbours, 0–1):</p>
      ${bars}
      ${pca}
      <p>Review set: <b>${passed}/${result.reviews.length}</b> pairs placed as expected. <a href="https://github.com/josephbaileyy/josephbaileyy.github.io/blob/main/docs/CONCEPT_SPACE.md">Evaluation</a></p>`;
    $('cs-axes').textContent =
      state.mode === 'pca'
        ? `Axes 1–3: kernel principal components (${Math.round(result.explained[0] * 100)}%, ${Math.round(result.explained[1] * 100)}%, ${Math.round(result.explained[2] * 100)}%)`
        : 'Axes carry no meaning in force layouts; only distances do.';
  }

  function visibility() {
    return model.concepts.map(
      (concept) =>
        state.kinds.has(concept.kind) &&
        (state.chapter === 'all' || String(chapterOf(concept)) === state.chapter),
    );
  }

  function fade(color) {
    // Mix toward the stage background for concepts beyond the syllabus slider.
    const probe = document.createElement('i');
    probe.style.color = color;
    document.body.append(probe);
    const [r, g, b] = getComputedStyle(probe).color.match(/\d+/g).map(Number);
    probe.remove();
    const mix = (v, bg) => Math.round(bg + (v - bg) * 0.22);
    return `rgb(${mix(r, 16)}, ${mix(g, 18)}, ${mix(b, 23)})`;
  }

  function colours() {
    return model.concepts.map((concept, i) => {
      let color;
      if (state.colorBy === 'depth') color = depthColor(concept.depth, maxDepth);
      else if (state.colorBy === 'week')
        color = conceptWeek[i] ? depthColor(conceptWeek[i] - 1, weeks.length - 1) : '#5b6170';
      else if (state.colorBy === 'support') color = depthColor(sourcedShare[i], 1);
      else if (state.colorBy === 'evidence' && state.overlay)
        color = EVIDENCE_STATES[state.overlay.concepts[concept.id]?.state ?? 'no_evidence'].color;
      else color = CHAPTER_COLORS[chapterOf(concept)];
      return conceptWeek[i] && conceptWeek[i] > state.week ? fade(color) : color;
    });
  }

  function renderLegend() {
    let items;
    if (state.colorBy === 'week') {
      items = [1, 5, weeks.length].map(
        (w) =>
          `<span><i class="cs-swatch" style="background:${depthColor(w - 1, weeks.length - 1)}"></i>week ${w}${weeks[w - 1] ? ` · ${escapeHtml(weeks[w - 1].focus)}` : ''}</span>`,
      );
      items.push(
        '<small>First syllabus week that covers one of the concept’s subsections.</small>',
      );
    } else if (state.colorBy === 'support') {
      items = [0, 0.5, 1].map(
        (v) =>
          `<span><i class="cs-swatch" style="background:${depthColor(v, 1)}"></i>${Math.round(v * 100)}% of its relations sourced</span>`,
      );
      items.push(
        '<small>Share of each concept’s relations that are sourced or agent-reviewed. Darker concepts rest on unchecked proposals.</small>',
      );
    } else if (state.colorBy === 'depth') {
      items = [0, Math.round(maxDepth / 2), maxDepth].map(
        (level) =>
          `<span><i class="cs-swatch" style="background:${depthColor(level, maxDepth)}"></i>depth ${level}</span>`,
      );
      items.push(
        '<small>Longest chain of prerequisite / used-in-proof / application links leading to the concept.</small>',
      );
    } else if (state.colorBy === 'evidence' && state.overlay) {
      items = Object.entries(EVIDENCE_STATES).map(
        ([key, s]) =>
          `<span><i class="cs-state" data-state="${key}" style="--c:${s.color}"></i>${s.label}</span>`,
      );
      items.push(
        '<small>No evidence means untested, not failed. States summarize linked ledger skills only.</small>',
      );
    } else {
      items = Object.entries(CHAPTER_COLORS).map(
        ([chapter, color]) =>
          `<span><i class="cs-swatch" style="background:${color}"></i>Ch. ${chapter} · ${CHAPTER_NAMES[chapter]}</span>`,
      );
    }
    $('cs-legend').innerHTML = items.join('');
  }

  function refreshAppearance() {
    view.setColors(colours());
    view.setVisibility(visibility());
    view.setRelationTypes(state.relationTypes, state.showUnsourced);
    view.setRings(
      state.colorBy === 'evidence' && state.overlay
        ? model.concepts.map((concept) =>
            state.overlay.concepts[concept.id]?.retention_verified ? { color: '#f0f0f3' } : null,
          )
        : null,
    );
    const shown = visibility();
    const landmarks = [...model.concepts.keys()]
      .filter((i) => shown[i])
      .sort((a, b) => degree[b] - degree[a] || a - b)
      .slice(0, window.innerWidth < 700 ? 7 : 16);
    view.setLandmarks(landmarks);
    renderLegend();
    renderList();
  }

  // ---------------------------------------------------------------- selection
  function neighbourhoodOf(index) {
    const relations = [];
    model.relations.forEach((relation, k) => {
      if (model.index.get(relation.source) === index || model.index.get(relation.target) === index)
        relations.push(k);
    });
    const W = state.layout?.W;
    const affinity = [];
    if (W) {
      const row = [];
      for (let j = 0; j < model.n; j++) if (j !== index) row.push([j, W[index * model.n + j]]);
      row.sort((a, b) => b[1] - a[1]);
      affinity.push(...row.slice(0, 6).map(([j]) => j));
    }
    return { relations, affinity };
  }

  function select(index, { focus = true } = {}) {
    state.selected = index;
    if (index < 0) {
      view.setSelection(-1);
      $('cs-detail').hidden = true;
      view.setInset?.(0);
      const url = new URL(location.href);
      url.searchParams.delete('c');
      history.replaceState(null, '', url);
      return;
    }
    const neighbours = neighbourhoodOf(index);
    view.setSelection(index, neighbours);
    if (focus) view.focusOn(index);
    renderDetail(index, neighbours);
    view.setInset?.($('cs-detail').offsetWidth + 14);
    const url = new URL(location.href);
    url.searchParams.set('c', model.concepts[index].id.slice(8));
    history.replaceState(null, '', url);
  }

  function conceptButton(i) {
    const concept = model.concepts[i];
    return `<button type="button" class="cs-link" data-select="${i}">${shape(concept.kind, CHAPTER_COLORS[chapterOf(concept)])}${escapeHtml(concept.name)}</button>`;
  }

  function evidenceText(relation) {
    const items = relation.evidence ?? [];
    if (!items.length) return '';
    const parts = items.slice(0, 2).map((e) => {
      if (e.source === 'dembo') {
        const what = e.kind === 'cites' ? `cites ${resultLabel(e.cited)}` : 'names it';
        return `${resultLabel(e.result)}, p. ${e.page} (${e.part}) ${what}`;
      }
      const lecture = /lecture(\d+):topic(\d+)/.exec(e.topic);
      return `notes L${lecture?.[1]} · ${escapeHtml(data.lecture_topics[e.topic] ?? '')}`;
    });
    return ` ${parts.join('; ')}${items.length > 2 ? ` +${items.length - 2}` : ''}`;
  }

  function renderDetail(index, neighbours) {
    const concept = model.concepts[index];
    const chapter = chapterOf(concept);
    const sections = concept.sources.dembo_sections
      .map((sid) => {
        const section = data.sections[sid];
        const label = `§${sid} ${escapeHtml(section?.title ?? '')}`;
        return section?.reader_anchor
          ? `<li><a href="../../probability/#${encodeURIComponent(section.reader_anchor)}">${label}</a></li>`
          : `<li>${label}</li>`;
      })
      .join('');
    const lectures = concept.sources.lecture_topics
      .map((tid) => {
        const lecture = /lecture(\d+)/.exec(tid)?.[1];
        return `<li>L${lecture} · ${escapeHtml(data.lecture_topics[tid])}</li>`;
      })
      .join('');
    const groups = { in: [], out: [], both: [] };
    for (const k of neighbours.relations) {
      const relation = model.relations[k];
      const directed = data.relation_types[relation.type]?.directed;
      const outgoing = model.index.get(relation.source) === index;
      const other = model.index.get(outgoing ? relation.target : relation.source);
      const badge = SUPPORT_BADGE[relation.support] ?? SUPPORT_BADGE.agent_only;
      const status = STATUS_BADGE[relation.status] ?? STATUS_BADGE.proposed;
      const review = relation.review
        ? `<small class="cs-review">Reviewer: ${escapeHtml(relation.review.reason)}${relation.review.correction ? ` (corrected; ${escapeHtml(relation.review.correction)})` : ''}</small>`
        : '';
      const row = `<li title="${escapeHtml(relation.rationale)}" class="${relation.support === 'agent_only' && !isReviewed(relation) ? 'is-unsourced' : ''}">
          <span class="cs-rel" style="--c:${RELATION_STYLE[relation.type].color}">${RELATION_STYLE[relation.type].label}</span>
          ${conceptButton(other)}
          <small>${escapeHtml(relation.rationale)}</small>
          <small class="cs-support"><span class="cs-badge" style="--c:${status.color}">${status.label}</span><span class="cs-badge" style="--c:${badge.color}">${badge.label}</span>${evidenceText(relation)}</small>
          ${review}
        </li>`;
      (directed ? (outgoing ? groups.out : groups.in) : groups.both).push(row);
    }
    const anchors = concept.sources.dembo_results
      .map((ref) => {
        const info = data.dembo_results[ref] ?? {};
        return `<li>${resultLabel(ref)}${info.title ? ` · ${escapeHtml(info.title)}` : ''}${info.page ? ` <em>p. ${info.page}</em>` : ''}</li>`;
      })
      .join('');
    const exercises = concept.sources.exercises.map((label) => {
      const [hw, number] = label.split(':');
      return `${hw.toUpperCase()} ${number}`;
    });
    const W = state.layout.W;
    const near = neighbours.affinity
      .map((j) => {
        const bars = CHANNELS.map((name) => {
          const value = model.S[name][index * model.n + j];
          return `<b class="cs-mini" style="--v:${value}" title="${CHANNEL_LABELS[name]} similarity ${value.toFixed(2)}"></b>`;
        }).join('');
        return `<li>${conceptButton(j)}<span class="cs-minis" aria-label="Language, structure, syllabus similarity">${bars}</span><em>${W[index * model.n + j].toFixed(2)}</em></li>`;
      })
      .join('');
    let evidence = '';
    if (state.overlay) {
      const entry = state.overlay.concepts[concept.id];
      const s = EVIDENCE_STATES[entry?.state ?? 'no_evidence'];
      const skills = (entry?.linked_topics ?? [])
        .map((topic) => {
          const scores = ['recognition', 'construction', 'rigor', 'retention']
            .map(
              (key) =>
                `<span title="${key} (0–4; — means not tested)">${key.slice(0, 3)} ${topic.scores[key] ?? '—'}</span>`,
            )
            .join('');
          return `<li><b>${escapeHtml(topic.name)}</b><span class="cs-scores">${scores}</span><small>${escapeHtml(topic.assessment_status)}${topic.next_probe ? ` · next: ${escapeHtml(topic.next_probe)}` : ''}</small></li>`;
        })
        .join('');
      evidence = `<section class="cs-evidence"><h3>Private evidence</h3>
        <p><i class="cs-state" data-state="${entry?.state ?? 'no_evidence'}" style="--c:${s.color}"></i>${s.label}${entry?.retention_verified ? '' : ' · retention not yet verified'}</p>
        ${skills ? `<ul class="cs-skills">${skills}</ul>` : '<p class="cs-note">No linked ledger skill. Untested, which says nothing either way.</p>'}
      </section>`;
    }
    $('cs-detail').innerHTML = `
      <header>
        <p class="cs-kicker"><i class="cs-swatch" style="background:${CHAPTER_COLORS[chapter]}"></i>${shape(concept.kind)} ${KIND_LABELS[concept.kind]} · depth ${concept.depth}</p>
        <h2>${escapeHtml(concept.name)}</h2>
        <button type="button" class="cs-close" id="cs-close" aria-label="Close concept details">×</button>
      </header>
      ${concept.aliases.length ? `<p class="cs-aliases">${concept.aliases.map(escapeHtml).join(' · ')}</p>` : ''}
      <p class="cs-summary">${escapeHtml(concept.summary)}</p>
      ${evidence}
      <div class="cs-columns">
        <section><h3>Sources</h3><ul class="cs-plain">${sections}${lectures}</ul>
          ${anchors ? `<ul class="cs-plain cs-anchors">${anchors}</ul>` : '<p class="cs-note">No numbered Dembo result is anchored to this concept.</p>'}
          <p class="cs-note">${concept.sources.syllabus_weeks.length ? `Syllabus ${concept.sources.syllabus_weeks.join(', ')}` : 'Not on the syllabus schedule'}${exercises.length ? ` · homework exercises citing or naming it: ${exercises.join(', ')}` : ''}${concept.semantic_basis === 'agent_summary' ? ' · language channel uses the summary (not in the notes yet)' : ''}</p></section>
      </div>
      ${groups.in.length ? `<section><h3>Builds on</h3><ul class="cs-relations">${groups.in.join('')}</ul></section>` : ''}
      ${groups.out.length ? `<section><h3>Leads to</h3><ul class="cs-relations">${groups.out.join('')}</ul></section>` : ''}
      ${groups.both.length ? `<section><h3>Related</h3><ul class="cs-relations">${groups.both.join('')}</ul></section>` : ''}
      <section><h3>Nearest by current weights</h3>
        <p class="cs-note">Bars: language, structure, syllabus similarity. Number: combined affinity W.</p>
        <ul class="cs-near">${near}</ul></section>`;
    $('cs-detail').hidden = false;
    $('cs-close').addEventListener('click', () => select(-1));
  }

  // ---------------------------------------------------------------- list view
  function renderList() {
    const shown = visibility();
    const bySection = new Map();
    model.concepts.forEach((concept, i) => {
      if (!shown[i]) return;
      const sid = concept.sources.dembo_sections[0];
      if (!bySection.has(sid)) bySection.set(sid, []);
      bySection.get(sid).push(i);
    });
    const order = Object.keys(data.sections);
    $('cs-list').innerHTML = `<h2>All concepts by Dembo subsection</h2>${order
      .filter((sid) => bySection.has(sid))
      .map(
        (sid) =>
          `<section><h3>§${sid} ${escapeHtml(data.sections[sid].title)}</h3><ul>${bySection
            .get(sid)
            .map(
              (i) =>
                `<li>${conceptButton(i)} <small>${KIND_LABELS[model.concepts[i].kind]} · ${degree[i]} relations</small></li>`,
            )
            .join('')}</ul></section>`,
      )
      .join('')}`;
  }

  // ---------------------------------------------------------------- search
  const search = $('cs-search');
  const results = $('cs-results');
  const searchIndex = model.concepts.map((concept) =>
    [concept.name, ...concept.aliases, concept.kind, concept.sources.dembo_sections.join(' ')]
      .join(' ')
      .toLowerCase(),
  );
  let active = 0;
  function runSearch() {
    const query = search.value.trim().toLowerCase();
    if (!query) {
      results.hidden = true;
      search.setAttribute('aria-expanded', 'false');
      return;
    }
    const terms = query.split(/\s+/);
    const hits = searchIndex
      .map((text, i) => [
        i,
        terms.every((t) => text.includes(t))
          ? model.concepts[i].name.toLowerCase().startsWith(query)
            ? 2
            : 1
          : 0,
      ])
      .filter(([, score]) => score)
      .sort((a, b) => b[1] - a[1] || degree[b[0]] - degree[a[0]])
      .slice(0, 8);
    active = 0;
    results.innerHTML = hits.length
      ? hits
          .map(
            ([i], k) =>
              `<li role="option" id="cs-opt-${k}" aria-selected="${k === 0}" data-select="${i}">${shape(model.concepts[i].kind, CHAPTER_COLORS[chapterOf(model.concepts[i])])}<span>${escapeHtml(model.concepts[i].name)}</span><small>§${model.concepts[i].sources.dembo_sections[0]}</small></li>`,
          )
          .join('')
      : '<li class="cs-empty">No concept matches.</li>';
    results.hidden = false;
    search.setAttribute('aria-expanded', 'true');
  }
  search.addEventListener('input', runSearch);
  search.addEventListener('keydown', (event) => {
    const options = [...results.querySelectorAll('[data-select]')];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      active =
        (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
        Math.max(1, options.length);
      options.forEach((option, k) => option.setAttribute('aria-selected', String(k === active)));
      search.setAttribute('aria-activedescendant', `cs-opt-${active}`);
    } else if (event.key === 'Enter' && options[active]) {
      event.preventDefault();
      chooseFromSearch(Number(options[active].dataset.select));
    } else if (event.key === 'Escape') {
      search.value = '';
      runSearch();
    }
  });
  function chooseFromSearch(i) {
    search.value = '';
    runSearch();
    if (!visibility()[i]) {
      state.kinds = new Set(data.concept_kinds);
      state.chapter = 'all';
      kindsEl.querySelectorAll('input').forEach((input) => (input.checked = true));
      syncControls();
      refreshAppearance();
    }
    select(i);
  }
  document.addEventListener('keydown', (event) => {
    if (
      event.key === '/' &&
      document.activeElement !== search &&
      !/input|select|textarea/i.test(document.activeElement?.tagName ?? '')
    ) {
      event.preventDefault();
      search.focus();
    } else if (event.key === 'Escape' && document.activeElement !== search) {
      select(-1);
    }
  });
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-select]');
    if (target) {
      const i = Number(target.dataset.select);
      if (results.contains(target)) chooseFromSearch(i);
      else select(i);
      return;
    }
    if (!$('cs-search-wrap').contains(event.target)) results.hidden = true;
  });

  // ---------------------------------------------------------------- wiring
  weightsEl.addEventListener('input', (event) => {
    const name = event.target.dataset.channel;
    if (!name) return;
    state.weights[name] = Number(event.target.value) / 100;
    syncControls();
    relayout({ delay: 140, warm: true });
  });
  $('cs-presets').addEventListener('click', (event) => {
    const preset = event.target.closest('[data-preset]')?.dataset.preset;
    if (!preset) return;
    state.weights = { ...PRESETS[preset] };
    syncControls();
    relayout();
  });
  $('cs-mode').addEventListener('click', (event) => {
    const mode = event.target.closest('[data-mode]')?.dataset.mode;
    if (!mode || mode === state.mode) return;
    state.mode = mode;
    if (mode === 'pca') state.shells = false;
    syncControls();
    relayout();
  });
  $('cs-geometry').addEventListener('click', (event) => {
    const geometry = event.target.closest('[data-geometry]')?.dataset.geometry;
    if (!geometry || geometry === state.geometry) return;
    state.geometry = geometry;
    if (geometry === 'surface') state.shells = false;
    syncControls();
    relayout();
  });
  $('cs-shells').addEventListener('change', (event) => {
    state.shells = event.target.checked;
    syncControls();
    relayout();
  });
  $('cs-color').addEventListener('change', (event) => {
    state.colorBy = event.target.value;
    refreshAppearance();
  });
  $('cs-chapter').addEventListener('change', (event) => {
    state.chapter = event.target.value;
    refreshAppearance();
  });
  kindsEl.addEventListener('change', (event) => {
    const kind = event.target.dataset.kind;
    if (!kind) return;
    if (event.target.checked) state.kinds.add(kind);
    else state.kinds.delete(kind);
    refreshAppearance();
  });
  $('cs-unsourced').addEventListener('change', (event) => {
    state.showUnsourced = event.target.checked;
    refreshAppearance();
    if (state.selected >= 0) select(state.selected, { focus: false });
  });
  $('cs-week').addEventListener('input', (event) => {
    state.week = Number(event.target.value);
    syncControls();
    refreshAppearance();
  });
  relationsEl.addEventListener('change', (event) => {
    const type = event.target.dataset.relation;
    if (!type) return;
    state.relationTypes[type] = event.target.checked;
    refreshAppearance();
  });
  $('cs-reset-layout').addEventListener('click', () => {
    Object.assign(state, {
      mode: 'hybrid',
      geometry: 'volume',
      shells: false,
      weights: { ...DEFAULT_WEIGHTS },
      chapter: 'all',
    });
    state.kinds = new Set(data.concept_kinds);
    kindsEl.querySelectorAll('input').forEach((input) => (input.checked = true));
    state.layout = null;
    syncControls();
    refreshAppearance();
    relayout();
    view.resetCamera();
  });
  $('cs-reset-camera').addEventListener('click', () => view.resetCamera());
  $('cs-global').addEventListener('click', () => {
    select(-1);
    view.resetCamera();
  });
  $('cs-list-toggle').addEventListener('click', (event) => {
    const open = $('cs-list').hidden;
    $('cs-list').hidden = !open;
    event.currentTarget.setAttribute('aria-pressed', String(open));
  });

  // Private overlay: read locally, held in memory only, never sent anywhere.
  $('cs-overlay').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      state.overlay = readOverlay(JSON.parse(await file.text()), data);
    } catch (error) {
      status.textContent = `Overlay not loaded: ${error.message}`;
      return;
    }
    status.textContent = '';
    $('cs-color').querySelector('[value="evidence"]').disabled = false;
    state.colorBy = 'evidence';
    $('cs-clear-overlay').hidden = false;
    $('cs-source').dataset.private = '';
    $('cs-source').lastChild.textContent = ' Local private overlay';
    syncControls();
    refreshAppearance();
    if (state.selected >= 0) select(state.selected, { focus: false });
  });
  $('cs-clear-overlay').addEventListener('click', () => {
    state.overlay = null;
    state.colorBy = 'chapter';
    $('cs-color').querySelector('[value="evidence"]').disabled = true;
    $('cs-clear-overlay').hidden = true;
    delete $('cs-source').dataset.private;
    $('cs-source').lastChild.textContent = ' Public curriculum';
    syncControls();
    refreshAppearance();
    if (state.selected >= 0) select(state.selected, { focus: false });
  });

  syncControls();
  refreshAppearance();
  relayout({ animate: false });
  const initial = params.get('c');
  if (initial && model.index.has(`concept:${initial}`)) {
    setTimeout(() => select(model.index.get(`concept:${initial}`)), 50);
  }
  // Expose a read-only handle for browser tests.
  window.__conceptSpace = { model, state, select };
}

main();
