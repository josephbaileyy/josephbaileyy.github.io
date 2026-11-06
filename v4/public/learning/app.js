import { createGraph, makeLayout } from './graph.js';
import { escapeHtml, formatLabel, plainLabel } from './labels.js';
import { defaultWeights } from './projection.js';

const $ = (id) => document.getElementById(id);

const courses = {
  stats310a: {
    name: 'Probability',
    short: 'Probability',
    code: 'STATS 310A / MATH 230A',
    color: '#96aaff',
  },
  math116: {
    name: 'Complex analysis',
    short: 'Complex analysis',
    code: 'MATH 116',
    color: '#78d5ba',
  },
  math120: { name: 'Algebra', short: 'Algebra', code: 'MATH 120', color: '#f5bb87' },
  physics330: { name: 'Quantum field theory', short: 'QFT', code: 'PHYSICS 330', color: '#c9a7ed' },
};
const kinds = { lecture: 'Lecture', note: 'Note', dembo: 'Reading', assessed: 'Assessed skill' };
const relationNames = {
  contains: ['Contains', 'Part of'],
  next_in_notes: ['Next in notes', 'Previous in notes'],
  proposed_supports: ['May help with', 'Suggested prerequisite'],
  mapped_to_dembo_proposed: ['Suggested reading', 'Suggested related note'],
};
const courseInfo = (id) =>
  Object.hasOwn(courses, id) ? courses[id] : { name: id, short: id, code: id, color: '#b5bdce' };
const kindName = (kind) => (Object.hasOwn(kinds, kind) ? kinds[kind] : kind);
const humanize = (value) => String(value).replaceAll('_', ' ');
const state = {
  course: 'all',
  kind: 'all',
  selected: null,
  focused: false,
  weights: defaultWeights,
  sharedProjection: false,
};
const search = $('search');
const searchResults = $('search-results');
const details = $('node-details');
const canvas = $('graph');
const narrowScreen = matchMedia('(max-width: 690px)');
const touchScreen = matchMedia('(pointer: coarse)');
const graph = createGraph(canvas, courseInfo, (id) => select(id, narrowScreen.matches), setCourse);
let publicData;
$('graph-status').textContent = 'Loading curriculum…';

function assertPayload(data) {
  if (
    data?.schema_version !== 1 ||
    !['public_curriculum_only', 'private_learning_evidence'].includes(data.visibility) ||
    !Array.isArray(data.nodes) ||
    !data.nodes.length ||
    !Array.isArray(data.edges) ||
    !data.course_summaries
  )
    throw Error('Choose a valid Learning Atlas export.');
  const text = (value) => typeof value === 'string' && value.length > 0;
  if (
    data.nodes.some(
      (node) =>
        !node ||
        !text(node.id) ||
        !text(node.kind) ||
        !text(node.course) ||
        typeof node.label !== 'string',
    )
  ) {
    throw Error('A topic is missing its identifier, course, type, or label.');
  }
  const ids = new Set(data.nodes.map((node) => node.id));
  if (ids.size !== data.nodes.length) throw Error('The export contains duplicate topic IDs.');
  if (
    data.edges.some(
      (edge) => !edge || !text(edge.kind) || !ids.has(edge.source) || !ids.has(edge.target),
    )
  ) {
    throw Error('A link is missing its type or points to a missing topic.');
  }
  return data;
}

function setData(data) {
  assertPayload(data);
  const byId = new Map(data.nodes.map((node) => [node.id, node]));
  const neighbors = new Map(data.nodes.map((node) => [node.id, new Map()]));
  for (const edge of data.edges) {
    neighbors.get(edge.source).set(edge.target, { kind: edge.kind, direction: 0 });
    neighbors.get(edge.target).set(edge.source, { kind: edge.kind, direction: 1 });
  }
  const layout = makeLayout(data.nodes, data.edges);
  Object.assign(state, {
    data,
    byId,
    neighbors,
    layout,
    course: 'all',
    kind: 'all',
    selected: null,
    focused: false,
  });

  const isPrivate = data.visibility === 'private_learning_evidence';
  const source = $('source-tag');
  source.toggleAttribute('data-private', isPrivate);
  source.lastChild.textContent = isPrivate ? ' Local private export' : ' Public curriculum';
  $('restore-public').hidden = !publicData || data === publicData;
  $('node-type').replaceChildren(
    new Option('All topics', 'all'),
    ...[...new Set(data.nodes.map((node) => node.kind))].map(
      (kind) => new Option(kindName(kind), kind),
    ),
  );

  const ids = [...new Set(data.nodes.map((node) => node.course))];
  $('courses').innerHTML = [
    '<button type="button" data-course="all">All courses</button>',
    ...ids.map((id) => {
      const course = courseInfo(id);
      return `<button type="button" data-course="${escapeHtml(id)}" title="${escapeHtml(course.code)}">${dot(course.color)}${escapeHtml(course.name)}</button>`;
    }),
  ].join('');
  $('snapshot').textContent = data.as_of ? `Source snapshot · ${data.as_of}` : '';
  search.value = '';
  closeSearch();
  refresh(true);
}

function dot(color) {
  return `<i class="course-dot" style="--course-color:${color}" aria-hidden="true"></i>`;
}

function filteredNodes() {
  return state.data.nodes.filter(
    (node) =>
      (state.course === 'all' || node.course === state.course) &&
      (state.kind === 'all' || node.kind === state.kind),
  );
}

function refresh(resetCamera = false) {
  if (!state.data) return;
  const selected = state.byId.get(state.selected);
  const related = state.neighbors.get(state.selected);
  const nodes = state.focused
    ? state.data.nodes.filter((node) => node === selected || related.has(node.id))
    : filteredNodes();
  const visible = new Set(nodes.map((node) => node.id));
  const edges = state.data.edges.filter(
    (edge) => visible.has(edge.source) && visible.has(edge.target),
  );
  graph.update({ ...state, nodes, edges }, resetCamera);
  for (const button of $('courses').querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.course === state.course));
  }
  $('graph-count').textContent =
    `${nodes.length} ${nodes.length === 1 ? 'topic' : 'topics'} · ${edges.length} ${edges.length === 1 ? 'link' : 'links'}`;
  $('lecture-key').hidden = !nodes.some((node) => node.kind === 'lecture');
  $('note-key').hidden = !nodes.some((node) => node.kind === 'note');
  $('reading-key').hidden = !nodes.some((node) => node.kind === 'dembo');
  $('evidence-key').hidden = !nodes.some((node) => node.kind === 'assessed');
  $('suggested-key').hidden = !edges.some((edge) => edge.kind.includes('proposed'));
  $('graph-status').hidden = Boolean(nodes.length);
  $('graph-status').textContent = 'No topics match this filter.';
  renderDetails(selected);
  renderSummary();
  renderQueue();
  if (!searchResults.hidden) renderSearch();
}

function setCourse(id) {
  if (id === state.course && !state.focused) return;
  Object.assign(state, { course: id, selected: null, focused: false });
  search.value = '';
  closeSearch();
  refresh(true);
}

function select(id, focusDetails = false) {
  const node = state.byId?.get(id);
  if (!node) return;
  const changeCourse = state.course !== 'all' && node.course !== state.course;
  if (changeCourse) state.course = node.course;
  if (state.kind !== 'all' && node.kind !== state.kind) {
    state.kind = 'all';
    $('node-type').value = 'all';
  }
  state.selected = id;
  refresh(changeCourse || state.focused);
  if (focusDetails) $('selected-title').focus();
}

function topicButton(node, meta) {
  return `<button class="topic-button" type="button" data-topic="${escapeHtml(node.id)}">
    ${dot(node.kind === 'assessed' ? '#ffd388' : courseInfo(node.course).color)}
    <span>${formatLabel(node.label || node.id)}<small>${escapeHtml(meta)}</small></span></button>`;
}

const searchable = (value) =>
  plainLabel(value).normalize('NFKD').replace(/\p{M}/gu, '').replace(/[–—−]/g, '-').toLowerCase();

function renderSearch() {
  if (!state.data) return;
  const term = searchable(search.value.trim());
  const scope = filteredNodes();
  const matches = term
    ? scope.filter((node) => searchable(node.label || node.id).includes(term))
    : scope;
  searchResults.innerHTML = matches.length
    ? matches
        .map((node) =>
          topicButton(node, `${courseInfo(node.course).name} · ${kindName(node.kind)}`),
        )
        .join('')
    : '<p>No matching topics in this view.</p>';
  searchResults.hidden = false;
  searchResults.scrollTop = 0;
}

function closeSearch() {
  searchResults.hidden = true;
}

function chooseSearch(id) {
  closeSearch();
  search.value = '';
  select(id, true);
}

function safeReaderUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://josephrbailey.com' && url.pathname.startsWith('/probability/')
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function renderDetails(node) {
  $('inspector').hidden = !node;
  if (!node) {
    details.innerHTML = '';
    return;
  }
  const course = courseInfo(node.course);
  const connected = [...state.neighbors.get(node.id)].map(([id, kind]) => [
    state.byId.get(id),
    kind,
  ]);
  const reader = safeReaderUrl(node.reader_url);
  const meta = [
    ['Section', node.section],
    ['Lecture', node.lecture],
    ['First scheduled', node.scheduled_introduction],
    ['Schedule', node.schedule_status && humanize(node.schedule_status)],
  ];
  let probe = '';
  if (node.kind === 'assessed' && state.data.visibility === 'private_learning_evidence') {
    meta.push([
      'Evidence status',
      node.assessment_status ? humanize(node.assessment_status) : 'Unknown',
    ]);
    const qualifier = node.assessment_status === 'independently_confirmed' ? '' : ' (provisional)';
    for (const [key, value] of Object.entries(node.scores ?? {})) {
      meta.push([humanize(key), value == null ? 'Untested' : `${value}/4${qualifier}`]);
    }
    if (Array.isArray(node.evidence_refs))
      meta.push(['Evidence records', node.evidence_refs.length]);
    if (node.next_probe) {
      probe = `<section class="detail-section"><h3>Independent next probe</h3><p>${formatLabel(node.next_probe)}</p>
        <button class="probe-button" id="copy-probe" type="button">Copy diagnostic prompt</button></section>`;
    }
  }

  const rows = meta
    .filter(([, value]) => value != null && value !== false && value !== '')
    .map(
      ([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
    )
    .join('');
  const links = connected
    .map(([other, { kind, direction }]) => {
      const label = Object.hasOwn(relationNames, kind)
        ? relationNames[kind][direction]
        : humanize(kind);
      return topicButton(other, `${kindName(other.kind)} · ${label}`);
    })
    .join('');
  details.innerHTML = `<div class="detail-type">${dot(course.color)}${escapeHtml(course.name)} · ${escapeHtml(kindName(node.kind))}</div>
    <h2 tabindex="-1" id="selected-title">${formatLabel(node.label || node.id)}</h2>
    <div class="detail-actions">
      ${reader ? `<a href="${escapeHtml(reader)}" target="_blank" rel="noopener noreferrer">Open probability companion ↗</a>` : ''}
      ${connected.length ? `<button id="focus-topic" type="button">${state.focused ? 'Show full map' : 'Focus connections'}</button>` : ''}
    </div>
    ${rows ? `<dl class="detail-meta">${rows}</dl>` : ''}
    ${probe}
    ${links ? `<section class="detail-section"><h3>Connections (${connected.length})</h3>${links}</section>` : ''}`;
  $('inspector').scrollTop = 0;
  $('focus-topic')?.addEventListener('click', () => {
    state.focused = !state.focused;
    refresh(true);
    $('focus-topic')?.focus({ preventScroll: true });
    if (narrowScreen.matches) $('stage').scrollIntoView({ block: 'nearest' });
  });
  $('copy-probe')?.addEventListener('click', (event) => copyPrompt(node, event.currentTarget));
}

function renderSummary() {
  const summary = $('course-summary');
  const entries = Object.entries(state.data.course_summaries).filter(
    ([id, item]) => item && (state.course === 'all' || state.course === id),
  );
  summary.hidden = !entries.length;
  $('course-stats').innerHTML = entries
    .map(([id, item]) => {
      const rows = [
        ['Lecture blocks', item.lecture_blocks],
        ['Note headings', item.lecture_headings],
        [
          'Syllabus blocks past scheduled date',
          item.syllabus_blocks
            ? `${item.scheduled_past_blocks ?? '—'}/${item.syllabus_blocks}`
            : null,
        ],
        ['Assessed skills', item.assessed_topic_records],
        ['Independently confirmed', item.independently_confirmed_topic_records],
      ];
      return `<section class="course-stat"><h3>${escapeHtml(courseInfo(id).name)}</h3>
      <dl class="detail-meta">${rows
        .filter(([, value]) => value != null)
        .map(
          ([label, value]) =>
            `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
        )
        .join('')}</dl></section>`;
    })
    .join('');
}

function renderQueue() {
  const queue = $('study-queue');
  const items =
    state.data.visibility === 'private_learning_evidence' &&
    Array.isArray(state.data.diagnostic_queue)
      ? state.data.diagnostic_queue
          .filter(
            (item) =>
              item &&
              (state.course === 'all' || item.course === state.course) &&
              state.byId.has(item.node_id),
          )
          .slice(0, 5)
      : [];
  queue.hidden = !items.length;
  queue.innerHTML = items.length
    ? '<h3>Practice queue</h3>' +
      items
        .map((item) =>
          topicButton(
            state.byId.get(item.node_id),
            item.retention_untested ? 'Retention untested' : 'Check retention',
          ),
        )
        .join('')
    : '';
}

async function copyPrompt(node, button) {
  const prompt = `I am studying ${courseInfo(node.course).code}. Use the private ledger at https://github.com/josephbaileyy/academic-learning-ledger, AGENTS.md, protocols/tutoring.md, and the relevant evidence. Test me independently on ${node.label}. Proposed diagnostic: ${node.next_probe}. Give no hints until I attempt it. Track independent reasoning separately from your hints and record whether the solution was assisted.`;
  try {
    await navigator.clipboard.writeText(prompt);
    button.textContent = 'Copied prompt ✓';
  } catch {
    window.prompt('Copy this diagnostic prompt', prompt);
  }
}

function clearSelection() {
  const wasFocused = state.focused;
  Object.assign(state, { selected: null, focused: false });
  refresh(wasFocused);
  canvas.focus({ preventScroll: !narrowScreen.matches });
}

$('courses').addEventListener('click', (event) => {
  const button = event.target.closest('[data-course]');
  if (button) setCourse(button.dataset.course);
});
$('node-type').addEventListener('change', (event) => {
  state.kind = event.target.value;
  if (!filteredNodes().some((node) => node.id === state.selected)) state.selected = null;
  state.focused = false;
  refresh(true);
});
$('close-detail').addEventListener('click', clearSelection);
for (const element of [details, $('study-queue')]) {
  element.addEventListener('click', (event) => {
    const button = event.target.closest('[data-topic]');
    if (button) select(button.dataset.topic, true);
  });
}

search.addEventListener('focus', renderSearch);
search.addEventListener('click', () => {
  if (searchResults.hidden) renderSearch();
});
search.addEventListener('input', renderSearch);
$('search-wrap').addEventListener('focusout', (event) => {
  if (!$('search-wrap').contains(event.relatedTarget)) closeSearch();
});
$('search-wrap').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    search.focus();
    closeSearch();
    event.preventDefault();
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (searchResults.hidden) renderSearch();
    const buttons = [...searchResults.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? index + 1 : index < 0 ? buttons.length - 1 : index - 1;
    (index === 0 && next < 0 ? search : buttons[(next + buttons.length) % buttons.length])?.focus();
    event.preventDefault();
  } else if (event.key === 'Enter' && event.target === search && !searchResults.hidden) {
    const first = searchResults.querySelector('[data-topic]');
    if (first) chooseSearch(first.dataset.topic);
  }
});
searchResults.addEventListener('click', (event) => {
  const button = event.target.closest('[data-topic]');
  if (button) chooseSearch(button.dataset.topic);
});
document.addEventListener('keydown', (event) => {
  if (
    event.key === '/' &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.target.closest('input, select, textarea, [contenteditable]')
  ) {
    event.preventDefault();
    search.focus();
    renderSearch();
  } else if (event.key === 'Escape' && !event.defaultPrevented && state.selected) {
    clearSelection();
  }
});

function updateGestureHint() {
  const space = $('view-space').getAttribute('aria-pressed') === 'true';
  const drag = space ? 'Drag to orbit' : 'Drag to pan';
  const touch = touchScreen.matches || (narrowScreen.matches && navigator.maxTouchPoints > 0);
  const zoom = touch ? 'Pinch to zoom' : 'Scroll to zoom';
  $('gesture-hint').textContent = `${drag} · ${zoom}`;
}
touchScreen.addEventListener('change', updateGestureHint);
narrowScreen.addEventListener('change', updateGestureHint);
updateGestureHint();

const views = [
  ['view-map', 'map'],
  ['view-space', 'space'],
  ['view-outline', 'outline'],
];
for (const [id, projection] of views) {
  $(id).addEventListener('click', () => {
    if ($(id).getAttribute('aria-pressed') === 'true') return;
    for (const [other] of views) $(other).setAttribute('aria-pressed', String(id === other));
    $('stage').dataset.projection = projection;
    updateGestureHint();
    graph.setProjection(projection);
  });
}
for (const input of $('layout-weights').querySelectorAll('input')) {
  const key = input.dataset.weight;
  const output = input.parentElement.querySelector('output');
  input.value = output.value = state.weights[key];
  input.addEventListener('input', () => {
    output.value = input.value;
  });
  input.addEventListener('change', () => {
    const weights = { ...state.weights, [key]: Number(input.value) };
    if (!Object.values(weights).some(Boolean)) {
      weights[key] = 1;
      input.value = output.value = '1';
    }
    state.weights = weights;
    refresh(true);
  });
}
$('shared-projection').addEventListener('change', (event) => {
  state.sharedProjection = event.target.checked;
  refresh(true);
});
$('zoom-in').addEventListener('click', () => graph.zoom(1.25));
$('zoom-out').addEventListener('click', () => graph.zoom(0.8));
$('reset-view').addEventListener('click', graph.fit);

let importId = 0;
$('private-file').addEventListener('change', async (event) => {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  const request = ++importId;
  input.value = '';
  try {
    const data = JSON.parse(await file.text());
    if (request !== importId) return;
    setData(data);
    $('data-status').textContent = '';
  } catch (error) {
    if (request === importId)
      $('data-status').textContent = `Could not load export. ${error.message}`;
  }
});
$('restore-public').addEventListener('click', () => {
  importId++;
  setData(publicData);
  $('data-status').textContent = '';
  $('private-file').focus();
});

try {
  const response = await fetch('./data/atlas.public.json');
  if (!response.ok) throw Error('Curriculum unavailable.');
  publicData = assertPayload(await response.json());
  if (!state.data) setData(publicData);
  else $('restore-public').hidden = false;
} catch {
  if (!state.data)
    $('graph-status').textContent =
      'Curriculum unavailable. Try reloading or load an export below.';
}
