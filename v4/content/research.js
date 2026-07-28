export const research = Object.freeze([
  Object.freeze({
    id: 'minerva-omnifold',
    title: 'Unbinned unfolding for neutrino–nucleus cross sections',
    role: 'Research Assistant',
    venue: 'Stanford Physics · Prof. Benjamin Nachman',
    period: '2026 — present',
    grant: '2026 Stanford Major Grant',
    current: true,
    question:
      'Can high-dimensional unbinned unfolding reduce structural model bias in the few-GeV neutrino-scattering regime?',
    method:
      'Implementing and evaluating OmniFold, an unbinned machine-learning unfolding framework, on MINERvA neutrino-scattering data; benchmarking against iterative Bayesian unfolding through closure tests, generator stress tests, bootstrap resampling, and bias–variance analysis.',
    result:
      'An OmniFold implementation and evaluation programme are in place; whether high-dimensional unbinned unfolding reduces structural model bias is the question under test.',
    tags: Object.freeze([
      'OmniFold',
      'MINERvA',
      'neutrino physics',
      'unbinned unfolding',
      'statistical inference',
    ]),
    links: Object.freeze([
      Object.freeze({
        label: 'Paper (PDF)',
        href: './papers/neutrino-unfolding.pdf',
      }),
    ]),
  }),
  Object.freeze({
    id: 'collider-ml-slac',
    title: 'Machine learning for pileup mitigation in γγ collider di-Higgs detection',
    role: 'Undergraduate Researcher',
    venue: 'SLAC National Accelerator Laboratory',
    period: 'Jun 2024 — Jan 2025',
    current: false,
    question:
      'How do pileup backgrounds affect di-Higgs event reconstruction at a proposed γγ collider, the XCC Higgs factory?',
    method:
      'Worked on a four-person collider proposal, analyzing terabytes of simulation data with Delphes, ROOT, and Unix HPC systems and developing machine-learning methods to study pileup effects on di-Higgs detection.',
    result:
      'Contributed collider-simulation and pileup-machine-learning work to the four-person XCC Higgs-factory proposal documented in the project poster.',
    tags: Object.freeze(['SLAC', 'collider ML', 'Delphes', 'ROOT', 'Higgs factory']),
    links: Object.freeze([
      Object.freeze({
        label: 'Poster (PDF)',
        href: './papers/xcc-pileup-poster.pdf',
      }),
    ]),
  }),
  Object.freeze({
    id: 'x17-bump-hunting',
    title: 'Gaussian-process bump hunting for X17 particle searches',
    role: 'Undergraduate Researcher',
    venue: 'Jefferson Lab · APS Far West Section, UC Santa Cruz',
    period: '2025',
    current: false,
    question:
      'Can non-parametric Gaussian-process regression search for resonant excesses from the hypothetical X17 particle without imposing a parametric background model?',
    method:
      'Applied Gaussian-process regression to model invariant-mass backgrounds and search for localized resonance excesses.',
    result:
      'Presented the Gaussian-process bump-hunting study at the APS Far West Section meeting at UC Santa Cruz.',
    tags: Object.freeze([
      'Gaussian processes',
      'Jefferson Lab',
      'X17 particle',
      'bump hunting',
      'APS Far West',
    ]),
    links: Object.freeze([
      Object.freeze({
        label: 'Talk (PDF)',
        href: './papers/x17-bump-hunt-apsfws.pdf',
      }),
    ]),
  }),
  Object.freeze({
    id: 'am-cvn-photometry',
    title: 'Time-series CCD photometry of cataclysmic variable AM CVn',
    role: 'Student Researcher',
    venue: 'Stanford · PHYSICS 100 Observational Astrophysics',
    period: 'Spring 2026',
    current: false,
    question:
      'Can ground-based differential CCD photometry recover the 1051-second positive-superhump family of the AM CVn cataclysmic variable?',
    method:
      'Acquired 140 V-band CCD images, performed AAVSO differential photometry on 138 retained exposures, and analyzed the resulting time-series light curve.',
    result:
      'Retained 138 of 140 exposures and recovered the known 1051-second positive-superhump family in the AM CVn light curve.',
    tags: Object.freeze([
      'observational astrophysics',
      'photometry',
      'AM CVn',
      'CCD',
      'time series',
    ]),
    links: Object.freeze([
      Object.freeze({
        label: 'Report (PDF)',
        href: './papers/am-cvn-report.pdf',
      }),
      Object.freeze({
        label: 'Slides (PDF)',
        href: './papers/am-cvn-presentation.pdf',
      }),
    ]),
  }),
  Object.freeze({
    id: 'ligo-suspensions',
    title: 'Interferometry and suspension systems for LIGO',
    role: 'Researcher',
    venue: 'Caltech LIGO Laboratory',
    period: '2023',
    current: false,
    question:
      'How can suspension dynamics and laser-beam interferometry be modeled and tested for gravitational-wave detector development?',
    method:
      'Supported suspension simulation and testing and conducted laser-beam interferometry experiments with custom Python analysis.',
    result:
      'Documented the suspension simulation, testing, and Python-analyzed interferometry work in a LIGO technical note.',
    tags: Object.freeze([
      'LIGO',
      'interferometry',
      'suspensions',
      'gravitational waves',
      'Caltech',
    ]),
    links: Object.freeze([
      Object.freeze({
        label: 'Technical note (PDF)',
        href: './papers/ligo-caltech-report.pdf',
      }),
    ]),
  }),
]);
