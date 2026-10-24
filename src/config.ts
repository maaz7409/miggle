/** The word every ladder must reach. */
export const TARGET = 'MIGUEL';

/** Every word in a ladder has this many letters. */
export const WORD_LEN = 6;

/** Hour (UTC) at which the daily puzzle rolls over. Genre convention. */
export const RESET_HOUR_UTC = 8;

/**
 * Instant puzzle #1 went live (ms since Unix epoch), aligned to the daily reset.
 * Placeholder launch date; the production value is set in Session 8.
 */
export const EPOCH = Date.UTC(2026, 9, 24, RESET_HOUR_UTC);

/** Prefix for every localStorage key. */
export const STORAGE_PREFIX = 'miggle.';
