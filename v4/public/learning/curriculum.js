const lectureLabels = {
  stats310a: [
    'Measure spaces',
    'Measure extension',
    'Measurable functions',
    'Laws and integration',
    'Inequalities and convergence',
    'Convergence theorems',
    'Independence and products',
    'Tail events and Fubini',
  ],
  math116: [
    'Complex differentiability',
    'Series and contours',
    'Cauchy–Goursat',
    'Cauchy’s formula',
    'Zeros and continuation',
    'Singularities and residues',
    'The argument principle',
    'Homotopy and logarithms',
    'Conformal maps',
    'Möbius transformations',
    'Harmonic conjugates',
    'Subharmonic functions',
  ],
  math120: [
    'Ring axioms',
    'Domains and polynomial rings',
    'Unique factorization',
    'Ideals and PIDs',
    'Ideal arithmetic and quotients',
    'Ring isomorphism theorems',
    'Prime and maximal ideals',
    'Zorn’s lemma and symmetry',
    'Permutations and sign',
    'Groups and actions',
    'Group homomorphisms and cosets',
    'Normal subgroups and quotients',
    'Group isomorphism theorems',
  ],
  physics330: [
    'Classical fields',
    'Symmetries and currents',
    'Canonical quantization',
    'Complex scalar fields',
    'Green’s functions and propagators',
    'Momentum-space propagators',
    'Dyson expansion',
    'Wick’s theorem',
    'Feynman rules',
    'The interacting vacuum',
    'Decay and cross sections',
    'LSZ and spinors',
  ],
};

export function hoverLabel(node) {
  if (node.kind === 'lecture' && Object.hasOwn(lectureLabels, node.course)) {
    return (
      lectureLabels[node.course][node.lecture - 1] ?? node.label.replace(/^Lecture \d+:\s*/, '')
    );
  }
  return node.label || node.id;
}

const themes = {
  stats310a: [
    {
      label: 'Measure & random variables',
      short: 'Measure',
      lectures: [1, 3],
      sections: ['1.1', '1.2'],
    },
    {
      label: 'Integration & convergence',
      short: 'Integration',
      lectures: [4, 6],
      sections: ['1.3'],
    },
    {
      label: 'Independence & limit laws',
      short: 'Limit laws',
      lectures: [7, 8],
      sections: ['1.4', '2', '3'],
    },
  ],
  math116: [
    { label: 'Holomorphic functions', short: 'Holomorphic', lectures: [1, 5] },
    { label: 'Singularities & topology', short: 'Singularities', lectures: [6, 8] },
    { label: 'Conformal maps & harmonic functions', short: 'Conformal', lectures: [9, 12] },
  ],
  math120: [
    { label: 'Ring theory', short: 'Rings', lectures: [1, 7] },
    { label: 'Group theory', short: 'Groups', lectures: [8, 13], color: '#a5baff' },
  ],
  physics330: [
    { label: 'Fields & quantization', short: 'Fields', lectures: [1, 4] },
    { label: 'Propagators & perturbation', short: 'Propagators', lectures: [5, 8] },
    { label: 'Scattering & spinors', short: 'Scattering', lectures: [9, 12] },
  ],
};

function groupIndex(course, node) {
  if (node.kind === 'assessed') return -1;
  return themes[course].findIndex(({ lectures: [start, end], sections }) => {
    if (node.kind === 'dembo' && typeof node.section === 'string') {
      return sections?.some(
        (prefix) => node.section === prefix || node.section.startsWith(prefix + '.'),
      );
    }
    return node.lecture >= start && node.lecture <= end;
  });
}

export function organizeCourse(course, points, neighbors) {
  const definitions = Object.hasOwn(themes, course) && themes[course];
  if (!definitions) return null;

  const indices = new Map(points.map(({ node }) => [node.id, groupIndex(course, node)]));
  if (![...indices.values()].some((index) => index >= 0)) return null;
  const sections = definitions.map((definition) => ({ ...definition, points: [] }));
  const ungrouped = { label: 'Other topics', points: [] };
  for (const point of points) {
    const { node } = point;
    let index = indices.get(node.id);
    if (index === -1) {
      const adjacent = [...(neighbors.get(node.id)?.keys() ?? [])];
      index = adjacent.map((id) => indices.get(id)).find((value) => value >= 0) ?? -1;
    }
    const section = sections[index] ?? ungrouped;
    section.points.push(point);
  }
  return { sections, ungrouped };
}
