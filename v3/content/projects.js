export const projects = Object.freeze([
  Object.freeze({
    id: 'minerva-omnifold-pipeline',
    title: 'MINERvA-OmniFold',
    summary: 'Unbinned ML unfolding pipeline for neutrino cross-sections.',
    signal: null,
    work: 'Built an unbinned ML unfolding pipeline using OmniFold on MINERvA neutrino scattering data and benchmarked against Bayesian unfolding.',
    evidence:
      'The evaluation programme uses closure tests, generator stress tests, bootstrap resampling, and bias–variance analysis to test the structural-bias question.',
    stack: Object.freeze(['Python', 'PyTorch', 'OmniFold', 'MINERvA', 'ROOT']),
    links: Object.freeze([{ label: 'Paper (PDF)', href: './papers/neutrino-unfolding.pdf' }]),
  }),
  Object.freeze({
    id: 'splora',
    title: 'SPLoRA',
    summary:
      'LoRA fine-tuning of GPT-2 for paraphrase detection and Shakespearean sonnet generation.',
    signal: null,
    work: 'Implemented Low-Rank Adaptation (LoRA) fine-tuning on GPT-2 parameters for dual task adaptation.',
    evidence:
      'Achieved 0.888 dev accuracy at ~1% trainable parameters and 41.94 chrF score on sonnet generation.',
    stack: Object.freeze(['Python', 'PyTorch', 'GPT-2', 'LoRA', 'HuggingFace']),
    links: Object.freeze([
      { label: 'Report (PDF)', href: './papers/splora-report.pdf' },
      { label: 'Poster (PDF)', href: './papers/splora-poster.pdf' },
    ]),
  }),
  Object.freeze({
    id: 'lord',
    title: 'LoRD',
    summary:
      'Video person re-identification with DINOv2/v3 backbones, LoRA, BNNeck, and temporal attention.',
    signal: null,
    work: 'Engineered a video re-identification architecture using DINO vision transformers, LoRA adapters, BNNeck layer, and temporal attention pooling.',
    evidence:
      'Evaluated on MARS benchmark video dataset for identity matching across camera views.',
    stack: Object.freeze(['Python', 'PyTorch', 'DINOv2', 'LoRA', 'Computer Vision']),
    links: Object.freeze([
      { label: 'Report (PDF)', href: './papers/lord-report.pdf' },
      { label: 'Poster (PDF)', href: './papers/lord-poster.pdf' },
    ]),
  }),
  Object.freeze({
    id: 'soccer-gnn',
    title: 'Soccer action prediction with GNNs',
    summary:
      'Possessions as heterogeneous graphs for GraphSAGE and Relational Graph Transformer action prediction.',
    signal: null,
    work: 'Represented soccer match possessions as dynamic heterogeneous graphs and developed GNN models in PyTorch Geometric and RelBench.',
    evidence:
      'Implemented GraphSAGE and a Relational Graph Transformer for soccer action prediction.',
    stack: Object.freeze(['Python', 'PyTorch Geometric', 'GraphSAGE', 'RelBench', 'GNN']),
    links: Object.freeze([{ label: 'GitHub', href: 'https://github.com/josephbaileyy' }]),
  }),
  Object.freeze({
    id: 'lol-match-prediction',
    title: 'Pro League of Legends match prediction',
    summary: 'Calibrated win-probability models over draft, economy, and objective data.',
    signal: null,
    work: 'Extracted features across draft composition, early gold economy, and objective control to train calibrated probability classifiers.',
    evidence: 'Built calibrated win-probability models over draft, economy, and objective data.',
    stack: Object.freeze(['Python', 'scikit-learn', 'XGBoost', 'Probability Calibration']),
    links: Object.freeze([
      { label: 'Report (PDF)', href: './papers/lol-report.pdf' },
      { label: 'Poster (PDF)', href: './papers/lol-poster.pdf' },
    ]),
  }),
  Object.freeze({
    id: 'systems-security',
    title: 'Systems & security',
    summary: 'Solidity multisig wallet, Double Ratchet chat, and Pintos OS enhancements.',
    signal: null,
    work: 'Developed a 2-of-3 multisig Ethereum wallet in Solidity/Foundry, built an end-to-end encrypted chat client implementing Double Ratchet, and extended Pintos OS thread scheduling, syscalls, and virtual memory.',
    evidence:
      'Completed implementations spanning a 2-of-3 wallet, Double Ratchet messaging, and Pintos scheduling, syscalls, and virtual memory.',
    stack: Object.freeze(['C', 'Solidity', 'Foundry', 'Cryptography', 'Pintos OS']),
    links: Object.freeze([]),
  }),
  Object.freeze({
    id: 'prior-personal-site',
    title: 'Prior personal site (v2)',
    summary: 'Powers-of-Ten interactive zoom from Milky Way to desk.',
    signal: null,
    work: 'Designed and built a TypeScript and Three.js visual site featuring live star catalog rendering, Earth terminator lighting, and animated AM CVn binary.',
    evidence:
      'The previous portfolio used a real star catalog, a live Earth terminator, and an animated AM CVn binary in its Powers-of-Ten journey.',
    stack: Object.freeze(['TypeScript', 'Three.js', 'WebGL', 'Canvas 2D']),
    links: Object.freeze([]),
  }),
]);
