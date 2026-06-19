import { readFile, writeFile } from 'node:fs/promises';

const portfolio = JSON.parse(await readFile(new URL('../src/content/portfolio.json', import.meta.url), 'utf8'));
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[char]);
const externalAttrs = (href) => href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
const cards = (items) => items.map((item) => `<article class="card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}${item.href ? ` <a href="${escapeHtml(item.href)}"${externalAttrs(item.href)}>${escapeHtml(item.linkLabel ?? 'Open')}</a>` : ''}</p>${item.meta ? `<span class="meta">${escapeHtml(item.meta)}</span>` : ''}</article>`).join('\n');
const bullets = (items) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
const links = portfolio.links.map((link) => `<a${link.kind === 'primary' ? ' class="primary"' : ''} href="${escapeHtml(link.href)}"${externalAttrs(link.href)}>${escapeHtml(link.label)}</a>`).join('\n');
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: portfolio.profile.name,
  url: 'https://josephbaileyy.github.io/about.html',
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'Stanford University' },
  sameAs: portfolio.links.filter((link) => link.href.startsWith('http')).map((link) => link.href),
  knowsAbout: ['Machine learning for fundamental physics', 'Particle physics', 'Astrophysics', 'Computer science'],
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
    <meta property="og:image" content="https://josephbaileyy.github.io/og-preview.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#0b1026" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='12' cy='16' r='7' fill='%23eef2ff'/%3E%3Ccircle cx='24' cy='13' r='4' fill='%23ffd479'/%3E%3C/svg%3E" />
    <script type="application/ld+json">${jsonLd}</script>
    <style>
      :root{--bg:#0b1026;--panel:#131a3a;--ink:#eef2ff;--dim:#aeb7d9;--gold:#ffd479;--cyan:#7fd4ff}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Avenir Next","Segoe UI",system-ui,-apple-system,sans-serif;line-height:1.7}main{max-width:760px;margin:0 auto;padding:48px 24px 96px}h1{font-size:clamp(34px,7vw,48px);margin:0 0 4px;line-height:1.15}.tagline{color:var(--dim);font:14px/1.6 ui-monospace,Menlo,monospace;margin:0 0 28px}h2{font:700 14px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--cyan);margin:44px 0 12px;border-bottom:1px solid rgb(127 212 255/.2);padding-bottom:8px}a{color:var(--cyan)}.links{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0 6px}.links a{text-decoration:none;border:1px solid rgb(174 183 217/.4);border-radius:999px;padding:8px 16px;font-size:14px;color:var(--ink);background:var(--panel)}.links a:hover,.links a:focus-visible{border-color:var(--cyan);outline:2px solid transparent}.links a.primary{background:var(--gold);color:#1a1430;border-color:var(--gold);font-weight:700}.card{background:var(--panel);border:1px solid rgb(174 183 217/.2);border-radius:12px;padding:18px 20px;margin:14px 0}.card h3{margin:0 0 6px;font-size:17px;line-height:1.4}.card p{margin:0;color:#d4daf2;font-size:15px}.meta{font:12px/1.5 ui-monospace,Menlo,monospace;color:var(--dim);display:block;margin-top:9px}.universe-invite{margin-top:56px;padding:20px;border-radius:12px;background:linear-gradient(160deg,#1b1740,#0d1130);border:1px solid rgb(127 212 255/.25);text-align:center}ul{padding-left:22px}footer{margin-top:64px;color:var(--dim);font:13px/1.6 ui-monospace,Menlo,monospace}@media(max-width:520px){main{padding:30px 20px 72px}.card{padding:16px}.links a{min-height:44px;display:inline-flex;align-items:center}}
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(portfolio.profile.name)}</h1>
      <p class="tagline">${escapeHtml(portfolio.profile.tagline)}</p>
      <p>${escapeHtml(portfolio.profile.summary)}</p>
      <nav class="links" aria-label="Profile links">${links}</nav>
      <h2>Research</h2>${cards(portfolio.research)}
      <h2>Projects</h2>${cards(portfolio.projects)}
      <h2>Education</h2>${cards(portfolio.education)}
      <h2>Honors</h2>${bullets(portfolio.honors)}
      <h2>Beyond research</h2>${bullets(portfolio.beyond)}
      <div class="universe-invite"><p style="margin:0 0 10px">Prefer the scenic route?</p><a href="/">Zoom through the universe</a></div>
      <footer>© Joseph Bailey · josephbaileyy.github.io<br /><small>Imagery: Milky Way panorama © ESO/S. Brunier (CC BY 4.0) · planet textures © Solar System Scope (CC BY 4.0) · star catalog from HYG (CC BY-SA 4.0) · Earth night lights: NASA</small></footer>
    </main>
  </body>
</html>\n`;

await writeFile(new URL('../about.html', import.meta.url), html);
