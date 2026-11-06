import { readFileSync } from 'node:fs';

const feedPath = new URL('../../data/now.json', import.meta.url);
const dayMs = 24 * 60 * 60 * 1000;
const pacificDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  dateStyle: 'medium',
});
const parseDate = (value) => (typeof value === 'string' ? Date.parse(value) : NaN);

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
      [item.title, item.course, item.due_display].every(
        (value) => typeof value === 'string' && value.trim(),
      ) &&
      Number.isFinite(parseDate(item.due)),
  );
}

function renderList(items, title, empty, escape) {
  const completed = items[0]?.status === 'completed';
  return `<div class="now-group">
    <h3>${title}</h3>
    ${
      items.length
        ? `<ul role="list" class="now-list${completed ? ' now-list-done' : ''}">${items
            .map((item) => {
              const expected =
                item.source === 'predicted' && !/\(expected\)/i.test(item.due_display);
              return `<li>
        <span class="now-box" aria-hidden="true">${completed ? '✓' : ''}</span>
        <div class="now-item"><span class="now-item-title">${escape(item.title)}</span>
          <div class="now-item-meta"><span class="now-course">${escape(item.course)}</span><time datetime="${escape(item.due)}">${escape(item.due_display)}${expected ? ' (expected)' : ''}</time></div>
        </div>
      </li>`;
            })
            .join('')}</ul>`
        : `<p class="now-empty">${empty}</p>`
    }
  </div>`;
}

export function renderNow(escape) {
  const feed = readFeed();
  const updated = parseDate(feed?.updated_at);
  const expires = updated + 7 * dayMs;
  const fresh = Date.now() < expires;
  const doing = validItems(feed?.doing, 'upcoming')
    .filter(({ due }) => Date.parse(due) >= updated && Date.parse(due) <= updated + 10 * dayMs)
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))
    .slice(0, 5);
  const done = validItems(feed?.recently_completed, 'completed')
    .filter(({ completed_at }) => Number.isFinite(parseDate(completed_at)))
    .sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at))
    .slice(0, 3);
  const updatedDate = Number.isFinite(updated)
    ? `<time datetime="${escape(feed.updated_at)}">${pacificDate.format(updated)}</time>`
    : '';

  return `<section class="now-section" id="now" aria-labelledby="now-heading">
    <div class="now-paper">
      <header class="now-header">
        <div><p class="now-label">The coursework list</p><h2 id="now-heading">What I'm Currently Doing</h2></div>
        <svg class="now-cart" viewBox="0 0 96 76" width="96" height="76" fill="none" aria-hidden="true">
          <path d="M10 24h11l12 30 39-3 10-22-56 4m9 21-5 8 43-3M40 33l8 19m7-20 5 19m10-20 1 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="39" cy="67" r="3" fill="currentColor"/><circle cx="68" cy="65" r="3" fill="currentColor"/>
          <path d="M62 6v16m-8-8h16m13 2v9m-4.5-4.5h9M35 14l3 7m-6-2 8-3" stroke="#a63e67" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </header>
      ${
        fresh
          ? `<div class="now-groups" data-now-items data-expires="${expires}">
        ${renderList(doing, 'On the list', 'No upcoming coursework on the list.', escape)}
        ${renderList(done, 'Recently checked off', 'No recent submissions on the list.', escape)}
      </div>`
          : ''
      }
      <p class="now-fallback" data-now-fallback${fresh ? ' hidden' : ''}>${updatedDate ? `Currently doing list last updated ${updatedDate}.` : 'The coursework list is waiting for its first update.'}</p>
      <p class="now-credit"><span aria-hidden="true">✦</span> powered by Muse</p>
    </div>
  </section>`;
}
