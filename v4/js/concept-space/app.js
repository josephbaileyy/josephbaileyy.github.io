import '../../styles/concept-space.css';

import {
  CHANNELS,
  DEFAULT_WEIGHTS,
  MODES,
  computeLayout,
  decode,
  diagnose,
  normalizeWeights,
} from './model.js';
import { COURSE_DISPLAY, curriculumIndex, isSourced, mapVisibility } from './curriculum.js';
import { createScene, webglAvailable, RELATION_STYLE } from './scene.js';
import { createFallback } from './fallback.js';
import { EVIDENCE_STATES, evidenceState, readOverlay } from './overlay.js';
import {
  courseCode,
  courseTag,
  escapeHtml,
  evidenceTag,
  humanize,
  renderInspector,
} from './inspector.js';
import { renderPractice, renderTimeline } from './study.js';

const $ = (id) => document.getElementById(id);
const localDate = () => {
  const today = new Date();
  return [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
};
const CHANNEL_LABELS = { semantic: 'Language', math: 'Structure', source: 'Syllabus' };
const PRESETS = {
  semantic: { semantic: 1, math: 0, source: 0 },
  source: { semantic: 0, math: 0, source: 1 },
  balanced: { semantic: 0.3, math: 0.5, source: 0.2 },
  default: DEFAULT_WEIGHTS,
};
const MODE_NOTES = {
  pca: 'The three leading kernel principal components are projection axes ordered by variance.',
  force: 'A deterministic seeded start relaxed by springs and repulsion.',
  hybrid:
    'Kernel PCA initializes the coordinates. Springs and repulsion refine the map inside the ball.',
};

const swatch = (color) =>
  `<i class="cs-swatch" style="background:${color}" aria-hidden="true"></i>`;
const depthColor = (t) => `rgb(${Math.round(75 + 121 * t)}, ${Math.round(123 + 92 * t)}, 248)`;

async function main() {
  const status = $('cs-status');
  status.textContent = 'Loading curriculum…';
  let data;
  let model;
  try {
    const response = await fetch('../data/concepts.public.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    if (
      data.visibility !== 'public_curriculum_only' ||
      data.export_id !== 'concept-space:unified'
    ) {
      throw new Error('Expected the public curriculum export');
    }
    model = decode(data);
  } catch (error) {
    status.textContent = `Could not load the concept graph (${error.message}).`;
    return;
  }
  const index = curriculumIndex(data, model);
  const params = new URLSearchParams(location.search);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {
    mode: MODES.includes(params.get('mode')) ? params.get('mode') : 'hybrid',
    geometry: 'volume',
    shells: false,
    weights: { ...DEFAULT_WEIGHTS },
    colorBy: 'course',
    kinds: new Set(Object.keys(data.vocabulary.concept_kinds)),
    relationTypes: Object.fromEntries(Object.keys(model.types).map((type) => [type, true])),
    course: 'all',
    cutoff: localDate(),
    scheduledOnly: false,
    showBridges: true,
    showUnsourced: true,
    selected: -1,
    layout: null,
    overlay: null,
    concepts: model.concepts,
    endpoints: model.relations.map(({ source, target }) => [
      model.index.get(source),
      model.index.get(target),
    ]),
  };
  const maxDepth = Math.max(1, ...model.concepts.map((c) => c.depth));
  const home = (i) => model.concepts[i].home_course;
  const courseColor = (i) => COURSE_DISPLAY[home(i)].color;
  const relationShown = (k) => {
    const r = model.relations[k];
    return (
      state.relationTypes[r.type] &&
      (state.showUnsourced || isSourced(r)) &&
      (state.showBridges || !index.bridges.has(k))
    );
  };
  const visibility = () => mapVisibility(index, state, relationShown);

  $('cs-lede').textContent =
    `${model.n} concepts across four courses · ${model.relations.length} mathematical links. Explore the map and plan your next study session.`;

  const callbacks = {
    stage: $('cs-stage'),
    canvas: $('cs-canvas'),
    labels: $('cs-labels'),
    gizmo: $('cs-gizmo'),
    model,
    bridges: index.bridges,
    reducedMotion,
    onSelect: (i) => select(i),
    onHover: () => {},
  };
  let view;
  let flat = false;
  let loading = true;
  function announceView() {
    status.textContent = loading
      ? 'Computing layout…'
      : flat
        ? '2D view · WebGL unavailable. Search and List remain available.'
        : '';
    status.classList.toggle('is-note', !loading && flat);
  }
  function useFallback() {
    view?.dispose?.();
    callbacks.labels.replaceChildren();
    callbacks.gizmo.hidden = true;
    flat = true;
    view = createFallback(callbacks);
    if (state.layout) view.setLayout(state.layout.points, { animate: false });
    refreshMap();
    if (state.selected >= 0) {
      view.setInset?.({ width: detail.offsetWidth + 14, height: detail.offsetHeight });
      view.focusOn(state.selected);
    }
    announceView();
  }

  if (webglAvailable()) {
    try {
      view = createScene(callbacks);
      callbacks.canvas.addEventListener('webglcontextlost', useFallback, { once: true });
    } catch {
      useFallback();
    }
  } else useFallback();

  const weights = $('cs-weights');
  weights.innerHTML = CHANNELS.map(
    (channel) =>
      `<label class="cs-weight" for="w-${channel}"><span>${CHANNEL_LABELS[channel]}</span>
      <input id="w-${channel}" type="range" min="0" max="100" step="1" data-channel="${channel}" />
      <output id="o-${channel}"></output></label>`,
  ).join('');
  const kinds = $('cs-kinds');
  kinds.insertAdjacentHTML(
    'beforeend',
    [...state.kinds]
      .map(
        (kind) =>
          `<label><input type="checkbox" checked value="${kind}" />${humanize(kind)}</label>`,
      )
      .join(''),
  );
  const relations = $('cs-relations');
  relations.insertAdjacentHTML(
    'beforeend',
    Object.entries(model.types)
      .map(
        ([type, spec]) =>
          `<label title="${escapeHtml(spec.meaning)}"><input type="checkbox" checked value="${type}" />${swatch(RELATION_STYLE[type].color)}${RELATION_STYLE[type].label}</label>`,
      )
      .join(''),
  );
  const courses = $('cs-courses');
  courses.insertAdjacentHTML(
    'beforeend',
    ['all', ...data.courses.map(({ id }) => id)]
      .map(
        (id) =>
          `<label title="${id === 'all' ? 'All four courses' : escapeHtml(data.courses.find((c) => c.id === id).title)}">
      <input type="radio" name="course" value="${id}" ${id === 'all' ? 'checked' : ''} />
      <span>${id === 'all' ? 'All courses' : courseTag(id)}</span></label>`,
      )
      .join(''),
  );

  function syncControls() {
    const shares = normalizeWeights(state.weights);
    for (const name of CHANNELS) {
      $(`w-${name}`).value = String(Math.round(state.weights[name] * 100));
      $(`o-${name}`).textContent = `${Math.round(shares[name] * 100)}%`;
    }
    for (const id of ['cs-mode', 'cs-geometry']) {
      const key = id.slice(3);
      for (const button of $(id).querySelectorAll('button')) {
        button.setAttribute('aria-checked', String(button.dataset[key] === state[key]));
      }
    }
    $('cs-shells').checked = state.shells;
    $('cs-shells').disabled = state.geometry === 'surface' || state.mode === 'pca';
    $('cs-mode-note').textContent = MODE_NOTES[state.mode];
    $('cs-shape-note').textContent =
      shares.math === 1
        ? 'Mathematical structure shapes the map. Dates and source proximity are available as lenses.'
        : 'This diagnostic mixes the selected similarity channels.';
    $('cs-color').value = state.colorBy;
    $('cs-cutoff').value = state.cutoff;
    $('cs-scheduled').checked = state.scheduledOnly;
    $('cs-bridges').checked = state.showBridges;
    courses.querySelector(`[value="${state.course}"]`).checked = true;
  }

  function firstDate(i) {
    return index.occurrences[i]
      .filter((o) => state.course === 'all' || o.course === state.course)
      .map((o) => o.firstScheduled)
      .filter(Boolean)
      .sort()[0];
  }

  const scheduleColors = { begun: '#79d5b4', upcoming: '#f4b480', undated: '#a6aab7' };
  function colors() {
    return model.concepts.map((_, i) => {
      if (state.colorBy === 'depth') return depthColor(model.concepts[i].depth / maxDepth);
      if (state.colorBy === 'schedule') {
        const date = firstDate(i);
        return scheduleColors[date ? (date <= state.cutoff ? 'begun' : 'upcoming') : 'undated'];
      }
      if (state.colorBy === 'evidence' && state.overlay) {
        return EVIDENCE_STATES[evidenceState(state.overlay.entry(i, state.course))].color;
      }
      return courseColor(i);
    });
  }

  function renderLegend() {
    let items;
    if (state.colorBy === 'schedule') {
      items = Object.entries({
        begun: 'Scheduled by date',
        upcoming: 'Scheduled later',
        undated: 'No dated syllabus anchor',
      }).map(([key, label]) => `<span>${swatch(scheduleColors[key])}${label}</span>`);
    } else if (state.colorBy === 'depth') {
      items = [0, maxDepth].map(
        (level) => `<span>${swatch(depthColor(level / maxDepth))}Dependency depth ${level}</span>`,
      );
    } else if (state.colorBy === 'evidence' && state.overlay) {
      items = Object.keys(EVIDENCE_STATES).map(evidenceTag);
    } else {
      items = data.courses.map(({ id }) => courseTag(id));
      items.push('<small>Colour follows each concept’s home course.</small>');
    }
    if (state.showBridges)
      items.push('<span><i class="cs-bridge-line"></i>Cross-course link</span>');
    $('cs-legend').innerHTML = items.join('');
  }

  function refreshMap() {
    const { primary, context, visible } = visibility();
    const mask = state.endpoints.map(
      ([a, b], k) =>
        relationShown(k) &&
        visible[a] &&
        visible[b] &&
        (state.selected < 0
          ? (primary[a] && primary[b]) || index.bridges.has(k)
          : a === state.selected || b === state.selected),
    );
    view.setColors(colors());
    view.setVisibility(state.layout ? visible : visible.map(() => false));
    view.setRelationMask(state.layout ? mask : mask.map(() => false));
    view.setSelection(state.selected, {
      relations:
        index.neighbours[state.selected]
          ?.filter(({ relation }) => mask[relation])
          .map(({ relation }) => relation) ?? [],
    });
    view.setRings(
      state.overlay && state.colorBy === 'evidence'
        ? model.concepts.map((_, i) =>
            evidenceState(state.overlay.entry(i, state.course)) === 'retention_verified'
              ? { color: EVIDENCE_STATES.retention_verified.color }
              : null,
          )
        : null,
    );

    const byDegree = (a, b) => index.neighbours[b].length - index.neighbours[a].length || a - b;
    const perCourse = innerWidth < 600 ? 2 : 4;
    const ranks = [...model.concepts.keys()].filter((i) => visible[i]).sort(byDegree);
    const landmarks =
      state.course === 'all'
        ? data.courses.flatMap(({ id }) => ranks.filter((i) => home(i) === id).slice(0, perCourse))
        : [
            ...ranks.filter((i) => primary[i]).slice(0, perCourse * 2),
            ...ranks.filter((i) => context[i]).slice(0, perCourse),
          ];
    view.setLandmarks(landmarks);
    const bridges = [...index.bridges].filter((k) => mask[k]).length;
    const n = visible.filter(Boolean).length;
    const contextCount = context.filter((yes, i) => yes && visible[i]).length;
    $('cs-map-note').textContent = state.layout
      ? n === 0
        ? 'No concepts match the current filters.'
        : `${state.selected >= 0 ? 'Local view' : state.course === 'all' ? 'Four-course map' : courseCode(state.course)} · ${n} ${n === 1 ? 'concept' : 'concepts'}${bridges ? ` · ${bridges} cross-course ${bridges === 1 ? 'link' : 'links'}` : ''}${contextCount ? ` · ${contextCount} from other courses` : ''}`
      : '';
  }

  function refreshStudy() {
    renderLegend();
    renderTimeline({ target: $('cs-timeline'), data, index, ...state });
    renderPractice({ target: $('cs-queue'), index, state, data, conceptButton });
    $('cs-schedule-note').textContent = state.scheduledOnly
      ? 'The map shows concepts with dated syllabus anchors at or before the cutoff, plus cross-course context.'
      : `Schedule snapshot ${data.as_of}. Blocks count on their first scheduled date.`;
  }

  let layoutTimer;
  let request = 0;
  let worker;
  try {
    worker = new Worker(new URL('./layout-worker.js', import.meta.url), { type: 'module' });
    worker.postMessage({ graph: data });
    worker.onmessage = ({ data: result }) => acceptLayout(result);
    worker.onerror = () => {
      worker.terminate();
      worker = null;
      relayout();
    };
  } catch {
    worker = null;
  }

  function acceptLayout(result) {
    if (result.request !== request) return;
    loading = false;
    if (result.error) {
      status.textContent = `Could not compute the map (${result.error}).`;
      return;
    }
    const { layout, diagnostics, layoutMs } = result;
    view.setLayout(layout.points, { animate: Boolean(state.layout) && !reducedMotion });
    state.layout = layout;
    state.layoutMs = layoutMs;
    view.setGeometry(state);
    refreshMap();
    announceView();
    renderDiagnostics(diagnostics);
    if (state.selected >= 0) view.focusOn(state.selected);
  }

  function relayout({ delay = 0, warm = false, canonical = false } = {}) {
    clearTimeout(layoutTimer);
    const id = ++request;
    loading = true;
    announceView();
    layoutTimer = setTimeout(() => {
      const { mode, weights, geometry, shells } = state;
      const options = {
        mode,
        weights,
        geometry,
        shells,
        warm,
        previous: canonical ? undefined : state.layout?.points,
      };
      if (worker) {
        worker.postMessage({ request: id, options });
      } else {
        try {
          const started = performance.now();
          const layout = computeLayout(model, options);
          const layoutMs = performance.now() - started;
          acceptLayout({
            request: id,
            layout,
            layoutMs,
            diagnostics: diagnose(model, layout, data.review_pairs),
          });
        } catch (error) {
          acceptLayout({ request: id, error: error.message });
        }
      }
    }, delay);
  }

  function renderDiagnostics(result) {
    const bars = CHANNELS.map((name) => {
      const value = result.channel[name].overlap;
      return `<div class="cs-bar"><span>${CHANNEL_LABELS[name]}</span><b style="--v:${value}"></b><em>${value.toFixed(2)}</em></div>`;
    }).join('');
    const passed = result.reviews.filter((r) => r.ok).length;
    const variance = result.explained.reduce((a, b) => a + b, 0);
    $('cs-diagnostic').innerHTML = `<p>8-neighbour overlap (Jaccard)</p>${bars}
      ${state.mode === 'pca' ? `<p>These components keep ${Math.round(variance * 100)}% of kernel variance.</p>` : ''}
      <p>${passed}/${result.reviews.length} review pairs placed as expected.
        <a href="https://github.com/josephbaileyy/josephbaileyy.github.io/blob/main/docs/CONCEPT_SPACE.md">Evaluation</a></p>`;
    $('cs-axes').textContent = state.mode === 'pca' ? 'PC 1–3 · projection axes' : '';
  }

  const detail = $('cs-detail');
  const list = $('cs-list');
  const search = $('cs-search');
  const results = $('cs-results');
  let returnFocus = null;
  function conceptButton(i, showCourse = false) {
    return `<button type="button" class="cs-link" data-select="${i}">${swatch(courseColor(i))}${escapeHtml(model.concepts[i].name)}${showCourse ? ` <small>${courseCode(home(i))}</small>` : ''}</button>`;
  }

  function renderDetail() {
    detail.innerHTML = renderInspector({
      data,
      model,
      index,
      selected: state.selected,
      course: state.course,
      entry: state.overlay?.entry(state.selected, state.course),
      conceptButton,
      relationShown,
    });
  }

  function select(i, { focus = true } = {}) {
    if (state.selected < 0 && i >= 0) returnFocus = document.activeElement;
    state.selected = i;
    detail.hidden = i < 0;
    refreshMap();
    const url = new URL(location.href);
    if (i < 0) {
      url.searchParams.delete('c');
      view.setInset?.(null);
      view.resetCamera();
      if (focus && returnFocus) {
        const target = list.contains(returnFocus)
          ? $('cs-list-toggle')
          : returnFocus.isConnected
            ? returnFocus
            : search;
        target.focus({ preventScroll: true });
      }
      returnFocus = null;
    } else {
      setList(false);
      renderDetail();
      detail.scrollTop = 0;
      view.setInset?.({ width: detail.offsetWidth + 14, height: detail.offsetHeight });
      if (state.layout) view.focusOn(i);
      url.searchParams.set('c', model.concepts[i].id.slice('concept:'.length));
      if (focus) detail.querySelector('h2').focus({ preventScroll: true });
    }
    history.replaceState(null, '', url);
  }

  function renderList() {
    const { primary, context } = visibility();
    const groups = data.courses
      .map(({ id }) => {
        const members = [...model.concepts.keys()]
          .filter(
            (i) => primary[i] && (state.course === 'all' ? home(i) === id : state.course === id),
          )
          .sort((a, b) => model.concepts[a].name.localeCompare(model.concepts[b].name));
        return members.length
          ? `<section><h3>${courseTag(id)}</h3><ul>${members.map((i) => `<li>${conceptButton(i)}</li>`).join('')}</ul></section>`
          : '';
      })
      .join('');
    const extra = context.flatMap((show, i) =>
      show ? [`<li>${conceptButton(i, true)}</li>`] : [],
    );
    list.innerHTML = `<h2 tabindex="-1">Concept list</h2>${groups || '<p>No concepts match the filters.</p>'}
      ${extra.length ? `<section><h3>Cross-course context</h3><ul>${extra.join('')}</ul></section>` : ''}`;
  }

  function setList(open, focus = false) {
    list.hidden = !open;
    $('cs-list-toggle').setAttribute('aria-pressed', String(open));
    if (open) {
      renderList();
      if (focus) list.querySelector('h2').focus({ preventScroll: true });
    }
  }

  const searchable = model.concepts.map((c) =>
    [
      c.name,
      ...c.aliases,
      ...c.courses.map(courseCode),
      c.kind,
      c.courses.includes('stats310a') ? 'MATH 230A' : '',
    ]
      .join(' ')
      .toLowerCase(),
  );
  let active = 0;
  function closeSearch() {
    results.hidden = true;
    search.setAttribute('aria-expanded', 'false');
    search.removeAttribute('aria-activedescendant');
  }
  function activateOption(options) {
    options.forEach((option, k) => option.setAttribute('aria-selected', String(k === active)));
    if (options[active]) search.setAttribute('aria-activedescendant', options[active].id);
    else search.removeAttribute('aria-activedescendant');
  }
  function runSearch() {
    const query = search.value.trim().toLowerCase();
    if (!query) return closeSearch();
    const terms = query.split(/\s+/);
    const hits = searchable
      .flatMap((text, i) => (terms.every((t) => text.includes(t)) ? [i] : []))
      .sort(
        (a, b) =>
          Number(model.concepts[b].name.toLowerCase().startsWith(query)) -
            Number(model.concepts[a].name.toLowerCase().startsWith(query)) ||
          index.neighbours[b].length - index.neighbours[a].length,
      )
      .slice(0, 8);
    active = 0;
    results.innerHTML = hits.length
      ? hits
          .map(
            (i, k) => `<li role="option" id="cs-opt-${k}" data-select="${i}">
          ${swatch(courseColor(i))}<span>${escapeHtml(model.concepts[i].name)}</span><small>${courseCode(home(i))}</small></li>`,
          )
          .join('')
      : '<li class="cs-empty" role="option" aria-disabled="true">No concept matches.</li>';
    results.hidden = false;
    search.setAttribute('aria-expanded', 'true');
    activateOption(results.querySelectorAll('[data-select]'));
  }
  function chooseSearch(i) {
    search.value = '';
    closeSearch();
    if (!visibility().primary[i]) {
      state.course = model.concepts[i].courses.includes(state.course) ? state.course : 'all';
      state.scheduledOnly = false;
      const kind = model.concepts[i].kind;
      state.kinds.add(kind);
      kinds.querySelector(`[value="${kind}"]`).checked = true;
      syncControls();
      refreshStudy();
    }
    select(i);
  }

  search.addEventListener('input', runSearch);
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') return closeSearch();
    if (results.hidden && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      runSearch();
      if (!results.hidden) event.preventDefault();
      return;
    }
    const options = [...results.querySelectorAll('[data-select]')];
    if (results.hidden || !options.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      activateOption(options);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      chooseSearch(Number(options[active].dataset.select));
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.target.closest('input, select, textarea, [contenteditable]')) {
      event.preventDefault();
      search.focus();
    } else if (event.key === 'Escape' && document.activeElement !== search) {
      if (!list.hidden) {
        setList(false);
        $('cs-list-toggle').focus();
      } else if (state.selected >= 0) select(-1);
    }
  });
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-select]');
    if (target && !target.closest('svg')) {
      const i = Number(target.dataset.select);
      if (results.contains(target)) chooseSearch(i);
      else {
        if (!visibility().visible[i] && !visibility().primary[i] && !detail.contains(target)) {
          chooseSearch(i);
        } else select(i);
        if (target.closest('#cs-queue')) $('cs-stage').scrollIntoView({ block: 'nearest' });
      }
      return;
    }
    if (!$('cs-search-wrap').contains(event.target)) closeSearch();
    if (event.target.closest('#cs-close')) select(-1);
  });
  search.addEventListener('blur', (event) => {
    if (event.relatedTarget) closeSearch();
  });

  function applyFilters() {
    refreshMap();
    refreshStudy();
    if (state.selected >= 0) renderDetail();
    if (!list.hidden) renderList();
  }

  courses.addEventListener('change', ({ target }) => {
    state.course = target.value;
    if (state.selected >= 0 && !visibility().primary[state.selected]) select(-1, { focus: false });
    applyFilters();
  });
  $('cs-cutoff').addEventListener('change', ({ target }) => {
    state.cutoff = target.value || localDate();
    syncControls();
    applyFilters();
  });
  $('cs-scheduled').addEventListener('change', ({ target }) => {
    state.scheduledOnly = target.checked;
    applyFilters();
  });
  $('cs-bridges').addEventListener('change', ({ target }) => {
    state.showBridges = target.checked;
    applyFilters();
  });
  $('cs-color').addEventListener('change', ({ target }) => {
    state.colorBy = target.value;
    refreshMap();
    renderLegend();
  });
  kinds.addEventListener('change', ({ target }) => {
    if (target.checked) state.kinds.add(target.value);
    else state.kinds.delete(target.value);
    applyFilters();
  });
  relations.addEventListener('change', ({ target }) => {
    state.relationTypes[target.value] = target.checked;
    applyFilters();
  });
  $('cs-unsourced').addEventListener('change', ({ target }) => {
    state.showUnsourced = target.checked;
    applyFilters();
  });
  weights.addEventListener('input', ({ target }) => {
    if (!target.dataset.channel) return;
    state.weights[target.dataset.channel] = Number(target.value) / 100;
    syncControls();
    relayout({ delay: 180, warm: true });
  });
  $('cs-presets').addEventListener('click', (event) => {
    const preset = event.target.closest('[data-preset]')?.dataset.preset;
    if (!preset) return;
    state.weights = { ...PRESETS[preset] };
    syncControls();
    relayout();
  });
  for (const key of ['mode', 'geometry']) {
    const group = $(`cs-${key}`);
    const buttons = [...group.querySelectorAll('button')];
    group.addEventListener('click', (event) => {
      const value = event.target.closest('button')?.dataset[key];
      if (!value || value === state[key]) return;
      state[key] = value;
      if (state.geometry === 'surface' || state.mode === 'pca') state.shells = false;
      syncControls();
      relayout();
    });
    group.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const next =
        buttons[
          (buttons.indexOf(event.target) +
            (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) +
            buttons.length) %
            buttons.length
        ];
      next.focus();
      next.click();
    });
  }
  $('cs-shells').addEventListener('change', ({ target }) => {
    state.shells = target.checked;
    relayout();
  });
  $('cs-reset-layout').addEventListener('click', () => {
    Object.assign(state, {
      mode: 'hybrid',
      geometry: 'volume',
      shells: false,
      weights: { ...DEFAULT_WEIGHTS },
    });
    syncControls();
    relayout({ canonical: true });
    view.resetCamera();
  });
  $('cs-global').addEventListener('click', () => {
    setList(false);
    select(-1, { focus: false });
  });
  $('cs-list-toggle').addEventListener('click', () => {
    const open = list.hidden;
    if (open && state.selected >= 0) select(-1, { focus: false });
    setList(open, true);
  });
  $('cs-reset-camera').addEventListener('click', () => {
    if (state.selected >= 0) view.focusOn(state.selected);
    else view.resetCamera();
  });

  let overlayRequest = 0;
  $('cs-overlay').addEventListener('change', async ({ target }) => {
    const file = target.files?.[0];
    target.value = '';
    if (!file) return;
    const id = ++overlayRequest;
    try {
      const overlay = readOverlay(JSON.parse(await file.text()), data);
      if (id !== overlayRequest) return;
      state.overlay = {
        legacy: overlay.legacy,
        entry(i, course) {
          const concept = overlay.concepts[model.concepts[i].id];
          return course === 'all'
            ? concept
            : (concept.byCourse[course] ?? concept.byCourse[home(i)]);
        },
      };
    } catch (error) {
      if (id === overlayRequest) status.textContent = `Overlay not loaded. ${error.message}`;
      return;
    }
    state.colorBy = 'evidence';
    $('cs-color').querySelector('[value="evidence"]').disabled = false;
    $('cs-clear-overlay').hidden = false;
    $('cs-source').dataset.private = '';
    $('cs-source').lastChild.textContent = overlayLabel();
    announceView();
    syncControls();
    applyFilters();
  });
  function overlayLabel() {
    return state.overlay.legacy ? ' Local overlay · STATS 310A' : ' Local private overlay';
  }
  $('cs-clear-overlay').addEventListener('click', () => {
    overlayRequest++;
    state.overlay = null;
    if (state.colorBy === 'evidence') state.colorBy = 'course';
    $('cs-color').querySelector('[value="evidence"]').disabled = true;
    $('cs-clear-overlay').hidden = true;
    delete $('cs-source').dataset.private;
    $('cs-source').lastChild.textContent = ' Public curriculum';
    announceView();
    syncControls();
    applyFilters();
  });

  syncControls();
  applyFilters();
  relayout();
  const initial = model.index.get(`concept:${params.get('c')}`);
  if (initial !== undefined) select(initial, { focus: false });

  // Browser tests read timing and layout diagnostics without exposing overlay state.
  window.__conceptSpace = {
    get layout() {
      return state.layout;
    },
    get layoutMs() {
      return state.layoutMs;
    },
  };
}

main();
