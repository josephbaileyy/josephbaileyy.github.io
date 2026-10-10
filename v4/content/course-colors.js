import { courseQuarters } from './coursework.js';

// Subject keeps a stable color; status and year use independent shapes and positions.
export const courseSubjects = [
  ['mechanics', 'Mechanics', '#48785b'],
  ['em', 'E&M', '#447d96'],
  ['quantum', 'Quantum', '#8065a1'],
  ['astro', 'Astrophysics & relativity', '#5b69a0'],
  ['thermal', 'Thermal & statistical physics', '#ad713a'],
  ['lab', 'Laboratory & data', '#50847e'],
  ['research', 'Research & communication', '#8a7860'],
  ['learning', 'Machine learning', '#3e8176'],
  ['agents', 'Agents & decisions', '#a46b87'],
  ['algebra', 'Algebra', '#788447'],
  ['analysis', 'Calculus & analysis', '#4188a9'],
  ['probability', 'Probability & information', '#a8822f'],
  ['systems', 'Programming & systems', '#5370b3'],
  ['security', 'Security & blockchain', '#966296'],
  ['theory', 'Computation theory', '#a16648'],
  ['music', 'Music', '#976cba'],
  ['language', 'Language', '#3f9394'],
  ['humanities', 'Humanities & society', '#858752'],
  ['athletics', 'Athletics', '#bd7952'],
];

export const courseYears = [...new Set(courseQuarters.map(({ year }) => year))];
export const courseStatuses = [
  { id: 'completed', label: 'Completed', symbol: '✓' },
  { id: 'in-progress', label: 'In progress', symbol: '◷' },
];

export function courseYearKeys(course) {
  return [...new Set(course.offerings.map(({ quarter }) => courseQuarters[quarter].year))];
}

export function courseStatus(course) {
  const inProgress = course.offerings.some(
    ({ quarter }) => courseQuarters[quarter].status === 'in-progress',
  );
  return courseStatuses.find(({ id }) => id === (inProgress ? 'in-progress' : 'completed'));
}

export function courseColorStyle(course) {
  const subject = courseSubjects.find(([id]) => id === course.subject);
  return `--course-color:${subject[2]}`;
}
