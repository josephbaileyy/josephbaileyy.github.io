import { evidenceState } from './overlay.js';

export const COURSE_DISPLAY = {
  stats310a: { code: 'STATS 310A', name: 'Probability theory (MATH 230A)', color: '#79b9fb' },
  math116: { code: 'MATH 116', name: 'Complex analysis', color: '#f4b480' },
  math120: { code: 'MATH 120', name: 'Groups and rings', color: '#79d5b4' },
  physics330: { code: 'PHYSICS 330', name: 'Quantum field theory', color: '#c7a7f7' },
};

export const isReviewed = (relation) => ['agent_reviewed', 'verified'].includes(relation.status);
export const isSourced = (relation) => isReviewed(relation) || relation.support !== 'agent_only';

export function curriculumIndex(data, model) {
  const occurrences = model.concepts.map(() => []);
  const neighbours = model.concepts.map(() => []);
  const prerequisites = model.concepts.map(() => new Set());
  const unlocks = model.concepts.map(() => new Set());
  const units = Object.fromEntries(
    data.courses.map(({ id }) => [id, new Map(data.syllabus_units[id].map((u) => [u.id, u]))]),
  );

  for (const occurrence of data.occurrences) {
    const dates = occurrence.anchors
      .filter((a) => a.kind === 'syllabus')
      .map((a) => units[occurrence.course].get(a.unit)?.dates[0])
      .filter(Boolean)
      .sort();
    occurrences[model.index.get(occurrence.concept)].push({
      ...occurrence,
      firstScheduled: dates[0] ?? null,
    });
  }
  const bridges = new Set();
  model.relations.forEach((relation, k) => {
    const a = model.index.get(relation.source);
    const b = model.index.get(relation.target);
    neighbours[a].push({ index: b, relation: k });
    neighbours[b].push({ index: a, relation: k });
    if (isBridge(model, a, b)) bridges.add(k);
    if (relation.class === 'dependency' && isReviewed(relation)) {
      prerequisites[b].add(a);
      unlocks[a].add(b);
    }
  });
  return { occurrences, neighbours, prerequisites, unlocks, bridges, units };
}

export function isBridge(model, a, b) {
  return model.concepts[a].home_course !== model.concepts[b].home_course;
}

export function mapVisibility(index, state, relationShown) {
  const primary = index.occurrences.map(
    (items, i) =>
      items.some(
        (o) =>
          (state.course === 'all' || o.course === state.course) &&
          (!state.scheduledOnly || (o.firstScheduled && o.firstScheduled <= state.cutoff)),
      ) && state.kinds.has(state.concepts[i].kind),
  );
  const context = primary.map(() => false);
  const local = state.selected >= 0;
  const localLinks = local
    ? new Set(
        index.neighbours[state.selected]
          .filter(({ relation }) => relationShown(relation))
          .map(({ index: i }) => i),
      )
    : null;
  if (state.showBridges && state.course !== 'all') {
    for (const k of index.bridges) {
      if (!relationShown(k)) continue;
      const [a, b] = state.endpoints[k];
      if (
        primary[a] &&
        !primary[b] &&
        state.kinds.has(state.concepts[b].kind) &&
        !state.concepts[b].courses.includes(state.course)
      )
        context[b] = true;
      if (
        primary[b] &&
        !primary[a] &&
        state.kinds.has(state.concepts[a].kind) &&
        !state.concepts[a].courses.includes(state.course)
      )
        context[a] = true;
    }
  }
  const visible = primary.map((show, i) =>
    local
      ? i === state.selected || (localLinks.has(i) && (show || context[i]))
      : show || context[i],
  );
  return { primary, context, visible };
}

export function practiceQueue(index, candidates, overlay, course, limit = 5) {
  const independent = (i, inCourse = course) =>
    ['independently_demonstrated', 'retention_verified'].includes(
      evidenceState(overlay?.entry(i, inCourse)),
    );
  return candidates
    .filter((i) => !independent(i))
    .map((i) => {
      // A cross-course prerequisite can be demonstrated in its own course.
      const missing = [...index.prerequisites[i]].filter((j) => !independent(j, 'all'));
      const unlocks = [...index.unlocks[i]].filter((j) => !independent(j, 'all')).length;
      const evidence = evidenceState(overlay?.entry(i, course));
      const priority = ['known_difficulty', 'provisional', 'no_evidence'].indexOf(evidence);
      return { i, missing, unlocks, priority };
    })
    .sort(
      (a, b) =>
        Number(Boolean(a.missing.length)) - Number(Boolean(b.missing.length)) ||
        a.priority - b.priority ||
        a.missing.length - b.missing.length ||
        b.unlocks - a.unlocks ||
        a.i - b.i,
    )
    .slice(0, limit);
}
