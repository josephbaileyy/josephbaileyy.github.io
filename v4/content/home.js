import { readFileSync } from 'node:fs';

import { education } from './education.js';
import { renderCourseAtlas } from './course-atlas.js';
import { experience } from './experience.js';
import { instagram } from './instagram.js';
import { profile } from './profile.js';
import { notes } from './notes.js';
import { personal } from './personal.js';
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
    title: 'Neutrino unfolding with machine learning',
    brief:
      'With Prof. Benjamin Nachman, I’m testing how well machine learning can correct for detector effects in MINERvA neutrino data.',
    contribution:
      'I am implementing and evaluating OmniFold on MINERvA neutrino-scattering data with Prof. Benjamin Nachman, comparing it with iterative Bayesian unfolding through closure tests, generator stress tests, and bootstrap resampling.',
    evidence:
      'Work in progress: whether high-dimensional unbinned unfolding reduces structural model bias is the question under test.',
  },
  'x17-bump-hunting': {
    title: 'Searching for the hypothetical X17 particle',
    brief:
      'At Jefferson Lab, I used Gaussian processes to search for a possible particle signal amid background noise.',
    contribution:
      'At Jefferson Lab, I applied Gaussian-process regression to model invariant-mass backgrounds and search for localized excesses, then presented the study at the APS Far West Section meeting at UC Santa Cruz.',
  },
  'collider-ml-slac': {
    title: 'Machine learning for a proposed Higgs factory',
    brief: 'At SLAC, I studied how overlapping collisions affect the search for Higgs-boson pairs.',
    contribution:
      'At SLAC, I worked on a four-person XCC Higgs-factory proposal, analyzing simulation data with Delphes, ROOT, and HPC systems and developing machine-learning methods to study pileup effects.',
  },
  'am-cvn-photometry': {
    title: 'Measuring the variability of AM CVn',
    brief:
      'From telescope images, I recovered the star’s known roughly 17.5-minute brightness variation.',
    contribution:
      'For Stanford’s observational astrophysics course, I reduced 140 V-band CCD images and performed differential photometry on 138 retained exposures, recovering variability consistent with the known 1051-second positive-superhump family.',
  },
  'ligo-suspensions': {
    title: 'Interferometry at Caltech LIGO',
    brief:
      'I supported suspension testing and analyzed laser-interferometry experiments for gravitational-wave detectors.',
    contribution:
      'I supported suspension simulation and testing and conducted laser-beam interferometry experiments with Python analysis, documenting the work in a technical note.',
  },
};

function interactiveUnfolding() {
  return `<details class="explanation" id="unfolding-interactive" data-demo="unfolding">
    <summary>Try the interactive version</summary>
    <div class="explanation-body">
      <p>Watch OmniFold adjust the simulation to match measured data.</p>
      <div data-demo-view hidden>
        <div class="shared-unfolding" data-shared-demo>
          <div class="shared-toolbar"><label>Example <select data-shared-prior><option value="hurdler">Hurdler</option><option value="photo-intensity">Portrait</option></select></label><output data-shared-stage>Starting simulation</output></div>
          <div class="shared-portrait-grid">
            <p class="shared-level">Before the detector</p>
            <figure><canvas data-shared-estimate role="img" aria-label="Weighted simulation before detection"></canvas><figcaption>Estimate</figcaption></figure>
            <figure><canvas data-shared-reference role="img" aria-label="Reference truth, shown for comparison only"></canvas><figcaption>Reference truth <span>Never used by the algorithm</span></figcaption></figure>
            <p class="shared-level">After the detector</p>
            <figure><canvas data-shared-reco role="img" aria-label="Weighted simulation after detection"></canvas><figcaption>Simulation</figcaption></figure>
            <figure><canvas data-shared-data role="img" aria-label="Fixed synthetic measured distribution"></canvas><figcaption>Measured data</figcaption></figure>
          </div>
          <div class="shared-playback"><button type="button" data-shared-play>Play</button><div class="shared-timeline"><label for="unfolding-iteration">Iteration <output data-shared-iteration-value>0 / 12</output></label><input id="unfolding-iteration" data-shared-iteration type="range" min="0" max="12" step="1" value="0"></div></div>
          <p class="demo-status" data-shared-loading role="status" hidden></p>
          <button type="button" class="text-button" data-shared-settings-retry hidden>Try again</button>
          <details class="shared-method"><summary>How it works</summary><p>Only the event weights change. One classifier compares simulation with measured data after the detector. Its weights are carried to the simulated truth partners. A second classifier learns weights from the truth features, then sends them forward for the next iteration. The reference truth is shown only for comparison.</p><p data-shared-method-example></p><p>These are synthetic distributions, not photo restoration or MINERvA data. The browser replays trained neural-network weights. All four images share a fixed display scale and smoothing filter; the reference never alters the estimate. Acceptance losses, backgrounds, and uncertainties are omitted.</p></details>
        </div>
      </div>
      <p class="demo-status" role="status" data-demo-status>The interactive example loads when opened.</p>
      <button class="text-button" type="button" data-demo-retry hidden>Try again</button>
      <noscript><p>The interactive example needs JavaScript. The visual explanation above works without it.</p></noscript>
    </div>
  </details>`;
}

function unfoldDisclosure() {
  const stages = [
    {
      title: '1. Underlying physics',
      description: 'The distribution we want to measure.',
      color: '#373833',
      values: [1, 2, 5, 13, 32, 65, 91, 65, 32, 13, 5, 2, 1],
    },
    {
      title: '2. Detector measurement',
      description: 'Detector effects spread and distort it.',
      color: '#98795a',
      values: [4, 8, 16, 27, 41, 51, 56, 51, 41, 27, 16, 8, 4],
    },
    {
      title: '3. Unfolded estimate',
      description: 'Simulation helps estimate the original shape.',
      color: '#294a83',
      values: [1, 3, 7, 17, 34, 61, 83, 61, 34, 17, 7, 3, 1],
    },
  ];
  return `<details class="explanation" id="unfolding-explanation">
    <summary>What is unfolding?</summary>
    <div class="explanation-body unfolding-explainer">
      <p class="unfolding-takeaway">Estimate the physics before the detector changes what we see.</p>
      <figure>
        <div class="unfolding-story">${stages
          .map(
            (stage) => `<div>
          <h4>${stage.title}</h4>
          <svg viewBox="0 0 240 150" role="img" aria-label="${stage.description}">
            <path d="M20 16V124H227" fill="none" stroke="#dedbd3"/>
            ${stage.values.map((value, i) => `<rect x="${24 + i * 15}" y="${124 - value}" width="12" height="${value}" rx="1" fill="${stage.color}"/>`).join('')}
            <text x="124" y="145" text-anchor="middle">Particle energy →</text>
          </svg>
          <p>${stage.description}</p>
        </div>`,
          )
          .join('')}</div>
        <figcaption>A schematic of detector smearing and unfolding, not MINERvA data. All panels share the same scale; the estimate is approximate.</figcaption>
      </figure>
      <p>OmniFold changes how much each simulated event counts, using its paired descriptions before and after detection. Those weights are learned by comparing simulation with measured data.</p>
      <p class="limitations">The starting simulation and detector model matter. The result is an estimate with uncertainties; individual measured events do not get their original values back.</p>
      <p class="method-link">${link({ href: 'https://arxiv.org/abs/1911.09107', label: 'Read the OmniFold method' })}</p>
      ${interactiveUnfolding()}
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
      <header class="entry-heading"><h3>${link({ ...evidence[0], label: copy.title })}</h3><p class="entry-date">${escape(item.period)}</p></header>
      <p>${escape(copy.brief)}</p>
      <details class="explanation record-details"><summary>Details and links</summary><div class="explanation-body">
        <p>${escape(copy.contribution)}</p>
        ${copy.evidence ? `<p class="research-status">${escape(copy.evidence)}</p>` : ''}
        ${links(evidence)}
        ${id === 'am-cvn-photometry' ? `<figure class="explanation-body"><img class="research-figure" src="./img/home/amcvn-fit.png" alt="AM CVn V-band differential-photometry light curve with a double-wave fit near a 1050-second period" width="1180" height="270" loading="lazy"><figcaption>Observed differential photometry and the fitted model from my PHYSICS 100 project, spring 2026. The fit is not an independent measurement of every feature in the light curve.</figcaption></figure>` : ''}
      </div></details>
      ${id === 'minerva-omnifold' ? unfoldDisclosure() : ''}
    </article></li>`;
    })
    .join('')}</ul>`;
}

function projectList(items, featured = false) {
  const descriptions = {
    splora: 'Fine-tuning language models using about 1% of their parameters.',
    lord: 'Recognizing the same person across video from different cameras.',
    'soccer-gnn': 'Predicting the next action in a soccer match with graph neural networks.',
    'minerva-omnifold-pipeline': 'The code behind my neutrino-unfolding research.',
    'lol-match-prediction': 'Predicting professional League of Legends match outcomes.',
    'systems-security': 'Projects in encrypted chat, smart contracts, and operating systems.',
  };
  return `<ul class="work-list${featured ? ' project-grid' : ''}">${items
    .map(
      (item) => `<li><article id="${item.id}"${featured ? ' class="project-card"' : ''}>
    ${featured ? projectPreview(item) : ''}
    <div class="project-copy"><header class="entry-heading"><h3>${item.links.length ? link({ ...item.links[0], label: item.title }) : escape(item.title)}</h3></header>
    <p>${escape(descriptions[item.id])}</p>
    <details class="explanation record-details"><summary>Details and links</summary><div class="explanation-body"><p>${escape(item.work)}</p><p class="project-evidence">${escape(item.evidence)}</p>${links(item.links)}</div></details></div>
  </article></li>`,
    )
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
  return `<div class="personal-grid">
    <article class="life-card track-card" id="athletics">
      <a class="life-photo" href="https://gostanford.com/sports/track-field/roster/player/joseph-bailey" target="_blank" rel="noopener noreferrer" aria-label="Joseph’s Stanford Track & Field profile">
        <img src="./img/home/track-start.png" alt="Joseph in his Stanford uniform at the start line against a red backdrop" width="1672" height="941" loading="lazy">
        <span class="race-stamp"><strong>52.17</strong><span>400 m hurdles · ACC 2025</span></span>
      </a>
      <div class="life-copy"><h3>One lap. Ten hurdles.</h3>
        <p>I compete in the 400-meter hurdles for Stanford Track &amp; Field in NCAA Division I. I ran 52.17 seconds at the 2025 ACC Championships.</p>
        <details class="explanation"><summary>Split times from that race</summary><div class="explanation-body">
        <figure>${raceFigure(intervals, 720)}${raceFigure(intervals, 320, true)}<figcaption>My real race: average speed between recorded hurdle touchdowns, using nominal hurdle distances. The first interval includes the start; the last runs from hurdle 10 to the finish. These are interval averages, not instantaneous speeds.</figcaption></figure>
        <p>The fastest interval was between hurdles 2 and 3, at 8.54 m/s. The 40-meter run-in took 5.91 seconds, averaging 6.77 m/s.</p>
        <details><summary>Recorded times and calculation</summary><div class="table-wrap"><table><caption>ACC Championships 2025. Speed = nominal interval distance ÷ elapsed interval time.</caption><thead><tr><th scope="col">Mark</th><th scope="col">Distance (m)</th><th scope="col">Time (s)</th><th scope="col">Mean speed (m/s)</th></tr></thead><tbody>${intervals.map((record) => `<tr><th scope="row">${record.mark}</th><td>${record.distanceM}</td><td>${record.cumulativeS.toFixed(2)}</td><td>${record.speed.toFixed(2)}</td></tr>`).join('')}</tbody></table></div></details>
        ${links([profile.links.find((item) => item.id === 'tfrrs-link'), { href: './data/acc-2025-400mh-splits.csv', label: 'Recorded splits (CSV)' }])}
      </div></details>
        <p class="card-link">${link({ href: 'https://gostanford.com/sports/track-field/roster/player/joseph-bailey', label: 'Stanford Track & Field ↗' })}</p>
      </div>
    </article>
    <article class="life-card music-card" id="music">
      <div class="music-visual" aria-hidden="true"><span class="music-symbol">♮</span><span class="music-word">a little<br><em>jazz &amp; classical.</em></span>
        <div class="piano-keys">${Array.from({ length: 14 }, (_, i) => `<span${[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].includes(i) ? ' class="has-sharp"' : ''}></span>`).join('')}</div>
      </div>
      <div class="life-copy"><h3>Music, between everything else.</h3><p>${escape(personal.music)}</p><p class="card-link"><a class="personal-link music-link" href="${personal.saxUrl}" target="_blank" rel="noopener noreferrer">${escape(personal.saxCaption)} ↗</a></p>
        <figure class="piano-recording"><figcaption><strong>${escape(personal.piano.composer)} · ${escape(personal.piano.title)}</strong><span>${escape(personal.piano.collection)}</span></figcaption><audio controls preload="none" aria-label="Joseph performing Bach’s Fugue No. 2 in C minor, BWV 847"><source src="${personal.piano.src}" type="audio/mp4"><a href="${personal.piano.src}">Listen to the piano recording</a></audio></figure>
        <ul class="instrument-tags" aria-label="Instruments"><li>Piano</li><li>Alto saxophone</li><li>Flute</li><li>Clarinet</li></ul>
      </div>
    </article>
  </div>`;
}

function experienceList() {
  const brief = {
    wisdomtree:
      'Product management and research for WisdomTree Connect, an institutional digital-assets platform.',
    polytec: 'Statistical tools for vibration analysis and 3D-printed laboratory equipment.',
  };
  return `<ul class="work-list">${experience
    .map(
      (item) => `<li><article id="${item.id}">
    <header class="entry-heading"><h3>${escape(item.role)} at ${item.id === 'wisdomtree' ? 'WisdomTree' : escape(item.org)}</h3><p class="entry-date">${escape(item.period)}</p></header>
    <p>${escape(brief[item.id])}</p>
    <details class="explanation record-details"><summary>Details</summary><div class="explanation-body"><p>${escape(item.summary)}</p></div></details>
  </article></li>`,
    )
    .join('')}</ul>`;
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

function projectPreview(item) {
  if (item.id === 'splora')
    return `<a class="project-preview preview-splora" href="./papers/splora-poster.pdf" target="_blank" rel="noopener noreferrer" aria-label="View SPLoRA project poster"><img src="./img/projects/splora-chart.webp" alt="Chart from the SPLoRA poster comparing paraphrase detection accuracy across LoRA adapter placements" width="735" height="610" loading="lazy"><span class="preview-caption">From the project poster ↗</span></a>`;
  if (item.id === 'lord')
    return `<a class="project-preview preview-lord" href="./papers/lord-poster.pdf" target="_blank" rel="noopener noreferrer" aria-label="View LoRD project poster"><img src="./img/projects/lord-architecture.svg" alt="LoRD architecture in two rows: tracklet frames pass through DINO to CLS features, then temporal aggregation, BNNeck, and cosine retrieval" width="360" height="230" loading="lazy"><span class="preview-caption">Architecture from the poster ↗</span></a>`;
  return `<a class="project-preview preview-soccer" href="${escape(item.links[0].href)}" target="_blank" rel="noopener noreferrer" aria-label="View soccer graph neural network project on GitHub"><svg viewBox="0 0 360 210" role="img" aria-label="Illustrative graph connecting players on a soccer pitch"><rect x="18" y="25" width="324" height="162" rx="2" fill="none" stroke="#b7c9b6"/><path d="M180 25v162M18 69h44v73H18m324-73h-44v73h44" fill="none" stroke="#b7c9b6"/><circle cx="180" cy="106" r="28" fill="none" stroke="#b7c9b6"/><path d="M82 113 123 67 172 126 218 73 282 112M82 113l90 13 110-14M123 67l95 6M172 126l60 37" fill="none" stroke="#436448" stroke-width="1.5" stroke-dasharray="4 4"/>${[
    [82, 113],
    [123, 67],
    [172, 126],
    [218, 73],
    [282, 112],
    [232, 163],
  ]
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="7" fill="#436448" stroke="#f2f6ef" stroke-width="3"/>`,
    )
    .join(
      '',
    )}<path d="m177 126 36-9m-7-4 7 4-5 6" fill="none" stroke="#b56539" stroke-width="3"/></svg><span class="preview-caption">An illustrative possession graph ↗</span></a>`;
}

export function siteNavigation(active = 'home', prefix = './') {
  return `<nav class="site-nav" aria-label="Main navigation"><a class="site-name" href="${prefix}"${active === 'home' ? ' aria-current="page"' : ''}>Joseph Bailey<span class="name-dot" aria-hidden="true">·</span></a><div>${[
    ['home', 'Home', ''],
    ['about', 'About', 'about.html'],
  ]
    .map(
      ([id, label, href]) =>
        `<a href="${prefix}${href}"${active === id ? ' aria-current="page"' : ''}>${label}</a>`,
    )
    .join(
      '',
    )}<a href="${prefix}resume.pdf" target="_blank" rel="noopener noreferrer">CV ↗</a></div></nav>`;
}

export function siteFooter(prefix = './') {
  return `<footer id="contact"><div><p>Research, ideas, or a good conversation.</p><p>${link({ href: `mailto:${profile.email}`, label: profile.email })}</p></div><nav aria-label="More links">${link(profile.links.find((item) => item.id === 'github-link'))}<a href="${prefix}lab/">Visit the lab ↗</a><a href="#top">Back to top ↑</a></nav></footer>`;
}

function noteList(prefix = './notes/', limit = notes.length) {
  return `<ul class="note-list">${notes
    .slice(0, limit)
    .map(
      (note) =>
        `<li><a href="${prefix}${escape(note.slug)}.html"><div><h3>${escape(note.title)}</h3><p>${escape(note.summary)}</p></div><time datetime="${escape(note.date)}">${new Date(`${note.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}<span aria-hidden="true"> ↗</span></time></a></li>`,
    )
    .join('')}</ul>`;
}

export function renderHome() {
  const featured = ['splora', 'lord', 'soccer-gnn'];
  return `${siteNavigation()}<header class="introduction" id="top">
    <div class="intro-copy"><h1>Hi, I’m <em>Joseph.</em></h1>
      <p class="intro-lead">${escape(personal.introduction)}</p><p class="intro-personal">${escape(
        personal.outside,
      )
        .replace(
          '{track}',
          `<a class="personal-link track-link" href="${personal.trackUrl}" target="_blank" rel="noopener noreferrer">400m hurdler</a>`,
        )
        .replace(
          '{sax}',
          `<a class="personal-link music-link" href="${personal.saxUrl}" target="_blank" rel="noopener noreferrer" aria-label="Watch my sax solo in the Chino Hills HS 2023 indoor drumline show">variety of ensembles</a>`,
        )}</p>
      <nav aria-label="Contact and profile links">${links([{ ...profile.links.find((item) => item.id === 'resume-link'), label: 'CV (PDF)' }, profile.links.find((item) => item.id === 'contact-link'), profile.links.find((item) => item.id === 'github-link')])}</nav>
      <p class="currently"><span class="status-dot" aria-hidden="true"></span><span>Currently exploring neutrino unfolding<br>with Prof. Benjamin Nachman.</span></p>
    </div>
    ${instagramCarousel()}
  </header>
  <nav class="page-index" aria-label="On this page"><a href="#research">Research</a><a href="#projects">Projects</a><a href="#instruments">Hobbies</a></nav>
  <section id="research" aria-labelledby="research-heading"><div class="section-heading"><div><h2 id="research-heading">Research</h2></div><a href="./about.html">A little more about me ↗</a></div>${researchList()}</section>
  <section id="projects" aria-labelledby="projects-heading"><div class="section-heading"><div><h2 id="projects-heading">Selected projects</h2></div><span class="section-aside">Code, experiments &amp; what I learned</span></div>${projectList(
    projects.filter((item) => featured.includes(item.id)),
    true,
  )}<details class="explanation more-projects" id="more-projects"><summary>More projects</summary><div class="explanation-body">${projectList(projects.filter((item) => !featured.includes(item.id)))}</div></details></section>
  <section id="instruments" aria-labelledby="instruments-heading"><div class="section-heading"><div><h2 id="instruments-heading">Hobbies</h2></div></div>${personalList()}</section>
  ${siteFooter()}`;
}

export function renderAbout() {
  return `${siteNavigation('about')}<header class="page-header" id="top"><h1>Curiosity, <em>in a few directions.</em></h1><p class="intro-lead">${escape(profile.statement)}</p><p>I also run the 400-meter hurdles for Stanford and play jazz and classical music.</p><p>${link({ ...profile.links.find((item) => item.id === 'resume-link'), label: 'Download my CV ↗' })}</p></header>
    <section id="experience" aria-labelledby="experience-heading"><h2 id="experience-heading">Experience</h2>${experienceList()}</section>
    <section id="education" aria-labelledby="education-heading"><h2 id="education-heading">Education</h2><p>${escape(education.degree)}, ${escape(education.school)}. Expected June 2027.</p>${renderCourseAtlas()}<div class="about-honors"><h3>Honors</h3><ul>${education.honors.map((item) => `<li>${escape(item)}</li>`).join('')}</ul></div></section>
    <section><p><a href="./#research">Research</a> · <a href="./#instruments">Track and music</a> · <a href="./lab/">The interactive lab</a></p></section>${siteFooter()}`;
}

export function renderNotes(slug) {
  const note = slug ? notes.find((item) => item.slug === slug) : null;
  if (slug && !note) throw new Error(`Unknown note: ${slug}`);
  return `${siteNavigation('notes', '../')}${note ? `<article class="note-article" id="top"><header class="page-header"><p class="note-back"><a href="./">← All notes</a></p><h1>${escape(note.title)}</h1><p class="note-meta"><time datetime="${escape(note.date)}">${escape(note.date)}</time> · Joseph Bailey</p></header>${slug === 'how-this-site-works' ? '<aside class="archive-note">From the archive: this describes the earlier universe version of my website.</aside>' : ''}<div class="note-body">${note.html}</div></article>` : `<header class="page-header" id="top"><h1>Things I’m <em>figuring out.</em></h1><p class="intro-lead">Notes on physics, machine learning, and building things.</p></header>${noteList('./')}`}${siteFooter('../')}`;
}
