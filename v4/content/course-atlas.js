import { courseAreas, courseQuarters, courses, courseworkAsOf } from './coursework.js';
import { courseColorStyle, courseSubjects, courseYears, courseStatus } from './course-colors.js';

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character],
  );

function renderCourse(course) {
  const subject = courseSubjects.find(([id]) => id === course.subject);
  const status = courseStatus(course);
  const inProgress = status.id === 'in-progress';
  const offerings = course.offerings.map(({ quarter }) => courseQuarters[quarter]);
  return `<li class="course-tile" data-course-code="${escape(course.code)}" data-status="${status.id}" style="${courseColorStyle(course)}" title="${escape(course.title)}">
    <span class="course-code">${escape(course.code)}${inProgress ? '<span class="course-progress-dot" aria-hidden="true"></span>' : ''}</span>
    <span class="course-title">${escape(course.shortTitle)}</span>
    <span class="course-quarter-grid" aria-hidden="true">${['Autumn', 'Winter', 'Spring']
      .map((season) =>
        courseYears
          .map((year) => {
            const active = offerings.some(
              (offering) => offering.year === year && offering.label.startsWith(season),
            );
            return `<span class="course-quarter-mark${active ? ' is-active' : ''}" data-year="${year}" data-quarter="${season}"></span>`;
          })
          .join(''),
      )
      .join('')}</span>
    <span class="visually-hidden">${course.shortTitle !== course.title ? `Full title: ${escape(course.title)}. ` : ''}${escape(subject[1])}. ${status.label}. ${escape(offerings.map(({ label }) => label).join(', '))}.</span>
  </li>`;
}

export function renderCourseAtlas() {
  return `<div class="course-atlas" data-course-atlas>
    <div class="atlas-heading"><h3>Course atlas</h3><p>${courses.length} courses</p></div>
    <div class="atlas-controls" data-atlas-controls hidden><div class="atlas-areas" role="group" aria-label="Course areas">${courseAreas.map(({ id, label }) => `<button type="button" data-atlas-area="${id}" aria-pressed="${id === 'ai'}">${escape(label)}</button>`).join('')}</div></div>
    <div class="atlas-encoding-key"><span class="atlas-status-key"><span class="course-progress-dot" aria-hidden="true"></span>In progress</span><span class="atlas-year-key">Columns: ${courseYears.map(escape).join(' · ')}<br>Rows: Autumn · Winter · Spring</span></div>
    <div class="atlas-groups">${courseAreas
      .map((area) => {
        const group = courses.filter((course) => course.area === area.id);
        const subjects = courseSubjects.filter(([id]) =>
          group.some((course) => course.subject === id),
        );
        return `<div class="atlas-group" data-atlas-group="${area.id}"><h4>${escape(area.label)}</h4><div class="atlas-legend" aria-label="Subjects">${subjects.map(([, label, color]) => `<span><span class="atlas-swatch" style="background-color:${color}" aria-hidden="true"></span>${escape(label)}</span>`).join('')}</div><ul class="atlas-grid" aria-label="${escape(area.label)} courses">${group.map(renderCourse).join('')}</ul></div>`;
      })
      .join('')}</div>
    <div class="atlas-footnote"><p>As of ${courseworkAsOf}.</p></div>
  </div>`;
}
