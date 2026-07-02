/**
 * Build-time live data: recent public GitHub activity + latest Letterboxd
 * films → src/content/live.json. Run by CI right before the production build
 * (`npm run fetch:live`); never part of `npm run build`, so local builds and
 * tests stay deterministic.
 *
 * Both sources are public and keyless. Failures are non-fatal by design: each
 * section keeps the previously committed data, so the site degrades to
 * slightly stale rather than broken.
 */
import { readFile, writeFile } from 'node:fs/promises';

const GITHUB_USER = 'josephbaileyy';
const LETTERBOXD_USER = 'josephbaileyy';
const OUT = new URL('../src/content/live.json', import.meta.url);

const existing = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': `${GITHUB_USER}-site-build`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** Condense the public events feed into human-readable activity lines. */
async function fetchGithub() {
  const events = await fetchJson(
    `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=60`,
  );
  const items = [];
  for (const event of events) {
    if (items.length >= 5) break;
    const repo = event.repo?.name?.replace(`${GITHUB_USER}/`, '') ?? 'unknown';
    const url = event.repo?.name
      ? `https://github.com/${event.repo.name}`
      : `https://github.com/${GITHUB_USER}`;
    const date = (event.created_at ?? '').slice(0, 10);
    if (event.type === 'PushEvent') {
      const commits = event.payload?.commits ?? [];
      if (!commits.length) continue;
      const last = items[items.length - 1];
      if (last && last.repo === repo && last.kind === 'push' && last.date === date) {
        last.count += commits.length;
        last.summary = `pushed ${last.count} commit${last.count === 1 ? '' : 's'}`;
        continue;
      }
      items.push({
        kind: 'push',
        repo,
        url,
        date,
        count: commits.length,
        summary: `pushed ${commits.length} commit${commits.length === 1 ? '' : 's'}`,
      });
    } else if (event.type === 'CreateEvent' && event.payload?.ref_type === 'repository') {
      items.push({ kind: 'create', repo, url, date, summary: 'created repository' });
    } else if (event.type === 'PullRequestEvent' && event.payload?.action === 'opened') {
      items.push({ kind: 'pr', repo, url, date, summary: 'opened a pull request' });
    } else if (event.type === 'ReleaseEvent') {
      items.push({ kind: 'release', repo, url, date, summary: 'published a release' });
    }
  }
  return items.map(({ kind, repo, url, date, summary }) => ({ kind, repo, url, date, summary }));
}

/** Letterboxd public RSS → latest films (title, year, rating, watched date). */
async function fetchLetterboxd() {
  const res = await fetch(`https://letterboxd.com/${LETTERBOXD_USER}/rss/`, {
    headers: { 'User-Agent': `${GITHUB_USER}-site-build` },
  });
  if (!res.ok) throw new Error(`letterboxd rss → ${res.status}`);
  const xml = await res.text();
  const films = [];
  for (const item of xml.split('<item>').slice(1)) {
    if (films.length >= 4) break;
    const pick = (tag) => item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim();
    const title = pick('letterboxd:filmTitle');
    if (!title) continue; // list items etc.
    films.push({
      title,
      year: pick('letterboxd:filmYear') ?? '',
      rating: pick('letterboxd:memberRating') ?? null,
      watched: pick('letterboxd:watchedDate') ?? '',
      url: pick('link') ?? `https://letterboxd.com/${LETTERBOXD_USER}/films/`,
    });
  }
  return films;
}

const [github, films] = await Promise.all([
  fetchGithub().catch((error) => {
    console.warn(`live-data: github failed (${error.message}) — keeping previous data`);
    return existing.github ?? [];
  }),
  fetchLetterboxd().catch((error) => {
    console.warn(`live-data: letterboxd failed (${error.message}) — keeping previous data`);
    return existing.films ?? [];
  }),
]);

const payload = { fetchedAt: new Date().toISOString().slice(0, 10), github, films };
await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n');
console.log(`live-data: ${github.length} github item(s), ${films.length} film(s)`);
