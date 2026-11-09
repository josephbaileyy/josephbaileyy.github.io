import { COURSE_DISPLAY } from './curriculum.js';
import { EVIDENCE_STATES, evidenceState } from './overlay.js';
import { RELATION_STYLE } from './scene.js';

export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch],
  );
export const humanize = (value) => value.replaceAll('_', ' ');
export const courseCode = (id) => COURSE_DISPLAY[id].code;
export const courseTag = (id) =>
  `<span class="cs-course-tag"><i class="cs-swatch" style="background:${COURSE_DISPLAY[id].color}"></i>${courseCode(id)}</span>`;
export const evidenceTag = (key) => {
  const state = EVIDENCE_STATES[key];
  return `<span class="cs-evidence-tag"><i class="cs-state" data-state="${key}" style="--c:${state.color}"></i>${state.label}</span>`;
};
const resultNames = {
  theo: 'Theorem',
  lemm: 'Lemma',
  prop: 'Proposition',
  coro: 'Corollary',
  defi: 'Definition',
  exer: 'Exercise',
  prob: 'Problem',
  eq: 'Equation',
  exam: 'Example',
  rema: 'Remark',
};
function locator(ref) {
  const [kind, number] = ref.replace(/^ch\d+:/, '').split(':');
  const chapter = /^(ch\d+):/.exec(ref)?.[1].slice(2);
  return number
    ? `${resultNames[kind] ?? kind} ${number}${chapter ? ` (ch. ${chapter})` : ''}`
    : `§${ref}`;
}

function anchorText(a, sources, units) {
  if (a.kind === 'lecture') {
    const lecture = /:lecture(\d+):/.exec(a.topic)?.[1];
    return `Lecture ${lecture} · ${escapeHtml(a.heading)}${a.lecture_date ? ` · ${escapeHtml(a.lecture_date)}` : ''}`;
  }
  if (a.kind === 'syllabus') return `Scope · ${escapeHtml(units.get(a.unit)?.focus)}`;
  if (a.kind === 'homework_problem' || a.kind === 'exercise') {
    return `${escapeHtml(a.assignment.toUpperCase())} · Problem ${escapeHtml(a.problem)}${a.parts?.length ? ` (${escapeHtml(a.parts.join(', '))})` : ''}`;
  }
  const source = sources[a.source];
  const ref = escapeHtml(locator(a.ref));
  const location = a.reader_anchor
    ? `<a href="../../probability/#${encodeURIComponent(a.reader_anchor)}">${ref} in the probability companion</a>`
    : ref;
  const authors = escapeHtml(source?.authors.join(' & ') || source?.title || a.source);
  const publication =
    a.kind === 'section' && !a.reader_anchor && /^https:\/\//.test(source?.official_url ?? '')
      ? `<a href="${escapeHtml(source.official_url)}" target="_blank" rel="noopener noreferrer">${authors}</a>`
      : authors;
  return `${publication} · ${location}${a.title ? ` · ${escapeHtml(a.title)}` : ''}${a.printed_page ? ` · p. ${a.printed_page}` : ''}`;
}

function privateEvidence(entry) {
  const skills = (entry?.linked_topics ?? [])
    .map((topic) => {
      const scores = ['recognition', 'construction', 'rigor', 'retention']
        .map((key) => `<span>${key} ${escapeHtml(topic.scores?.[key] ?? '—')}</span>`)
        .join('');
      return `<li><b>${escapeHtml(topic.name)}</b><span class="cs-scores">${scores}</span>
      <small>${escapeHtml(topic.assessment_status)}${topic.next_probe ? ` · ${escapeHtml(topic.next_probe)}` : ''}</small></li>`;
    })
    .join('');
  return `<section class="cs-evidence"><h3>Private evidence</h3>
    ${evidenceTag(evidenceState(entry))}
    ${skills ? `<ul class="cs-skills">${skills}</ul>` : '<p class="cs-note">No linked skill records for this view.</p>'}
    </section>`;
}

export function renderInspector({
  data,
  model,
  index,
  selected,
  course,
  entry,
  conceptButton,
  relationShown,
}) {
  const concept = model.concepts[selected];
  const groups = { Builds: [], Leads: [], Related: [] };
  for (const { relation: k, index: other } of index.neighbours[selected]) {
    if (!relationShown(k)) continue;
    const r = model.relations[k];
    const directed = model.types[r.type].directed;
    const outgoing = r.source === concept.id;
    const group =
      directed && r.class === 'dependency' ? (outgoing ? 'Leads' : 'Builds') : 'Related';
    const otherConcept = model.concepts[other];
    const bridge = index.bridges.has(k);
    const read =
      r.review?.read?.map((item) => escapeHtml(/^[a-z]{4}:\d/.test(item) ? locator(item) : item)) ??
      [];
    const automatic = r.evidence.slice(0, 3).map((e) => {
      const source = data.sources[e.source]?.authors.join(' & ');
      return e.result
        ? `${escapeHtml(source ?? e.source)} · ${escapeHtml(locator(e.result))}${e.page ? ` · p. ${e.page}` : ''}`
        : `Lecture notes${e.topic ? ` · lecture ${/:lecture(\d+):/.exec(e.topic)?.[1] ?? ''}` : ''}`;
    });
    const endpointSources = [selected, other].flatMap((i) => {
      const anchors =
        index.occurrences[i].find((o) => o.course === model.concepts[i].home_course)?.anchors ?? [];
      const section = anchors.find((a) => a.kind === 'section');
      return section
        ? [anchorText(section, data.sources, index.units[model.concepts[i].home_course])]
        : [];
    });
    groups[group].push(`<li class="cs-relation">
      <div class="cs-rel"><i class="cs-swatch" style="background:${RELATION_STYLE[r.type].color}"></i>
        <span>${RELATION_STYLE[r.type].label}${directed ? ` ${outgoing ? '→' : '←'}` : ' ↔'}</span>
        ${bridge ? `<span class="cs-bridge-tag">Cross-course · ${courseCode(otherConcept.home_course)}</span>` : ''}
      </div>
      ${conceptButton(other)}<p>${escapeHtml(r.rationale)}</p>
      ${r.conditions ? `<small><b>Conditions</b> · ${escapeHtml(r.conditions)}</small>` : ''}
      <details class="cs-relation-sources">
        <summary>${r.status === 'verified' ? 'Human-verified' : r.status === 'agent_reviewed' ? 'Agent-reviewed' : 'Proposed'}${read.length || automatic.length || endpointSources.length ? ' · source locators' : ''}</summary>
        ${r.review?.basis === 'mathematical_knowledge' ? '<p>Review basis · standard mathematical reasoning</p>' : ''}
        ${r.review?.reason ? `<p>${escapeHtml(r.review.reason)}</p>` : ''}
        ${read.length ? `<p>Review consulted ${read.join(' · ')}</p>` : ''}
        ${automatic.length ? `<p>Automatic support · ${automatic.join(' · ')}</p>` : ''}
        ${!read.length && endpointSources.length ? `<p>Endpoint readings · ${endpointSources.join(' · ')}</p>` : ''}
      </details>
    </li>`);
  }

  const occurrences = [...index.occurrences[selected]].sort(
    (a, b) => Number(b.course === course) - Number(a.course === course),
  );
  const sources = occurrences
    .map(
      (o, i) => `<details class="cs-occurrence" ${i === 0 ? 'open' : ''}>
    <summary>${courseTag(o.course)} · ${escapeHtml(o.role)}</summary>
    <p class="cs-note">${o.firstScheduled ? `First syllabus block begins ${o.firstScheduled}` : 'No dated syllabus anchor'}.</p>
    <ul class="cs-plain">${o.anchors.map((a) => `<li>${anchorText(a, data.sources, index.units[o.course])}</li>`).join('')}</ul>
  </details>`,
    )
    .join('');
  const labels = { Builds: 'Builds on', Leads: 'Leads to', Related: 'Other mathematical links' };
  const links = Object.entries(groups)
    .filter(([, rows]) => rows.length)
    .map(
      ([group, rows]) =>
        `<section><h3>${labels[group]}</h3><ul class="cs-relations">${rows.join('')}</ul></section>`,
    )
    .join('');
  const associations = data.associations.filter(({ a, b }) => a === concept.id || b === concept.id);
  return `
    <header>
      <p class="cs-kicker">${escapeHtml(humanize(concept.kind))} · dependency depth ${concept.depth}</p>
      <h2 tabindex="-1">${escapeHtml(concept.name)}</h2>
      <button type="button" class="cs-close" id="cs-close" aria-label="Close concept details">×</button>
    </header>
    <p class="cs-tags">${concept.courses.map(courseTag).join('')}${concept.courses.length > 1 ? ' <span>Shared concept</span>' : ''}</p>
    ${concept.aliases.length ? `<p class="cs-aliases">${concept.aliases.map(escapeHtml).join(' · ')}</p>` : ''}
    <p class="cs-summary">${escapeHtml(concept.summary)}</p>
    ${entry ? privateEvidence(entry) : ''}
    <section><h3>Course sources</h3>${sources}</section>
    ${links || '<p class="cs-note">No mathematical links match the current filters.</p>'}
    ${associations.length ? `<details class="cs-occurrence"><summary>Related ideas and names</summary><ul class="cs-plain">${associations.map((a) => `<li>${conceptButton(model.index.get(a.a === concept.id ? a.b : a.a))} · ${escapeHtml(a.kind)}<p>${escapeHtml(a.rationale)}</p></li>`).join('')}</ul></details>` : ''}`;
}
