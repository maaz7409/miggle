import { readJson, writeJson } from './storage';

const KEY = 'stats';

export interface Stats {
  wins: number;
  /** Consecutive days won, ending on `lastWin`. */
  streak: number;
  bestStreak: number;
  /** Puzzle number of the most recent counted win. */
  lastWin: number | null;
  /** Count of wins by extra steps (steps − par; negative = under par). */
  histogram: Readonly<Record<number, number>>;
}

export function emptyStats(): Stats {
  return { wins: 0, streak: 0, bestStreak: 0, lastWin: null, histogram: {} };
}

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

/** Validate stored stats; anything malformed is dropped rather than trusted. */
export function sanitizeStats(raw: unknown): Stats | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (!isCount(s.wins) || !isCount(s.streak) || !isCount(s.bestStreak)) return null;
  const lastWinOk =
    s.lastWin === null || (Number.isInteger(s.lastWin) && (s.lastWin as number) >= 1);
  if (!lastWinOk) return null;
  if (typeof s.histogram !== 'object' || s.histogram === null) return null;
  const histogram: Record<number, number> = {};
  for (const [k, v] of Object.entries(s.histogram)) {
    if (Number.isInteger(Number(k)) && isCount(v)) histogram[Number(k)] = v;
  }
  return {
    wins: s.wins,
    streak: s.streak,
    bestStreak: Math.max(s.bestStreak, s.streak),
    lastWin: s.lastWin as number | null,
    histogram,
  };
}

/** Count a win on puzzle `day`. A second win on the same day changes nothing. */
export function recordWin(stats: Stats, day: number, extra: number): Stats {
  if (stats.lastWin !== null && day <= stats.lastWin) return stats;
  const streak = stats.lastWin === day - 1 ? stats.streak + 1 : 1;
  return {
    wins: stats.wins + 1,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastWin: day,
    histogram: { ...stats.histogram, [extra]: (stats.histogram[extra] ?? 0) + 1 },
  };
}

/** The streak still alive on `today`: it survives until a whole puzzle day is missed. */
export function currentStreak(stats: Stats, today: number): number {
  return stats.lastWin !== null && stats.lastWin >= today - 1 ? stats.streak : 0;
}

export interface HistogramBucket {
  label: string;
  count: number;
  /** Whether `extra` (e.g. today's result) falls in this bucket. */
  matches(extra: number): boolean;
}

/** Display buckets: Under par, Par, +1 … +4, +5 or more. */
export function histogramBuckets(stats: Stats): HistogramBucket[] {
  const sum = (pred: (extra: number) => boolean) =>
    Object.entries(stats.histogram).reduce((n, [k, v]) => (pred(Number(k)) ? n + v : n), 0);
  const bucket = (label: string, matches: (extra: number) => boolean): HistogramBucket => ({
    label,
    count: sum(matches),
    matches,
  });
  return [
    bucket('Under', (e) => e < 0),
    bucket('Par', (e) => e === 0),
    ...[1, 2, 3, 4].map((n) => bucket(`+${n}`, (e) => e === n)),
    bucket('+5', (e) => e >= 5),
  ];
}

export function loadStats(): Stats {
  return readJson(KEY, emptyStats(), sanitizeStats);
}

export function saveStats(stats: Stats): void {
  writeJson(KEY, stats);
}
