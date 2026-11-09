import { COURSE_DISPLAY, practiceQueue } from './curriculum.js';
import { courseTag, escapeHtml, evidenceTag } from './inspector.js';
import { EVIDENCE_STATES, evidenceState } from './overlay.js';

const dateLabel = (value) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value + 'T00:00:00Z'));

export function renderTimeline({ target, data, index, course, cutoff, overlay }) {
  const open = new Set(
    [...target.querySelectorAll('details[open]')].map((el) => el.dataset.course),
  );
  target.innerHTML = data.courses
    .filter(({ id }) => course === 'all' || course === id)
    .map(({ id }) => {
      const units = data.syllabus_units[id];
      const dated = units.filter((u) => u.dates.length);
      const started = dated.filter((u) => u.dates[0] <= cutoff).length;
      const items = index.occurrences.flatMap((entries, i) =>
        entries.filter((o) => o.course === id).map((o) => ({ ...o, i })),
      );
      const anchored = items.filter((o) => o.anchors.some((a) => a.kind === 'syllabus')).length;
      const scheduled = items.filter((o) => o.firstScheduled && o.firstScheduled <= cutoff).length;
      const counts = Object.fromEntries(Object.keys(EVIDENCE_STATES).map((key) => [key, 0]));
      const hasEvidence = overlay && (!overlay.legacy || id === 'stats310a');
      if (hasEvidence) items.forEach(({ i }) => counts[evidenceState(overlay.entry(i, id))]++);
      return `<details class="cs-course-card" data-course="${id}" ${open.has(id) || course === id ? 'open' : ''}>
      <summary>
        <span class="cs-course-name">${courseTag(id)} <small>${COURSE_DISPLAY[id].name}</small></span>
        <span class="cs-course-count">${items.length} concepts · ${dated.length ? `${started}/${units.length} blocks begun` : 'schedule dates unavailable'}</span>
        ${hasEvidence ? `<span class="cs-course-count">${counts.retention_verified} retained · ${counts.independently_demonstrated} independent</span>` : ''}
        ${dated.length ? `<progress value="${started}" max="${units.length}" aria-label="${COURSE_DISPLAY[id].code} scheduled blocks begun"></progress>` : ''}
      </summary>
      <div class="cs-course-meta">
        <p>${units.length ? `${anchored}/${items.length} concepts linked to ${dated.length ? 'syllabus blocks' : 'scope topics'}` : 'The graph scope comes from documented lectures and readings'}
        ${dated.length ? ` · ${scheduled} scheduled by this date` : ''}</p>
        ${
          units.length
            ? `<ol class="cs-units">${units
                .map((u) => {
                  const date = u.dates[0];
                  const label = date
                    ? `${dateLabel(date)}${u.dates.length > 1 ? `–${dateLabel(u.dates.at(-1))}` : ''}`
                    : 'Undated';
                  return `<li class="${date && date <= cutoff ? 'is-reached' : ''}"><b>${label}</b><span>${escapeHtml(u.focus)}</span></li>`;
                })
                .join('')}</ol>`
            : ''
        }
        ${
          hasEvidence
            ? `<ul class="cs-progress">${Object.entries(counts)
                .map(([key, count]) => `<li>${evidenceTag(key)} <b>${count}</b></li>`)
                .join('')}</ul>`
            : ''
        }
        ${overlay?.legacy && !hasEvidence ? '<p>The loaded overlay covers STATS 310A only.</p>' : ''}
      </div>
    </details>`;
    })
    .join('');
}

export function renderPractice({ target, index, state, data, conceptButton }) {
  const candidates = index.occurrences.flatMap((items, i) =>
    items.some(
      (o) =>
        (state.course === 'all' || state.course === o.course) &&
        (o.firstScheduled
          ? o.firstScheduled <= state.cutoff
          : !data.syllabus_units[o.course].some((u) => u.dates.length)),
    )
      ? [i]
      : [],
  );
  const queue = practiceQueue(index, candidates, state.overlay, state.course);
  target.innerHTML = `
    <p class="cs-note">${
      state.overlay
        ? 'Uses independent evidence from the local overlay and reviewed dependencies.'
        : 'Start with foundations that unlock other concepts. Load a local overlay to use your evidence.'
    }
    Includes undated course scope where schedule dates are unavailable.</p>
    ${
      queue.length
        ? `<ol class="cs-queue">${queue
            .map(
              ({ i, missing, unlocks }) => `<li>
      ${conceptButton(i, true)}
      <small>${missing.length ? `Check ${conceptButton(missing[0])}${missing.length > 1 ? ` and ${missing.length - 1} other ${missing.length === 2 ? 'dependency' : 'dependencies'}` : ''} first.` : `Foundation · unlocks ${unlocks} ${unlocks === 1 ? 'concept' : 'concepts'}.`}</small>
      ${state.overlay ? evidenceTag(evidenceState(state.overlay.entry(i, state.course))) : ''}
    </li>`,
            )
            .join('')}</ol>`
        : '<p class="cs-note">No concepts in this scope are queued.</p>'
    }
    ${queue.length ? '<p class="cs-note">Try a fresh example or proof without hints before consulting its sources.</p>' : ''}`;
}
