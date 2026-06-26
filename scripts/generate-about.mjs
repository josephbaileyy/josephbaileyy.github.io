import { readFile, writeFile } from 'node:fs/promises';

const portfolio = JSON.parse(
  await readFile(new URL('../src/content/portfolio.json', import.meta.url), 'utf8'),
);
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char],
  );
const externalAttrs = (href) =>
  href.startsWith('http') || href.endsWith('.pdf') ? ' target="_blank" rel="noopener"' : '';
const itemLinks = (item) => [
  ...(item.href ? [{ label: item.linkLabel ?? 'Open', href: item.href }] : []),
  ...(item.links ?? []),
];
const cards = (items) =>
  items
    .map((item) => {
      const links = itemLinks(item)
        .map(
          (l) =>
            ` <a href="${escapeHtml(l.href)}"${externalAttrs(l.href)}>${escapeHtml(l.label)}</a>`,
        )
        .join('');
      const evidence =
        item.featured && item.challenge && item.contribution && item.outcome
          ? `<dl class="evidence"><div><dt>Signal</dt><dd>${escapeHtml(item.challenge)}</dd></div><div><dt>Work</dt><dd>${escapeHtml(item.contribution)}</dd></div><div><dt>Evidence</dt><dd>${escapeHtml(item.outcome)}</dd></div></dl>${item.tools?.length ? `<span class="tools">${item.tools.map(escapeHtml).join(' · ')}</span>` : ''}`
          : '';
      return `<article class="card${item.featured ? ' featured' : ''}"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}${links}</p>${evidence}${item.meta ? `<span class="meta">${escapeHtml(item.meta)}</span>` : ''}</article>`;
    })
    .join('\n');
const bullets = (items) =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
const scaleCards = portfolio.scenes
  .map((scene) => {
    const signals = portfolio.sceneSignals
      .filter((signal) => signal.scene === scene.id)
      .slice(0, 4)
      .map((signal) => `<li>${escapeHtml(signal.title)}</li>`)
      .join('');
    return `<article class="scale-card"><span>${escapeHtml(scene.scale)}</span><h3>${escapeHtml(scene.label)}</h3><p>${escapeHtml(scene.meaning)}</p><small>${escapeHtml(scene.comparison)}</small>${signals ? `<ul>${signals}</ul>` : ''}<a href="/#/${escapeHtml(scene.id)}">Open scene →</a></article>`;
  })
  .join('\n');
const links = portfolio.links
  .map(
    (link) =>
      `<a${link.kind === 'primary' ? ' class="primary"' : ''} href="${escapeHtml(link.href)}"${externalAttrs(link.href)}>${escapeHtml(link.label)}</a>`,
  )
  .join('\n');
const currentCards = [
  {
    eyebrow: 'Research',
    title: portfolio.research[0].title,
    description: portfolio.research[0].description,
    href: '#research',
    label: 'Research details',
  },
  {
    eyebrow: 'Now',
    title: portfolio.experience[0].title,
    description: portfolio.experience[0].description,
    href: '#experience',
    label: 'Experience details',
  },
]
  .map(
    (item) =>
      `<article class="current-card"><span>${escapeHtml(item.eyebrow)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><a href="${item.href}">${escapeHtml(item.label)} ↓</a></article>`,
  )
  .join('\n');
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: portfolio.profile.name,
  url: 'https://josephbaileyy.github.io/about.html',
  affiliation: { '@type': 'CollegeOrUniversity', name: 'Stanford University' },
  hasOccupation: {
    '@type': 'Occupation',
    name: 'Physics and Computer Science student',
    occupationLocation: { '@type': 'City', name: 'Stanford, California' },
  },
  sameAs: portfolio.links.filter((link) => link.href.startsWith('http')).map((link) => link.href),
  knowsAbout: [
    'Machine learning for fundamental physics',
    'Particle physics',
    'Astrophysics',
    'Computer science',
  ],
});

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(portfolio.profile.name)} — About, CV &amp; Projects</title>
    <meta name="description" content="Joseph Bailey — Stanford Physics B.S. and CS M.S. student working on machine learning for fundamental physics. Research, projects, CV, and contact." />
    <link rel="canonical" href="https://josephbaileyy.github.io/about.html" />
    <meta property="og:title" content="Joseph Bailey — Research, Projects &amp; CV" />
    <meta property="og:description" content="Machine learning for fundamental physics, research, projects, and CV." />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="https://josephbaileyy.github.io/about.html" />
    <meta property="og:image" content="https://josephbaileyy.github.io/og-preview.jpg" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#0b1026" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='12' cy='16' r='7' fill='%23eef2ff'/%3E%3Ccircle cx='24' cy='13' r='4' fill='%23ffd479'/%3E%3C/svg%3E" />
    <script type="application/ld+json">${jsonLd}</script>
    <style>
      :root{--bg:#0b1026;--panel:#131a3a;--panel-2:#171f46;--ink:#eef2ff;--dim:#aeb7d9;--gold:#ffd479;--cyan:#7fd4ff;--violet:#8f7fff}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:72px}body{margin:0;background:radial-gradient(circle at 50% -20%,#1b1740 0,var(--bg) 38%);color:var(--ink);font-family:"Avenir Next","Segoe UI",system-ui,-apple-system,sans-serif;line-height:1.7}a{color:var(--cyan)}.skip{position:absolute;left:16px;top:-80px;background:var(--ink);color:var(--bg);padding:9px 14px;border-radius:8px;z-index:2}.skip:focus{top:12px}.section-nav{position:sticky;top:0;z-index:1;display:flex;gap:4px;overflow-x:auto;padding:10px max(18px,calc((100vw - 840px)/2));border-bottom:1px solid rgb(127 212 255/.14);background:rgb(11 16 38/.9);backdrop-filter:blur(10px)}.section-nav a{flex:0 0 auto;padding:6px 10px;border-radius:999px;color:var(--dim);font:12px ui-monospace,Menlo,monospace;text-decoration:none}.section-nav a:hover,.section-nav a:focus-visible{background:var(--panel);color:var(--ink);outline:1px solid var(--cyan)}main{max-width:840px;margin:0 auto;padding:56px 24px 96px}header{max-width:720px}h1{font-size:clamp(38px,7vw,56px);margin:0 0 4px;line-height:1.08}.tagline{color:var(--dim);font:14px/1.6 ui-monospace,Menlo,monospace;margin:0 0 24px}h2{font:700 14px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--cyan);margin:52px 0 12px;border-bottom:1px solid rgb(127 212 255/.2);padding-bottom:8px}h3{margin:0 0 6px;font-size:17px;line-height:1.4}.links{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0 6px}.links a{text-decoration:none;border:1px solid rgb(174 183 217/.4);border-radius:999px;padding:8px 16px;font-size:14px;color:var(--ink);background:var(--panel)}.links a:hover,.links a:focus-visible{border-color:var(--cyan);outline:2px solid transparent}.links a.primary{background:var(--gold);color:#1a1430;border-color:var(--gold);font-weight:700}.current-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.current-card,.card,.scale-card{background:linear-gradient(145deg,var(--panel-2),var(--panel));border:1px solid rgb(174 183 217/.2);border-radius:14px;padding:20px}.current-card span,.scale-card span{color:var(--gold);font:11px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}.current-card p,.card p,.scale-card p{margin:0;color:#d4daf2;font-size:15px}.current-card p{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:4}.current-card a{display:inline-block;margin-top:12px;font-size:13px}.card{margin:14px 0}.card.featured{border-left:3px solid var(--gold);padding-left:24px}.scale-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.scale-card{border-color:rgb(143 127 255/.25)}.scale-card small{display:block;color:var(--dim);font:12px/1.5 ui-monospace,Menlo,monospace;margin-top:9px}.scale-card ul{margin:12px 0 0;color:#d4daf2;font-size:13px}.evidence{display:grid;gap:9px;margin:16px 0}.evidence div{display:grid;grid-template-columns:76px minmax(0,1fr);gap:12px}.evidence dt{color:var(--gold);font:11px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase}.evidence dd{margin:0;color:#d4daf2;font-size:14px;line-height:1.55}.tools,.meta{font:12px/1.5 ui-monospace,Menlo,monospace;display:block;margin-top:9px}.tools{color:var(--cyan)}.meta{color:var(--dim)}.universe-invite{margin-top:64px;padding:22px;border-radius:14px;background:linear-gradient(160deg,#1b1740,#0d1130);border:1px solid rgb(127 212 255/.25);text-align:center}ul{padding-left:22px}footer{margin-top:64px;color:var(--dim);font:13px/1.6 ui-monospace,Menlo,monospace}@media(max-width:620px){main{padding:38px 20px 72px}.current-grid,.scale-grid{grid-template-columns:1fr}.card,.current-card,.scale-card{padding:17px}.card.featured{padding-left:19px}.evidence div{grid-template-columns:1fr;gap:2px}.links a{min-height:44px;display:inline-flex;align-items:center}.section-nav{padding-inline:10px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
    </style>
  </head>
  <body>
    <a class="skip" href="#current">Skip to current work</a>
    <nav class="section-nav" aria-label="Portfolio sections">
      <a href="#current">Current</a><a href="#scale">Scale</a><a href="#research">Research</a><a href="#experience">Experience</a><a href="#projects">Projects</a><a href="#education">Education</a><a href="#beyond">Beyond</a>
    </nav>
    <main>
      <header>
        <h1>${escapeHtml(portfolio.profile.name)}</h1>
        <p class="tagline">${escapeHtml(portfolio.profile.tagline)}</p>
        <p>${escapeHtml(portfolio.profile.summary)}</p>
        <nav class="links" aria-label="Profile links">${links}</nav>
      </header>
      <section id="current" aria-labelledby="current-title"><h2 id="current-title">Current work</h2><div class="current-grid">${currentCards}</div></section>
      <section id="scale" aria-labelledby="scale-title"><h2 id="scale-title">Explore by scale</h2><div class="scale-grid">${scaleCards}</div></section>
      <section id="research" aria-labelledby="research-title"><h2 id="research-title">Research</h2>${cards(portfolio.research)}</section>
      <section id="experience" aria-labelledby="experience-title"><h2 id="experience-title">Professional experience</h2>${cards(portfolio.experience)}</section>
      <section id="projects" aria-labelledby="projects-title"><h2 id="projects-title">Projects</h2>${cards(portfolio.projects)}</section>
      <section id="education" aria-labelledby="education-title"><h2 id="education-title">Education</h2>${cards(portfolio.education)}</section>
      <section id="honors" aria-labelledby="honors-title"><h2 id="honors-title">Honors</h2>${bullets(portfolio.honors)}</section>
      <section id="beyond" aria-labelledby="beyond-title"><h2 id="beyond-title">Beyond research</h2>${bullets(portfolio.beyond)}</section>
      <div class="universe-invite"><p style="margin:0 0 10px">Prefer the scenic route?</p><a href="/">Zoom through the universe</a></div>
      <footer>© Joseph Bailey · josephbaileyy.github.io<br /><small>Imagery: Milky Way panorama © ESO/S. Brunier (CC BY 4.0) · planet textures © Solar System Scope (CC BY 4.0) · star catalog from HYG (CC BY-SA 4.0) · Earth night lights: NASA</small></footer>
    </main>
  </body>
</html>\n`;

await writeFile(new URL('../about.html', import.meta.url), html);
