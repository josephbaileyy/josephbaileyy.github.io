export interface PanelContent {
  kicker: string;
  title: string;
  html: string;
}

export const PANELS: Record<string, PanelContent> = {
  'am-cvn': {
    kicker: 'observational astrophysics · physics 100',
    title: 'AM CVn — time-series photometry',
    html: `
      <p>
        AM Canum Venaticorum is an <strong>ultracompact binary</strong>: a white dwarf
        accreting helium-rich material from a degenerate companion in an orbit of just
        <strong>5&ndash;65 minutes</strong>. Systems like it are among the strongest known
        sources of <strong>millihertz gravitational waves</strong> &mdash; "verification
        binaries" the LISA mission is guaranteed to detect.
      </p>
      <p>
        For <em>Physics 100: Introduction to Observational Astrophysics</em> (Spring 2026) I
        ran physically-motivated time-series photometry on AM CVn itself. I reduced
        <strong>140 V-band CCD images</strong> with bias, dark, and star-masked flat-field
        calibration, then performed AAVSO-sequence differential photometry on the 138 retained
        exposures.
      </p>
      <p>
        The light curve recovered AM CVn variability consistent with the known
        <strong>1051&nbsp;s positive-superhump / harmonic family</strong>, and I assessed
        whether the 111-minute observing baseline could meaningfully refine published period
        constraints.
      </p>
    `,
  },
  research: {
    kicker: 'research · ai for fundamental physics',
    title: 'Particle & neutrino physics',
    html: `
      <p>
        My main research is <strong>machine learning for fundamental physics</strong> &mdash;
        turning AI into a calibrated, trustworthy measurement instrument.
      </p>
      <ul>
        <li>
          <strong>Neutrino cross-section unfolding</strong> with Prof.
          <strong>Benjamin Nachman</strong> (Stanford, 2026&ndash;present). I'm implementing and
          evaluating <strong>OmniFold</strong>, an unbinned ML unfolding framework, on MINERvA
          neutrino-scattering data &mdash; benchmarking it against iterative Bayesian unfolding
          via closure tests, generator stress tests, bootstrap resampling, and bias&ndash;variance
          analysis. The question: can high-dimensional unbinned unfolding cut structural model
          bias in the few-GeV regime? Toward an honors thesis and manuscript; supported by a
          <strong>2026 Stanford Major Grant</strong>.
        </li>
        <li>
          <strong>SLAC National Accelerator Laboratory</strong> (2024&ndash;present). On a
          four-person team proposing a &gamma;&gamma; collider, using Delphes, ROOT, and Unix HPC
          to simulate and analyze terabytes of collider data, applying ML to study pileup effects
          on di-Higgs detection.
        </li>
        <li>
          <strong>Jefferson Lab</strong> (2025). Gaussian-process regression to hunt for bumps
          from the hypothetical <strong>X17</strong> particle &mdash; presented at the APS Far
          West Section meeting, UC Santa Cruz.
        </li>
        <li>
          <strong>Caltech LIGO Lab</strong> (2023). Simulation, testing, and prep of suspension
          elements, plus laser-beam interferometry experiments and Python analysis.
        </li>
      </ul>
    `,
  },
  projects: {
    kicker: 'projects · ml, systems & security',
    title: 'Things I’ve built',
    html: `
      <ul>
        <li>
          <strong>This website</strong> &mdash; a Powers-of-Ten zoom from the Milky Way to my
          desk. TypeScript + Three.js, real star catalog, live Earth terminator.
          <a href="https://github.com/josephbaileyy/josephbaileyy.github.io" target="_blank" rel="noopener">source</a>
        </li>
        <li>
          <strong>SPLoRA</strong> &mdash; parameter-efficient GPT-2 fine-tuning with LoRA for
          paraphrase detection and sonnet generation: 0.888 dev accuracy training ~1% of params,
          41.94 chrF.
          <a href="https://github.com/josephbaileyy/splora" target="_blank" rel="noopener">github</a>
        </li>
        <li>
          <strong>MINERvA-OmniFold</strong> &mdash; unbinned ML unfolding of neutrino
          cross-sections (the research above, in code).
          <a href="https://github.com/josephbaileyy/MINERvA-OmniFold" target="_blank" rel="noopener">github</a>
        </li>
        <li>
          <strong>LoRD</strong> &mdash; video person re-identification with DINOv2/v3 vision
          backbones, LoRA, BNNeck, and temporal attention, on the MARS benchmark.
          <a href="https://github.com/anandkrishnan27/lord" target="_blank" rel="noopener">github</a>
        </li>
        <li>
          <strong>Soccer action prediction</strong> &mdash; modeling possessions as
          heterogeneous graphs (GraphSAGE + Relational Graph Transformer, PyG/RelBench).
          <a href="https://github.com/josephbaileyy/cs-224w-project" target="_blank" rel="noopener">github</a>
        </li>
        <li>
          <strong>Systems &amp; security</strong> &mdash; an on-chain Ethereum wallet (Solidity +
          Foundry, 2-of-3 multisig), an end-to-end encrypted chat client (Double Ratchet), and
          Pintos OS enhancements (scheduling, syscalls, virtual memory).
        </li>
      </ul>
    `,
  },
};
