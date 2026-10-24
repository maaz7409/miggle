let offsetMs = 0;

/**
 * Parse a `?date=` value: a full ISO timestamp, or a bare `YYYY-MM-DD` meaning noon UTC that day.
 * Returns NaN if it can't be parsed.
 */
export function parseDateParam(value: string): number {
  const bare = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return Date.parse(bare ? `${value}T12:00:00Z` : value);
}

/**
 * Dev builds only: `?date=2026-11-02` or `?date=2026-11-02T07:59:50Z` shifts the game clock to that
 * instant (it keeps ticking from there). Stripped from production builds.
 */
export function initClock(search: string): void {
  if (!import.meta.env.DEV) return;
  const value = new URLSearchParams(search).get('date');
  const target = value ? parseDateParam(value) : NaN;
  if (!Number.isNaN(target)) {
    offsetMs = target - Date.now();
    console.info(`[miggle] clock overridden to ${new Date(target).toISOString()}`);
  }
}

/** The game's notion of "now" (ms since the Unix epoch). */
export function now(): number {
  return Date.now() + offsetMs;
}
