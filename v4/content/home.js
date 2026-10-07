import { readFileSync } from 'node:fs';

import { education } from './education.js';
import { experience } from './experience.js';
import { instagram } from './instagram.js';
import { profile } from './profile.js';
import { projects } from './projects.js';
import { research } from './research.js';

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character],
  );

function link({ href, label }) {
  const external = /^https?:/.test(href) || /\.pdf$/.test(href);
  return `<a href="${escape(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(label)}</a>`;
}

function links(items) {
  return `<ul class="evidence-links">${items.map((item) => `<li>${link(item)}</li>`).join('')}</ul>`;
}

const sentences = {
  'minerva-omnifold': {
    title: 'Unfolding neutrino cross sections with machine learning',
    contribution:
      'I am implementing and evaluating OmniFold on MINERvA neutrino-scattering data with Prof. Benjamin Nachman, comparing it with iterative Bayesian unfolding through closure tests, generator stress tests, and bootstrap resampling.',
    evidence:
      'Work in progress: whether high-dimensional unbinned unfolding reduces structural model bias is the question under test.',
  },
  'x17-bump-hunting': {
    title: 'Searching for the hypothetical X17 particle with Gaussian processes',
    contribution:
      'At Jefferson Lab, I applied Gaussian-process regression to model invariant-mass backgrounds and search for localized excesses, then presented the study at the APS Far West Section meeting at UC Santa Cruz.',
  },
  'collider-ml-slac': {
    title: 'Studying pileup and di-Higgs detection at a proposed γγ collider',
    contribution:
      'At SLAC, I worked on a four-person XCC Higgs-factory proposal, analyzing simulation data with Delphes, ROOT, and HPC systems and developing machine-learning methods to study pileup effects.',
  },
  'am-cvn-photometry': {
    title: 'Measuring the variability of AM CVn from CCD images',
    contribution:
      'For Stanford’s observational astrophysics course, I reduced 140 V-band CCD images and performed differential photometry on 138 retained exposures, recovering variability consistent with the known 1051-second positive-superhump family.',
  },
  'ligo-suspensions': {
    title: 'Testing suspension systems and laser interferometry at Caltech LIGO',
    contribution:
      'I supported suspension simulation and testing and conducted laser-beam interferometry experiments with Python analysis, documenting the work in a technical note.',
  },
};

function unfoldDisclosure() {
  return `<details class="explanation" id="unfolding-explanation" data-demo="unfolding">
    <summary>Explanation and demonstration</summary>
    <div class="explanation-body">
      <p>Unfolding estimates an underlying distribution from measurements distorted by a detector. OmniFold does this by reweighting simulated events, using their paired truth-level and reconstructed descriptions. It does not recover the true origin of each measured event.</p>
      <p>This is a synthetic, two-dimensional toy using densities derived from two photos of me. It illustrates dependence on the starting simulation; it is not a neutrino measurement or an image-restoration tool.</p>
      <div data-demo-view hidden>
        <div class="unfolding-layout">
          <figure class="unfolded-figure">
            <canvas data-unfolded role="img" aria-label="Synthetic toy: summed weights of simulated points in each display cell"></canvas>
            <figcaption data-result-caption>Starting simulation, before reweighting.</figcaption>
          </figure>
          <div class="demo-controls">
            <label for="unfolding-iteration">Iteration <output id="unfolding-iteration-value" for="unfolding-iteration">0</output></label>
            <input id="unfolding-iteration" type="range" min="0" max="20" step="1" value="0">
            <fieldset>
              <legend>Starting simulation</legend>
              <label><input type="radio" name="unfolding-prior" value="y2024" checked> My 2024 photo</label>
              <label><input type="radio" name="unfolding-prior" value="uniform"> Uniform density</label>
            </fieldset>
            <p class="demo-readout" aria-live="polite" aria-atomic="true">Effective sample size: <output data-ess>100%</output> of the 120,000 simulated points.</p>
            <p>Effective sample size describes how concentrated the weights are. It is not an accuracy score or an uncertainty estimate.</p>
            <div class="toy-comparison">
              <figure><canvas data-measured role="img" aria-label="Synthetic measured sample after Gaussian smearing"></canvas><figcaption>Synthetic measured data</figcaption></figure>
              <figure><canvas data-truth role="img" aria-label="Synthetic generating sample, initially hidden"></canvas><figcaption><button class="text-button" type="button" data-reveal-truth aria-pressed="false">Show synthetic truth</button></figcaption></figure>
            </div>
          </div>
        </div>
      </div>
      <p class="demo-status" role="status" data-demo-status>The interactive toy loads when this explanation is opened.</p>
      <button class="text-button" type="button" data-demo-retry hidden>Try loading the toy again</button>
      <noscript><p>The interactive toy needs JavaScript. The explanation and research links remain available.</p></noscript>
      <p>The synthetic data are 60,000 points sampled from a density derived from my 2025 photo and Gaussian-smeared with a width of 0.015 of the frame. The simulation contains 120,000 points sampled from my 2024 photo, or from a uniform density, with the same smearing. The data stay fixed when you switch simulations.</p>
      <p>Each iteration estimates a detector-level density ratio, carries the reweighting along the simulated event pairings, and estimates a truth-level ratio for the next iteration. No simulated point moves. Dot area represents summed simulation weight in each cell, with a fixed display scale across both priors and all iterations; the largest dots are capped.</p>
      <p>My hair changed between the photos. Where the starting simulation has few points, reweighting can concentrate weight on those few. The photo-based simulation also supplies structure before any iteration. More iterations can amplify fluctuations, so a sharper-looking result is not necessarily more accurate.</p>
      <p class="limitations">Simplifications: smoothed 128 × 128 histogram ratios replace learned classifiers; the display uses 96 × 96 cells. Smoothing regularizes the toy. The density has a small positive floor, so this demonstrates sparse coverage rather than an exact support gap. There are no missed events, acceptance cuts, backgrounds, or detector-model variations, and no uncertainty band is estimated.</p>
      <p>${link({ href: 'https://arxiv.org/abs/1911.09107', label: 'The OmniFold method' })} · ${link({ href: './papers/neutrino-unfolding.pdf', label: 'My MINERvA research write-up (PDF)' })}</p>
    </div>
  </details>`;
}

function researchList() {
  const order = [
    'minerva-omnifold',
    'x17-bump-hunting',
    'collider-ml-slac',
    'am-cvn-photometry',
    'ligo-suspensions',
  ];
  return `<ul class="work-list">${order
    .map((id) => {
      const item = research.find((record) => record.id === id);
      const copy = sentences[id];
      const evidence = [...item.links];
      if (id === 'minerva-omnifold') {
        evidence[0] = { ...evidence[0], label: 'Research write-up (PDF)' };
        evidence.push(
          projects.find((project) => project.id === 'minerva-omnifold-pipeline').links[0],
        );
      }
      return `<li><article id="${id}">
      <header class="entry-heading"><h3>${escape(copy.title)}</h3><p class="entry-date">${escape(item.period)}</p></header>
      <p>${escape(copy.contribution)}</p>
      ${copy.evidence ? `<p class="research-status">${escape(copy.evidence)}</p>` : ''}
      ${links(evidence)}
      ${id === 'minerva-omnifold' ? unfoldDisclosure() : ''}
      ${id === 'am-cvn-photometry' ? `<details class="explanation"><summary>Light curve and fit</summary><figure class="explanation-body"><img class="research-figure" src="./img/home/amcvn-fit.png" alt="AM CVn V-band differential-photometry light curve with a double-wave fit near a 1050-second period" width="1180" height="270" loading="lazy"><figcaption>Observed differential photometry and the fitted model from my PHYSICS 100 project, spring 2026. The fit is not an independent measurement of every feature in the light curve.</figcaption></figure></details>` : ''}
    </article></li>`;
    })
    .join('')}</ul>`;
}

export function raceIntervals(csv) {
  let previousDistance = 0;
  let previousTime = 0;
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [mark, distance, cumulative] = line.split(',');
      const distanceM = Number(distance);
      const cumulativeS = Number(cumulative);
      const record = {
        mark,
        distanceM,
        cumulativeS,
        startM: previousDistance,
        intervalS: cumulativeS - previousTime,
        speed: (distanceM - previousDistance) / (cumulativeS - previousTime),
      };
      previousDistance = distanceM;
      previousTime = cumulativeS;
      return record;
    });
}

function raceFigure(records, width, mobile = false) {
  const height = 230;
  const left = 44;
  const right = width - 24;
  const bottom = 185;
  const x = (distance) => left + (distance / 400) * (right - left);
  const y = (speed) => 38 + ((8.8 - speed) / 2.3) * (bottom - 38);
  const path = records
    .map(
      (record, i) =>
        `${i ? 'L' : 'M'}${x(record.startM).toFixed(2)},${y(record.speed).toFixed(2)}L${x(record.distanceM).toFixed(2)},${y(record.speed).toFixed(2)}`,
    )
    .join('');
  return `<svg class="race-plot ${mobile ? 'race-plot-mobile' : 'race-plot-desktop'}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Average speed between touchdowns at the 2025 ACC Championships: fastest between hurdles 2 and 3, 8.54 meters per second; final interval, 6.77 meters per second">
    <text x="0" y="19">Mean speed (m/s)</text>
    ${[7, 7.5, 8, 8.5].map((speed) => `<path class="plot-grid" d="M${left} ${y(speed)}H${right}"/><text x="${left - 8}" y="${y(speed) + 4}" text-anchor="end">${speed.toFixed(1)}</text>`).join('')}
    <path class="plot-line" d="${path}"/>
    ${records
      .filter((_, i) => !mobile || i % 2 === 0)
      .map(
        (record) =>
          `<text x="${x(record.distanceM)}" y="210" text-anchor="${record.mark === 'Finish' ? 'end' : 'middle'}">${record.mark}</text>`,
      )
      .join('')}
  </svg>`;
}

function personalList() {
  const csv = readFileSync(
    new URL('../public/data/acc-2025-400mh-splits.csv', import.meta.url),
    'utf8',
  );
  const intervals = raceIntervals(csv);
  return `<ul class="work-list">
    <li><article id="athletics"><header class="entry-heading"><h3>Running the 400-meter hurdles for Stanford</h3><p class="entry-date">ACC Championships, 2025</p></header>
      <p>I compete for Stanford Track &amp; Field in NCAA Division I. I ran 52.17 seconds at the 2025 ACC Championships.</p>
      ${links([profile.links.find((item) => item.id === 'tfrrs-link'), { href: 'https://gostanford.com/sports/track-field/roster/player/joseph-bailey', label: 'Stanford athlete profile' }])}
      <details class="explanation"><summary>Split times from that race</summary><div class="explanation-body">
        <figure>${raceFigure(intervals, 720)}${raceFigure(intervals, 320, true)}<figcaption>My real race: average speed between recorded hurdle touchdowns, using nominal hurdle distances. The first interval includes the start; the last runs from hurdle 10 to the finish. These are interval averages, not instantaneous speeds.</figcaption></figure>
        <p>The fastest interval was between hurdles 2 and 3, at 8.54 m/s. The 40-meter run-in took 5.91 seconds, averaging 6.77 m/s.</p>
        <details><summary>Recorded times and calculation</summary><div class="table-wrap"><table><caption>ACC Championships 2025. Speed = nominal interval distance ÷ elapsed interval time.</caption><thead><tr><th scope="col">Mark</th><th scope="col">Distance (m)</th><th scope="col">Time (s)</th><th scope="col">Mean speed (m/s)</th></tr></thead><tbody>${intervals.map((record) => `<tr><th scope="row">${record.mark}</th><td>${record.distanceM}</td><td>${record.cumulativeS.toFixed(2)}</td><td>${record.speed.toFixed(2)}</td></tr>`).join('')}</tbody></table></div></details>
        <p>${link({ href: './data/acc-2025-400mh-splits.csv', label: 'Recorded splits (CSV)' })}</p>
      </div></details></article></li>
    <li><article id="music"><header class="entry-heading"><h3>Playing jazz and classical music</h3></header><p>I play piano, alto saxophone, flute, and clarinet. I completed MTAC Level 10 piano.</p></article></li>
  </ul>`;
}

function instagramCarousel() {
  const icon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg>`;
  return `<aside class="instagram-card" data-instagram role="region" aria-roledescription="carousel" aria-label="Instagram posts by ${instagram.username}">
    <a class="instagram-profile" href="${instagram.profileUrl}" target="_blank" rel="noopener noreferrer" aria-label="View @${instagram.username} on Instagram (opens in a new tab)">
      <img class="instagram-avatar" src="${instagram.avatar}" alt="" width="32" height="32">
      <span><strong>@${instagram.username}</strong><span class="instagram-network">Instagram</span></span>${icon}
    </a>
    <div class="instagram-view">
      ${instagram.posts
        .map(
          (
            post,
            index,
          ) => `<div class="instagram-slide" data-instagram-slide data-post-date="${post.label}" role="group" aria-roledescription="slide" aria-label="Post ${index + 1} of ${instagram.posts.length}"${index ? ' hidden' : ''}>
        <a class="instagram-post" href="https://www.instagram.com/p/${post.id}/" target="_blank" rel="noopener noreferrer" aria-label="Open Instagram post from ${post.label} and view all photos (opens in a new tab)">
          <img src="./img/instagram/${post.id}.jpg" alt="${escape(post.alt)}" width="640" height="800"${index ? ' loading="lazy"' : ''}>
          <span class="instagram-album" aria-hidden="true"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="13" height="13" rx="2"/><path d="M8 20h10a2 2 0 0 0 2-2V8"/></svg></span>
        </a>
        <div class="instagram-caption"><time datetime="${post.date}">${post.label}</time><a href="https://www.instagram.com/p/${post.id}/" target="_blank" rel="noopener noreferrer">View post ↗</a></div>
      </div>`,
        )
        .join('')}
      <div class="instagram-arrows" data-instagram-controls hidden>
        <button type="button" class="instagram-prev" data-instagram-prev aria-label="Previous Instagram post"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button>
        <button type="button" class="instagram-next" data-instagram-next aria-label="Next Instagram post"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>
      </div>
    </div>
    <div class="instagram-pagination" data-instagram-controls hidden>
      <span class="instagram-dots" aria-hidden="true">${instagram.posts.map((_, index) => `<span data-instagram-dot${index === 0 ? ' class="is-active"' : ''}></span>`).join('')}</span>
      <span data-instagram-count aria-hidden="true">1 / ${instagram.posts.length}</span>
    </div>
    <p class="visually-hidden" data-instagram-status role="status" aria-atomic="true"></p>
  </aside>`;
}

export function renderHome() {
  return `<header class="introduction" id="top">
    <div><h1>Joseph Bailey</h1>
      <p>I’m a coterminal physics B.S. and computer science M.S. (AI track) student at Stanford, graduating in June 2027. I work on machine learning for fundamental physics, currently on neutrino unfolding with Prof. Benjamin Nachman.</p>
      <nav aria-label="Contact and profile links">${links([
        { ...profile.links.find((item) => item.id === 'resume-link'), label: 'CV (PDF)' },
        profile.links.find((item) => item.id === 'contact-link'),
        profile.links.find((item) => item.id === 'github-link'),
        {
          href: 'https://gostanford.com/sports/track-field/roster/player/joseph-bailey',
          label: 'Stanford Track',
        },
      ])}</nav>
      <nav class="page-index" aria-label="On this page"><a href="#research">Research</a><a href="#projects">Projects</a><a href="#experience">Experience</a><a href="#instruments">Outside research</a></nav>
    </div>
    ${instagramCarousel()}
  </header>
  <section id="research" aria-labelledby="research-heading"><h2 id="research-heading">Research</h2>${researchList()}</section>
  <section id="projects" aria-labelledby="projects-heading"><h2 id="projects-heading">Code and other projects</h2><ul class="work-list">${projects.map((item) => `<li><article id="${item.id}"><header class="entry-heading"><h3>${escape(item.title === 'prior-personal-site' ? 'Earlier versions of this website' : item.title)}</h3></header><p>${escape(item.work)}</p><p class="project-evidence">${escape(item.evidence)}</p>${links(item.links)}</article></li>`).join('')}</ul></section>
  <section id="experience" aria-labelledby="experience-heading"><h2 id="experience-heading">Experience</h2><ul class="work-list">${experience.map((item) => `<li><article id="${item.id}"><header class="entry-heading"><h3>${escape(item.role)} at ${escape(item.org)}</h3><p class="entry-date">${escape(item.period)}</p></header><p>${escape(item.summary)}</p></article></li>`).join('')}</ul></section>
  <section id="education" aria-labelledby="education-heading"><h2 id="education-heading">Education</h2><p>${escape(education.degree)}, ${escape(education.school)}. Expected June 2027.</p><details class="explanation"><summary>Coursework and honors</summary><div class="explanation-body"><p>Selected coursework: ${escape(education.coursework.join('; '))}.</p><p>Honors: ${escape(education.honors.join('; '))}.</p></div></details></section>
  <section id="instruments" aria-labelledby="instruments-heading"><h2 id="instruments-heading">Outside research</h2>${personalList()}</section>
  <footer id="contact"><p>You can reach me at ${link({ href: `mailto:${profile.email}`, label: profile.email })}.</p><p>The earlier interactive collision chamber is still available in ${link({ href: './lab/', label: 'the lab' })}.</p><p><a href="#top">Back to the top</a></p></footer>`;
}
