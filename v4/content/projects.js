export const projects = Object.freeze([
  Object.freeze({
    id: 'neutrino-video',
    title: 'The Proton Hidden in Plastic',
    summary:
      'A five-minute animated explainer on how MINERvA measures the proton’s weak-force response using a plastic detector.',
    work: 'Wrote, narrated, and developed a Manim animation explaining how the different kinematic signatures of carbon and hydrogen let MINERvA statistically measure the free-proton contribution in a plastic detector.',
    evidence:
      'Published the film with captions and a source card identifying peer-reviewed results and preprints. Script, storyboard, and animation development used AI assistance; the narration is my own recording.',
    stack: Object.freeze(['Python', 'Manim', 'FFmpeg', 'science communication']),
    links: Object.freeze([
      Object.freeze({
        label: 'Watch on YouTube',
        href: 'https://www.youtube.com/watch?v=AqWGbHiEFBw',
      }),
    ]),
  }),
  Object.freeze({
    id: 'minerva-omnifold-pipeline',
    title: 'MINERvA-OmniFold',
    summary: 'An unbinned machine-learning unfolding pipeline for neutrino cross sections.',
    work: 'Built an OmniFold workflow on MINERvA neutrino-scattering data and an evaluation programme spanning closure tests, generator stress tests, bootstrap resampling, and bias–variance analysis.',
    evidence:
      'The pipeline reproduces MINERvA’s published binned result before extending the unfolding to higher dimensions, with closure, uncertainty and generator studies recorded alongside the code.',
    stack: Object.freeze(['Python', 'PyTorch', 'OmniFold', 'MINERvA', 'ROOT']),
    links: Object.freeze([
      Object.freeze({
        label: 'GitHub',
        href: 'https://github.com/josephbaileyy/MINERvA-OmniFold',
      }),
      Object.freeze({
        label: 'Physics 191 review (PDF, March 2026)',
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
    summary: 'Video person re-identification with LoRA-adapted DINOv2/v3 backbones.',
    work: 'In a three-person team, built LoRA-adapted DINO frame encoders with a BNNeck layer and compared mean pooling with a learned temporal-attention head.',
    evidence:
      'On the MARS benchmark, LoRA on DINOv2 with mean pooling raised mAP from 1.8 zero-shot to 76.7; the temporal-attention head did not beat mean pooling.',
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
    summary: 'Pre-match outcome prediction from team drafts and players’ champion win rates.',
    work: 'Encoded team drafts, players’ win rates on their picked champions, and Word2Vec team-composition embeddings as match vectors to predict professional match outcomes before play.',
    evidence:
      'Compared a logistic-regression baseline with gradient boosting, random forests and a neural network, and wrote up the study with Joshua Hsieh in a report and poster.',
    stack: Object.freeze(['Python', 'scikit-learn', 'Word2Vec']),
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
