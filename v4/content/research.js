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
      'Can unbinned machine-learning unfolding reproduce MINERvA’s published neutrino cross sections and extend them to more observables than binned methods can handle?',
    method:
      'Unfolding MINERvA inclusive charged-current data with OmniFold: reproducing the published double-differential muon-momentum cross section, then adding available energy, three-momentum transfer and hadronic invariant mass, with closure tests, systematic universes, bootstrap resampling and event-generator comparisons.',
    result:
      'Reproduced the published double-differential cross section (total-cross-section ratio 1.011; 95.6% of 205 bins within 10%), with a 6.87% median per-bin uncertainty built from 187 systematic universes plus statistical and machine-learning components. The five-observable unfolding passes closure checks, and its uncertainties are still being worked through before it can be quoted as a measurement. Presented at a MINERvA collaboration meeting in July 2026; a paper is in preparation.',
    tags: Object.freeze([
      'OmniFold',
      'MINERvA',
      'neutrino physics',
      'unbinned unfolding',
      'statistical inference',
    ]),
    links: Object.freeze([
      Object.freeze({
        label: 'Physics 191 review (PDF, March 2026)',
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
    id: 'ligo-interferometry',
    title: 'Gaussian-beam interferometry for focal-length measurement',
    role: 'Research Intern',
    venue: 'Caltech LIGO Laboratory',
    period: '2023',
    current: false,
    question:
      'Can the interference pattern of two Gaussian laser beams be used to infer a mirror’s focal length?',
    method:
      'Modeled a Michelson interferometer with one flat and one concave mirror in Python, using ABCD ray-transfer matrices, the complex beam parameter and Gouy phase, and detected fringe centroids in a single interference photograph.',
    result:
      'Recovered 98.3 mm for a known 100.0 mm lens, and documented the method in LIGO technical note LIGO-T2300319.',
    tags: Object.freeze([
      'LIGO',
      'interferometry',
      'Gaussian beams',
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
