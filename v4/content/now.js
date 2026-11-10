import { readFileSync } from 'node:fs';

const feedPath = new URL('../../data/now.json', import.meta.url);
// Keep linked work in the checklist after Muse rotates completed tasks out.
const pinnedTasks = [
  {
    title: 'CS 329Z Midway Demo Video',
    course: 'CS 329Z',
    status: 'completed',
    due: '2026-11-06T23:59:00-08:00',
    due_display: 'Fri Nov 6',
    href: 'https://youtu.be/U6Q2LL9SDyU',
  },
];
const dayMs = 24 * 60 * 60 * 1000;
const pacificDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  dateStyle: 'medium',
});
const parseDate = (value) => (typeof value === 'string' ? Date.parse(value) : NaN);
const byDue = (a, b) => Date.parse(a.due) - Date.parse(b.due);

function readFeed() {
  try {
    return JSON.parse(readFileSync(feedPath, 'utf8'));
  } catch {
    return null;
  }
}

function validItems(items, status) {
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item) =>
      item?.status === status &&
      [item.title, item.due_display].every((value) => typeof value === 'string' && value.trim()) &&
      Number.isFinite(parseDate(item.due)) &&
      !pinnedTasks.some(
        (task) =>
          item.title.trim().toLowerCase() === task.title.toLowerCase() && byDue(item, task) === 0,
      ),
  );
}

function courseLabel(item) {
  if (typeof item.course !== 'string') return '';
  const normalize = (value) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/(\p{L}) +(?=\p{N})/gu, '$1')
      .trim();
  const course = normalize(item.course);
  return course && !` ${normalize(item.title)} `.includes(` ${course} `) ? item.course.trim() : '';
}

function renderList(items, escape) {
  if (!items.length)
    return '<p class="now-empty" data-now-transient>Nothing on the list right now.</p>';
  return `<ul role="list" class="now-list">${items
    .map((item) => {
      const completed = item.status === 'completed';
      const course = courseLabel(item);
      const expected = item.source === 'predicted' && !/\(expected\)/i.test(item.due_display);
      const pinned = pinnedTasks.includes(item);
      const title = pinned
        ? `<a class="now-item-title" href="${escape(item.href)}" target="_blank" rel="noopener noreferrer">${escape(item.title)}</a>`
        : `<span class="now-item-title">${escape(item.title)}</span>`;
      return `<li${completed ? ' class="now-done"' : ''}${pinned ? '' : ' data-now-transient'}>
        <span class="now-box" aria-hidden="true">${completed ? '✓' : ''}</span>
        <span class="now-item">${title}${completed ? '<span class="visually-hidden"> (completed)</span>' : ''}${course ? ` <span class="now-course">${escape(course)}</span>` : ''}</span>
        <time datetime="${escape(item.due)}">${escape(item.due_display)}${expected ? ' (expected)' : ''}</time>
      </li>`;
    })
    .join('')}</ul>`;
}

export function renderNow(escape) {
  const feed = readFeed();
  const updated = parseDate(feed?.updated_at);
  const expires = updated + 7 * dayMs;
  const fresh = Date.now() < expires;
  const doing = validItems(feed?.doing, 'upcoming')
    .filter(({ due }) => Date.parse(due) >= updated && Date.parse(due) <= updated + 10 * dayMs)
    .sort(byDue)
    .slice(0, 5);
  const done = validItems(feed?.recently_completed, 'completed')
    .filter(({ completed_at }) => Number.isFinite(parseDate(completed_at)))
    .sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at))
    .slice(0, 3);
  const items = fresh ? [...pinnedTasks, ...done, ...doing].sort(byDue) : pinnedTasks;
  const updatedDate = Number.isFinite(updated)
    ? `<time datetime="${escape(feed.updated_at)}">${pacificDate.format(updated)}</time>`
    : '';

  return `<section class="now-section" id="now" aria-labelledby="now-heading">
    <div class="now-paper">
      <header class="now-header">
        <h2 id="now-heading">What I'm Currently Doing</h2>
        <svg class="now-icon" viewBox="0 0 56 52" width="56" height="52" fill="none" aria-hidden="true">
          <g transform="rotate(8 28 26)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="11" y="9" width="31" height="37" rx="4" fill="#fae5b8"/>
            <path d="M16 9v5m7-5v5m7-5v5m7-5v5M17 24l2 2 4-5m4 4h9m-19 8 2 2 4-5m4 4h9"/>
          </g>
          <path d="M48 8v8m-4-4h8M5 30v6m-3-3h6" stroke="#a63e67" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </header>
      <div${fresh ? ` data-now-items data-expires="${expires}"` : ''}>${renderList(items, escape)}</div>
      <p class="now-fallback" data-now-fallback${fresh ? ' hidden' : ''}>${updatedDate ? `Currently doing list last updated ${updatedDate}.` : 'The list is waiting for its first update.'}</p>
      <p class="now-credit"><img src="./img/home/muse-jolly.jpg" alt="" width="32" height="32" loading="lazy"> powered by Muse</p>
    </div>
  </section>`;
}
