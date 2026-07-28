export const projects = Object.freeze([
  Object.freeze({
    id: 'prior-personal-site',
    title: 'This website',
    summary: 'A prior Powers-of-Ten journey from the Milky Way to a desk.',
    work: 'Designed and built a TypeScript and Three.js portfolio with a real star catalog, live Earth-terminator lighting, and an animated AM CVn binary.',
    evidence:
      'The prior version joined an immersive WebGL route to structured research content and downloadable evidence.',
    stack: Object.freeze(['TypeScript', 'Three.js', 'WebGL', 'Playwright', 'Vitest']),
    links: Object.freeze([
      Object.freeze({
        label: 'Source',
        href: 'https://github.com/josephbaileyy/josephbaileyy.github.io',
      }),
    ]),
  }),
  Object.freeze({
    id: 'minerva-omnifold-pipeline',
    title: 'MINERvA-OmniFold',
    summary: 'An unbinned machine-learning unfolding pipeline for neutrino cross sections.',
    work: 'Built an OmniFold workflow on MINERvA neutrino-scattering data and an evaluation programme spanning closure tests, generator stress tests, bootstrap resampling, and bias–variance analysis.',
    evidence:
      'The reproducible pipeline and paper compare machine-learning unfolding with iterative Bayesian unfolding under controlled uncertainty tests; whether the method reduces structural model bias remains under test.',
    stack: Object.freeze(['Python', 'PyTorch', 'OmniFold', 'MINERvA', 'ROOT']),
    links: Object.freeze([
      Object.freeze({
        label: 'GitHub',
        href: 'https://github.com/josephbaileyy/MINERvA-OmniFold',
      }),
      Object.freeze({
        label: 'Paper (PDF)',
        href: './papers/neutrino-unfolding.pdf',
      }),
    ]),
  }),
  Object.freeze({
    id: 'splora',
    title: 'SPLoRA',
    summary:
      'LoRA fine-tuning of GPT-2 for paraphrase detection and Shakespearean sonnet generation.',
    work: 'Implemented Low-Rank Adaptation training and evaluation paths for discriminative and generative language tasks.',
    evidence:
      'Reached 0.888 development accuracy while training about 1% of parameters, with 41.94 chrF on sonnet generation.',
    stack: Object.freeze(['Python', 'PyTorch', 'GPT-2', 'LoRA', 'Hugging Face']),
    links: Object.freeze([
      Object.freeze({
        label: 'GitHub',
        href: 'https://github.com/josephbaileyy/splora',
      }),
      Object.freeze({
        label: 'Report (PDF)',
        href: './papers/splora-report.pdf',
      }),
      Object.freeze({
        label: 'Poster (PDF)',
        href: './papers/splora-poster.pdf',
      }),
    ]),
  }),
  Object.freeze({
    id: 'lord',
    title: 'LoRD',
    summary:
      'Video person re-identification with DINOv2/v3 backbones, LoRA, BNNeck, and temporal attention.',
    work: 'Engineered a video re-identification system using DINO vision transformers, LoRA adapters, a BNNeck layer, and temporal-attention pooling.',
    evidence:
      'Evaluated the system on the MARS video benchmark for cross-camera identity matching.',
    stack: Object.freeze(['Python', 'PyTorch', 'DINOv2/v3', 'LoRA', 'computer vision']),
    links: Object.freeze([
      Object.freeze({
        label: 'GitHub',
        href: 'https://github.com/anandkrishnan27/lord',
      }),
      Object.freeze({
        label: 'Report (PDF)',
        href: './papers/lord-report.pdf',
      }),
      Object.freeze({
        label: 'Poster (PDF)',
        href: './papers/lord-poster.pdf',
      }),
    ]),
  }),
  Object.freeze({
    id: 'soccer-gnn',
    title: 'Soccer action prediction with GNNs',
    summary: 'Soccer possessions modeled as heterogeneous graphs for next-action prediction.',
    work: 'Represented possessions as dynamic heterogeneous graphs and evaluated GraphSAGE and a Relational Graph Transformer with PyTorch Geometric and RelBench.',
    evidence:
      'Produced public code and a technical article explaining the graph-learning formulation and model comparison.',
    stack: Object.freeze([
      'PyTorch Geometric',
      'RelBench',
      'GraphSAGE',
      'Relational Graph Transformer',
    ]),
    links: Object.freeze([
      Object.freeze({
        label: 'GitHub',
        href: 'https://github.com/josephbaileyy/cs-224w-project',
      }),
      Object.freeze({
        label: 'Blog post',
        href: 'https://medium.com/@yqin604/understanding-soccer-through-next-action-prediction-with-gnn-40f8e58d92d2',
      }),
    ]),
  }),
  Object.freeze({
    id: 'lol-match-prediction',
    title: 'Professional League of Legends match prediction',
    summary: 'Calibrated win-probability models over draft, economy, and objective data.',
    work: 'Built features from draft composition, gold economy, and objective control to predict professional match outcomes.',
    evidence:
      'Benchmarked calibrated win-probability models against baseline methods and documented the study in a report and poster.',
    stack: Object.freeze(['Python', 'scikit-learn', 'XGBoost', 'probability calibration']),
    links: Object.freeze([
      Object.freeze({
        label: 'GitHub',
        href: 'https://github.com/josephbaileyy/cs-229-project',
      }),
      Object.freeze({
        label: 'Report (PDF)',
        href: './papers/lol-report.pdf',
      }),
      Object.freeze({
        label: 'Poster (PDF)',
        href: './papers/lol-poster.pdf',
      }),
    ]),
  }),
  Object.freeze({
    id: 'systems-security',
    title: 'Systems and security',
    summary: 'A multisig wallet, Double Ratchet chat, and Pintos operating-system work.',
    work: 'Built a Solidity and Foundry 2-of-3 multisig Ethereum wallet, an end-to-end encrypted chat client implementing the Double Ratchet, and Pintos enhancements spanning scheduling, system calls, and virtual memory.',
    evidence:
      'Completed implementations across smart-contract security, encrypted messaging, and operating-system internals.',
    stack: Object.freeze(['C', 'Solidity', 'Foundry', 'cryptography', 'Pintos']),
    links: Object.freeze([]),
  }),
]);
