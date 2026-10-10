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
      <p>Move the slider and compare the middle panel with the target on the right. The measured data stay fixed.</p>
      <div data-demo-view hidden>
        <div class="unfolding-comparison">
          <figure><canvas data-measured role="img" aria-label="Fixed synthetic measured data"></canvas><figcaption>Measured data <span>Fixed, after detector smearing</span></figcaption></figure>
          <figure><canvas data-unfolded role="img" aria-label="Current estimate before reweighting"></canvas><figcaption>Current estimate <span data-result-caption>Starting simulation</span></figcaption></figure>
          <figure><canvas data-truth role="img" aria-label="Known target in this synthetic example"></canvas><figcaption>Toy target <span>Known here for comparison</span></figcaption></figure>
        </div>
        <div class="simple-demo-controls">
          <label for="unfolding-iteration">Reweighting step <output id="unfolding-iteration-value" for="unfolding-iteration">0</output></label>
          <input id="unfolding-iteration" type="range" min="0" max="20" step="1" value="0">
          <p class="demo-insight" data-demo-insight role="status">At step 0, the estimate is just the starting simulation.</p>
        </div>
        <details class="explanation record-details"><summary>Change the starting simulation</summary><div class="explanation-body demo-controls">
          <fieldset><legend>Starting simulation</legend><label><input type="radio" name="unfolding-prior" value="y2024" checked> A different photo of me</label><label><input type="radio" name="unfolding-prior" value="uniform"> Uniform density</label></fieldset>
          <p>Switch to uniform density to see how the estimate depends on its starting point. Reweighting changes how much each simulated point counts; no point moves.</p>
          <p>Effective sample size: <output data-ess>100%</output>. This measures how concentrated the weights are, not accuracy.</p>
        </div></details>
      </div>
      <p class="demo-status" role="status" data-demo-status>The interactive example loads when opened.</p>
      <button class="text-button" type="button" data-demo-retry hidden>Try loading the example again</button>
      <noscript><p>The interactive example needs JavaScript. The visual explanation above works without it.</p></noscript>
      <p class="limitations">Synthetic point patterns from two photos, not neutrino data or image restoration. All panels use the same dot-area scale, with the largest dots capped. Smoothed histogram ratios stand in for learned classifiers; no acceptance losses, backgrounds, or uncertainty bands are modeled. More steps need not mean a better estimate.</p>
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

function projectList(items) {
  const descriptions = {
    splora: 'Fine-tuning language models using about 1% of their parameters.',
    lord: 'Recognizing the same person across video from different cameras.',
    'soccer-gnn': 'Predicting the next action in a soccer match with graph neural networks.',
    'prior-personal-site': 'An interactive journey from the Milky Way to a desk.',
    'minerva-omnifold-pipeline': 'The code behind my neutrino-unfolding research.',
    'lol-match-prediction': 'Predicting professional League of Legends match outcomes.',
    'systems-security': 'Projects in encrypted chat, smart contracts, and operating systems.',
  };
  return `<ul class="work-list">${items
    .map(
      (item) => `<li><article id="${item.id}">
    <header class="entry-heading"><h3>${item.links.length ? link({ ...item.links[0], label: item.title }) : escape(item.title)}</h3></header>
    <p>${escape(descriptions[item.id])}</p>
    <details class="explanation record-details"><summary>Details and links</summary><div class="explanation-body"><p>${escape(item.work)}</p><p class="project-evidence">${escape(item.evidence)}</p>${links(item.links)}</div></details>
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
  return `<ul class="work-list">
    <li><article id="athletics"><header class="entry-heading"><h3>${link({ href: 'https://gostanford.com/sports/track-field/roster/player/joseph-bailey', label: 'Stanford Track & Field' })}</h3><p class="entry-date">ACC Championships, 2025</p></header>
      <p>I compete for Stanford Track &amp; Field in NCAA Division I. I ran 52.17 seconds at the 2025 ACC Championships.</p>
      <details class="explanation"><summary>Split times from that race</summary><div class="explanation-body">
        <figure>${raceFigure(intervals, 720)}${raceFigure(intervals, 320, true)}<figcaption>My real race: average speed between recorded hurdle touchdowns, using nominal hurdle distances. The first interval includes the start; the last runs from hurdle 10 to the finish. These are interval averages, not instantaneous speeds.</figcaption></figure>
        <p>The fastest interval was between hurdles 2 and 3, at 8.54 m/s. The 40-meter run-in took 5.91 seconds, averaging 6.77 m/s.</p>
        <details><summary>Recorded times and calculation</summary><div class="table-wrap"><table><caption>ACC Championships 2025. Speed = nominal interval distance ÷ elapsed interval time.</caption><thead><tr><th scope="col">Mark</th><th scope="col">Distance (m)</th><th scope="col">Time (s)</th><th scope="col">Mean speed (m/s)</th></tr></thead><tbody>${intervals.map((record) => `<tr><th scope="row">${record.mark}</th><td>${record.distanceM}</td><td>${record.cumulativeS.toFixed(2)}</td><td>${record.speed.toFixed(2)}</td></tr>`).join('')}</tbody></table></div></details>
        ${links([profile.links.find((item) => item.id === 'tfrrs-link'), { href: './data/acc-2025-400mh-splits.csv', label: 'Recorded splits (CSV)' }])}
      </div></details></article></li>
    <li><article id="music"><header class="entry-heading"><h3>Playing jazz and classical music</h3></header><p>I play piano, alto saxophone, flute, and clarinet. I completed MTAC Level 10 piano.</p></article></li>
  </ul>`;
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

function personalPhotos() {
  const selections = [
    { post: instagram.posts[2], caption: 'Stanford track & field' },
    { post: instagram.posts[1], caption: 'A rooftop at sunset' },
    { post: instagram.posts[3], caption: 'Out in the city' },
  ];
  return `<div class="personal-photos" aria-label="A few photos outside research">${selections
    .map(
      ({ post, caption }) => `<figure>
      <a href="https://www.instagram.com/p/${post.id}/" target="_blank" rel="noopener noreferrer" aria-label="${escape(caption)} — view Instagram post (opens in a new tab)">
        <img src="./img/instagram/${post.id}.jpg" alt="${escape(post.alt)}" width="640" height="800" loading="lazy">
      </a><figcaption>${escape(caption)}</figcaption>
    </figure>`,
    )
    .join('')}</div>`;
}

export function renderHome() {
  return `<header class="introduction" id="top">
    <div><h1>Joseph Bailey</h1>
      <p>I study physics and computer science at Stanford, and work on machine learning for fundamental physics.</p>
      <p class="intro-secondary">Currently: neutrino unfolding with Prof. Benjamin Nachman.</p>
      <p class="intro-personal">Outside research, I run the 400-meter hurdles for Stanford and play jazz and classical music.</p>
      <nav aria-label="Contact and profile links">${links([
        { ...profile.links.find((item) => item.id === 'resume-link'), label: 'CV (PDF)' },
        profile.links.find((item) => item.id === 'contact-link'),
        profile.links.find((item) => item.id === 'github-link'),
      ])}</nav>
      <nav class="page-index" aria-label="On this page"><a href="#research">Research</a><a href="#projects">Projects</a><a href="#experience">Experience</a><a href="#instruments">Outside research</a></nav>
    </div>
    ${instagramCarousel()}
  </header>
  <section id="research" aria-labelledby="research-heading"><h2 id="research-heading">Research</h2>${researchList()}</section>
  <section id="projects" aria-labelledby="projects-heading"><h2 id="projects-heading">Selected projects</h2>${projectList(projects.filter((item) => ['splora', 'lord', 'soccer-gnn'].includes(item.id)))}<details class="explanation more-projects" id="more-projects"><summary>More projects</summary><div class="explanation-body">${projectList(projects.filter((item) => !['splora', 'lord', 'soccer-gnn'].includes(item.id)))}</div></details></section>
  <section id="experience" aria-labelledby="experience-heading"><h2 id="experience-heading">Experience</h2>${experienceList()}</section>
  <section id="education" aria-labelledby="education-heading"><h2 id="education-heading">Education</h2><p>${escape(education.degree)}, ${escape(education.school)}. Expected June 2027.</p><details class="explanation"><summary>Coursework and honors</summary><div class="explanation-body"><p>Selected coursework: ${escape(education.coursework.join('; '))}.</p><p>Honors: ${escape(education.honors.join('; '))}.</p></div></details></section>
  <section id="instruments" aria-labelledby="instruments-heading"><h2 id="instruments-heading">Outside research</h2>${personalList()}${personalPhotos()}</section>
  <footer id="contact"><p>You can reach me at ${link({ href: `mailto:${profile.email}`, label: profile.email })}.</p><p>The earlier interactive collision chamber is still available in ${link({ href: './lab/', label: 'the lab' })}.</p><p><a href="#top">Back to the top</a></p></footer>`;
}
