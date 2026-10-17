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
    title: 'Pileup characterization for γγ collider di-Higgs detection',
    role: 'Undergraduate Researcher',
    venue: 'SLAC National Accelerator Laboratory',
    period: 'Jun 2024 — Jan 2025',
    current: false,
    question:
      'How do pileup backgrounds affect di-Higgs event reconstruction at a proposed γγ collider, the XCC Higgs factory?',
    method:
      'Did most of the pileup study myself, within the four-person XCC project. Generated 1.5 million di-Higgs signal events with Delphes fast simulation and ROOT, with and without pileup (an average of 6.81 events per bunch crossing), and characterized how pileup changes jet multiplicity, jet transverse momentum, and jet response. Machine-learning approaches were exploratory.',
    result:
      'Pileup concentrates in the forward region; pileup subtraction plus removing all objects with |cos θ| > 0.8 worked best, suppressing pileup while preserving the signal.',
    tags: Object.freeze(['SLAC', 'pileup', 'Delphes', 'ROOT', 'Higgs factory']),
    links: Object.freeze([
      Object.freeze({
        label: 'Poster (PDF)',
        href: './papers/xcc-pileup-poster.pdf',
      }),
    ]),
  }),
  Object.freeze({
    id: 'x17-bump-hunting',
    title: 'Gaussian-process bump hunting for a planned X17 search',
    role: 'Undergraduate Researcher',
    venue:
      'Stanford, in collaboration with Jefferson Lab’s X17 experiment · APS Far West Section, UC Santa Cruz',
    period: '2025',
    current: false,
    question:
      'Can non-parametric Gaussian-process regression search for a resonant excess from the hypothetical X17 particle without imposing a parametric background model?',
    method:
      'Built on an existing Gaussian-process bump-hunting implementation and adapted it to Jefferson Lab’s X17 search, testing it on simulated invariant-mass spectra with signal injected over a background scaled to a 40-day run, so the background is learned rather than fixed in advance.',
    result:
      'Developed a Gaussian-process bump-hunting package for Jefferson Lab’s X17 search ahead of its 2026 run; presented the study at the APS Far West Section meeting at UC Santa Cruz.',
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
      'Can a single night of ground-based differential CCD photometry recover the known 1051-second superhump of AM CVn?',
    method:
      'Took 140 V-band CCD images of AM CVn in a single 111-minute observation, calibrated them, and performed differential photometry against AAVSO comparison stars.',
    result:
      'Recovered the known 1051-second superhump signal, caused by tidal interactions and the precession of AM CVn’s helium-rich accretion disc.',
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
