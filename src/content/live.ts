import data from './live.json';

export interface LiveGithubItem {
  kind: string;
  repo: string;
  url?: string;
  date: string;
  summary: string;
}

export interface LiveFilm {
  title: string;
  year: string;
  rating: string | null;
  watched: string;
  url: string;
}

export interface LiveData {
  /** null when the feed has never been fetched (local builds). */
  fetchedAt: string | null;
  github: LiveGithubItem[];
  films: LiveFilm[];
}

/**
 * Snapshot fetched at deploy time by scripts/fetch-live-data.mjs. Consumers
 * must handle empty arrays — a failed fetch degrades to the committed data.
 */
export const LIVE: LiveData = data as LiveData;
