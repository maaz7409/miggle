/** The word every ladder must reach. */
export const TARGET = 'MIGUEL';

/** Every word in a ladder has this many letters. */
export const WORD_LEN = 6;

/**
 * The daily puzzle rolls over at midnight India time (00:00 IST = 18:30 UTC), chosen at launch
 * instead of the genre's usual 08:00 UTC.
 */
export const RESET_UTC = { hour: 18, minute: 30 } as const;

/** Time zone whose calendar dates name the puzzles (each puzzle day is one IST day). */
export const PUZZLE_TIME_ZONE = 'Asia/Kolkata';

/** Instant puzzle #1 goes live: 25 October 2026, 00:00 IST. Every reset is a whole number of days later. */
export const EPOCH = Date.UTC(2026, 9, 24, RESET_UTC.hour, RESET_UTC.minute);

/** Hints available on each daily puzzle (1: which letter to swap, 2: the next word). */
export const DAILY_HINTS = 2;

/** The author's GitHub profile, linked from every page. */
export const AUTHOR_URL = 'https://github.com/maaz7409';

/** Prefix for every localStorage key. */
export const STORAGE_PREFIX = 'miggle.';

/**
 * Public origin of the site, from VITE_SITE_URL in .env (also used by the page generator).
 * Placeholder (.example is reserved) until the production domain is set in Session 8.
 */
export const SITE_URL: string = import.meta.env?.VITE_SITE_URL ?? 'https://miggle.example';
