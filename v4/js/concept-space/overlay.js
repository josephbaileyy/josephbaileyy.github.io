// Private evidence is read from a user-chosen file and kept in memory in this tab.
export const EVIDENCE_STATES = {
  retention_verified: { label: 'Delayed retention verified', color: '#7de0ed' },
  independently_demonstrated: { label: 'Independently demonstrated', color: '#75d4a4' },
  provisional: { label: 'Assisted / provisional', color: '#fac25f' },
  known_difficulty: { label: 'Recorded difficulty', color: '#f39079' },
  no_evidence: { label: 'Untested / no linked evidence', color: '#929bab' },
};

export function evidenceState(entry) {
  return entry?.retention_verified ? 'retention_verified' : (entry?.state ?? 'no_evidence');
}

function readEntry(entry) {
  const state =
    Object.hasOwn(EVIDENCE_STATES, entry?.state) && entry.state !== 'retention_verified'
      ? entry.state
      : 'no_evidence';
  return {
    state,
    retention_verified:
      state === 'independently_demonstrated' && entry?.retention_verified === true,
    linked_topics: Array.isArray(entry?.linked_topics)
      ? entry.linked_topics.filter((topic) => topic && typeof topic.name === 'string')
      : [],
  };
}

export function readOverlay(overlay, publicData) {
  if (overlay?.visibility !== 'private_learning_evidence') {
    throw new Error('Choose a private concept evidence overlay.');
  }
  const legacy =
    overlay.graph_id === 'concept-atlas:stats310a' &&
    (publicData.graph_id === overlay.graph_id || publicData.export_id === 'concept-space:unified');
  const unified =
    overlay.schema_version === 2 &&
    publicData.export_id &&
    overlay.export_id === publicData.export_id;
  if (!legacy && !unified) throw new Error('This overlay belongs to a different concept graph.');
  if (
    !overlay.concepts ||
    typeof overlay.concepts !== 'object' ||
    Array.isArray(overlay.concepts)
  ) {
    throw new Error('The overlay is missing concept entries.');
  }
  const concepts = Object.create(null);
  for (const concept of publicData.concepts) {
    const entry = overlay.concepts[concept.id];
    const byCourse = Object.fromEntries(
      (concept.courses ?? ['stats310a']).map((course) => [
        course,
        readEntry(legacy ? (course === 'stats310a' ? entry : null) : entry?.by_course?.[course]),
      ]),
    );
    const overall = readEntry(legacy ? entry : entry?.overall);
    if (unified)
      overall.linked_topics = Object.values(byCourse).flatMap((item) => item.linked_topics);
    concepts[concept.id] = { ...overall, byCourse };
  }
  return { concepts, legacy };
}
