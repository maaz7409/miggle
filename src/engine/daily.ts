import { EPOCH } from '../config';

export const DAY_MS = 24 * 60 * 60 * 1000;

const toMs = (now: Date | number) => (typeof now === 'number' ? now : now.getTime());

/**
 * Puzzle number live at `now`: 1 on launch day, rolling over at each daily reset (EPOCH is aligned
 * to the reset hour). Before launch, puzzle #1 is shown.
 */
export function dayNumber(now: Date | number, epoch = EPOCH): number {
  return Math.max(1, Math.floor((toMs(now) - epoch) / DAY_MS) + 1);
}

/** Instant (ms) at which puzzle `day` goes live. */
export function dayStart(day: number, epoch = EPOCH): number {
  return epoch + (day - 1) * DAY_MS;
}

/** Milliseconds until the next puzzle goes live. */
export function msUntilNext(now: Date | number, epoch = EPOCH): number {
  return dayStart(dayNumber(now, epoch) + 1, epoch) - toMs(now);
}

/** Start word for puzzle `day`; the list wraps around once exhausted. */
export function startWord(day: number, daily: readonly string[]): string {
  if (daily.length === 0) throw new Error('startWord: daily list is empty');
  const len = daily.length;
  return daily[(((day - 1) % len) + len) % len]!;
}

/** "H:MM:SS", rounding up so the countdown never shows 0:00:00 before the reset. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
