// Private evidence overlay. The overlay file is produced in the private ledger by
// `scripts/concept_atlas.py --private-overlay local/…` and opened from disk in the
// visitor's own tab. It is validated here, held in memory, and never fetched,
// uploaded or stored. Missing evidence is shown as untested, never as failure.

export const EVIDENCE_STATES = {
  independently_demonstrated: { label: 'Independently demonstrated', color: '#0ca30c' },
  provisional: { label: 'Provisional (assisted or unconfirmed)', color: '#fab219' },
  known_difficulty: { label: 'Recorded difficulty on a linked skill', color: '#ec835a' },
  no_evidence: { label: 'No evidence yet (untested)', color: '#4a5162' },
};

export function readOverlay(overlay, publicData) {
  if (!overlay || typeof overlay !== 'object') throw new Error('not a JSON object');
  if (overlay.visibility !== 'private_learning_evidence') {
    throw new Error('expected a private_learning_evidence overlay');
  }
  if (overlay.graph_id !== publicData.graph_id) {
    throw new Error(`overlay is for ${overlay.graph_id}, not ${publicData.graph_id}`);
  }
  if (!overlay.concepts || typeof overlay.concepts !== 'object')
    throw new Error('missing concepts');
  const known = new Set(publicData.concepts.map((concept) => concept.id));
  const concepts = {};
  for (const [id, entry] of Object.entries(overlay.concepts)) {
    if (!known.has(id)) continue; // Ignore concepts this public graph does not contain.
    const state = Object.hasOwn(EVIDENCE_STATES, entry?.state) ? entry.state : 'no_evidence';
    concepts[id] = {
      state,
      retention_verified: entry.retention_verified === true,
      linked_topics: Array.isArray(entry.linked_topics) ? entry.linked_topics : [],
    };
  }
  // Concepts absent from the overlay are untested, not failed.
  for (const id of known) {
    concepts[id] ??= { state: 'no_evidence', retention_verified: false, linked_topics: [] };
  }
  return { as_of: overlay.as_of, concepts };
}
