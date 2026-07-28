import { createRng, randomRange } from './math.js';

const featuredBodies = [
  {
    id: 'minerva-omnifold',
    label: 'OMNIFOLD',
    massClass: 'heavy',
    slot: { x: -0.5, y: 0.1 },
    kind: 'research',
    href: null,
  },
  {
    id: 'collider-ml',
    label: 'XCC',
    massClass: 'heavy',
    slot: { x: -0.2, y: 0.44 },
    kind: 'research',
    href: null,
  },
  {
    id: 'x17-bump',
    label: 'X17',
    massClass: 'heavy',
    slot: { x: 0.16, y: 0.38 },
    kind: 'research',
    href: null,
  },
  {
    id: 'am-cvn',
    label: 'AM CVn',
    massClass: 'heavy',
    slot: { x: 0.5, y: 0.25 },
    kind: 'research',
    href: null,
  },
  {
    id: 'ligo-lab',
    label: 'LIGO',
    massClass: 'heavy',
    slot: { x: -0.43, y: -0.08 },
    kind: 'research',
    href: null,
  },
  {
    id: 'splora',
    label: 'SPLoRA',
    massClass: 'mid',
    slot: { x: -0.12, y: 0.03 },
    kind: 'project',
    href: null,
  },
  {
    id: 'lord-reid',
    label: 'LoRD',
    massClass: 'mid',
    slot: { x: 0.24, y: -0.03 },
    kind: 'project',
    href: null,
  },
  {
    id: 'soccer-gnn',
    label: 'GNN',
    massClass: 'mid',
    slot: { x: 0.51, y: -0.18 },
    kind: 'project',
    href: null,
  },
  {
    id: 'lol-predict',
    label: 'LoL ML',
    massClass: 'mid',
    slot: { x: -0.48, y: -0.42 },
    kind: 'project',
    href: null,
  },
  {
    id: 'multisig',
    label: 'MULTISIG',
    massClass: 'mid',
    slot: { x: -0.12, y: -0.36 },
    kind: 'project',
    href: null,
  },
  {
    id: 'double-ratchet',
    label: 'RATCHET',
    massClass: 'mid',
    slot: { x: 0.25, y: -0.43 },
    kind: 'project',
    href: null,
  },
  {
    id: 'github',
    label: 'GITHUB',
    massClass: 'light',
    slot: { x: 0.62, y: 0.5 },
    kind: 'link',
    href: 'https://github.com/josephbaileyy',
  },
  {
    id: 'track',
    label: '400mH',
    massClass: 'light',
    slot: { x: 0.64, y: -0.5 },
    kind: 'link',
    href: 'https://www.tfrrs.org/',
  },
  {
    id: 'contact',
    label: 'CONTACT',
    massClass: 'light',
    slot: { x: -0.66, y: 0.56 },
    kind: 'link',
    href: 'mailto:jrbailey555@gmail.com',
  },
];

function createFillers(count) {
  const rng = createRng(2027);

  return Array.from({ length: count }, (_, index) => {
    const column = index % 10;
    const row = Math.floor(index / 10);
    const massClass = index % 13 === 0 ? 'heavy' : index % 4 === 0 ? 'light' : 'mid';

    return {
      id: null,
      label: '',
      massClass,
      slot: {
        x: -0.72 + column * 0.16 + randomRange(rng, -0.025, 0.025),
        y: 0.68 - row * 0.19 + randomRange(rng, -0.025, 0.025),
      },
      kind: 'project',
      href: null,
    };
  });
}

export const fixtureManifest = {
  bodies: [...featuredBodies, ...createFillers(70)],
};
