import data from './notes.json';

export interface Note {
  slug: string;
  title: string;
  date: string;
  summary: string;
  /** Body rendered to HTML by scripts/generate-notes.mjs (trusted first-party content). */
  html: string;
}

/** Newest first (the generator sorts by date). */
export const NOTES: Note[] = data as Note[];
