export const research = Object.freeze([
  Object.freeze({
    id: 'minerva-omnifold',
    title: 'Unbinned unfolding for neutrino–nucleus cross sections',
    role: 'Research Assistant',
    venue: 'Stanford Physics · Prof. Benjamin Nachman',
    period: '2026 — present',
    current: true,
    question:
      'Can high-dimensional unbinned unfolding reduce structural model bias in the few-GeV neutrino scattering regime?',
    method:
      'Implemented and evaluated OmniFold, an unbinned ML unfolding framework, on MINERvA neutrino-scattering data; benchmarked against iterative Bayesian unfolding via closure tests, generator stress tests, bootstrap resampling, and bias–variance analysis.',
    result:
      'An OmniFold implementation and evaluation programme are in place; whether high-dimensional unbinned unfolding reduces structural model bias is the question under test.',
    tags: Object.freeze([
      'OmniFold',
      'MINERvA',
      'neutrino physics',
      'unbinned unfolding',
      'statistical inference',
    ]),
    links: Object.freeze([{ label: 'Paper (PDF)', href: './papers/neutrino-unfolding.pdf' }]),
  }),
  Object.freeze({
    id: 'collider-ml-slac',
    title: 'Machine learning for pileup mitigation in γγ collider di-Higgs detection',
    role: 'Undergraduate Researcher',
    venue: 'SLAC National Accelerator Laboratory',
    period: 'Jun 2024 — Jan 2025',
    current: false,
    question:
      'How do pileup backgrounds impact di-Higgs event reconstruction at a proposed γγ collider (XCC Higgs factory)?',
    method:
      'Analyzed terabytes of collider simulation data using Delphes, ROOT, and Unix HPC clusters; developed ML models to mitigate pileup effects on di-Higgs signal detection.',
    result:
      'Contributed collider-simulation and pileup-ML work to a four-person XCC Higgs-factory proposal, documented in the project poster.',
    tags: Object.freeze(['SLAC', 'Collider ML', 'Delphes', 'ROOT', 'Higgs Factory']),
    links: Object.freeze([{ label: 'Poster (PDF)', href: './papers/xcc-pileup-poster.pdf' }]),
  }),
  Object.freeze({
    id: 'x17-bump-hunting',
    title: 'Gaussian-process bump hunting for X17 particle searches',
    role: 'Undergraduate Researcher',
    venue: 'Jefferson Lab · APS Far West Section (UC Santa Cruz)',
    period: '2025',
    current: false,
    question:
      'Can non-parametric Gaussian process regression search for resonant excesses from the hypothetical X17 particle without parametric background bias?',
    method:
      'Applied Gaussian process regression to model invariant mass spectrum backgrounds and search for localized resonance bumps; presented results at the APS Far West Section meeting.',
    result:
      'Presented the Gaussian-process bump-hunting study at the APS Far West Section meeting at UC Santa Cruz.',
    tags: Object.freeze([
      'Gaussian Processes',
      'Jefferson Lab',
      'X17 Particle',
      'Bump Hunting',
      'APS Far West',
    ]),
    links: Object.freeze([{ label: 'Talk (PDF)', href: './papers/x17-bump-hunt-apsfws.pdf' }]),
  }),
  Object.freeze({
    id: 'am-cvn-photometry',
    title: 'Time-series CCD photometry of cataclysmic variable AM CVn',
    role: 'Student Researcher',
    venue: 'Stanford University (PHYSICS 100 Observational Astrophysics)',
    period: 'Spring 2026',
    current: false,
    question:
      'Can ground-based differential CCD photometry recover the 1051-second orbital/superhump period of the AM CVn cataclysmic variable system?',
    method:
      'Acquired 140 V-band CCD images, performed AAVSO differential photometry on 138 retained exposures, and analyzed time-series light curves for periodic signals.',
    result:
      'Retained 138 of 140 exposures and recovered the known 1051-second positive-superhump family in the AM CVn light curve.',
    tags: Object.freeze([
      'Observational Astrophysics',
      'Photometry',
      'AM CVn',
      'CCD',
      'Time Series',
    ]),
    links: Object.freeze([
      { label: 'Report (PDF)', href: './papers/am-cvn-report.pdf' },
      { label: 'Presentation (PDF)', href: './papers/am-cvn-presentation.pdf' },
    ]),
  }),
  Object.freeze({
    id: 'ligo-suspensions',
    title: 'Suspension system simulation and laser interferometry for LIGO',
    role: 'SURF Research Fellow',
    venue: 'Caltech LIGO Laboratory',
    period: '2023',
    current: false,
    question:
      'How can suspension dynamics and laser beam interferometry be modeled and tested to optimize gravitational-wave detector performance?',
    method:
      'Conducted suspension testing and simulation alongside laser-beam interferometry experiments, writing custom Python scripts for data reduction and analysis.',
    result:
      'Documented the suspension simulation, testing, and Python-analyzed interferometry work in a LIGO technical note.',
    tags: Object.freeze([
      'LIGO',
      'Interferometry',
      'Suspensions',
      'Gravitational Waves',
      'Caltech',
    ]),
    links: Object.freeze([
      { label: 'Technical Note (PDF)', href: './papers/ligo-caltech-report.pdf' },
    ]),
  }),
]);
