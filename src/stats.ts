import type { Score } from './engine/scoring';
import { DIFFICULTY_ORDER, type Difficulty } from './engine/unlimited';
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

// ------------------------------------------------------------------ Unlimited

const UNLIMITED_KEY = 'unlimitedStats';

export interface UnlimitedTally {
  solved: number;
  /** Solved at or under par. */
  perfect: number;
  bestStreak: number;
}

export type UnlimitedStats = Readonly<Record<Difficulty, UnlimitedTally>>;

export function emptyUnlimitedStats(): UnlimitedStats {
  const zero = (): UnlimitedTally => ({ solved: 0, perfect: 0, bestStreak: 0 });
  return { easy: zero(), medium: zero(), hard: zero() };
}

export function sanitizeUnlimitedStats(raw: unknown): UnlimitedStats | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const out = emptyUnlimitedStats() as Record<Difficulty, UnlimitedTally>;
  for (const d of DIFFICULTY_ORDER) {
    const t = (raw as Record<string, unknown>)[d] as Record<string, unknown> | undefined;
    if (t && isCount(t.solved) && isCount(t.perfect) && isCount(t.bestStreak)) {
      out[d] = { solved: t.solved, perfect: t.perfect, bestStreak: t.bestStreak };
    }
  }
  return out;
}

/** Count an Unlimited solve; `streak` is the run's streak including this solve. */
export function recordUnlimitedWin(
  stats: UnlimitedStats,
  difficulty: Difficulty,
  score: Score,
  streak: number,
): UnlimitedStats {
  const t = stats[difficulty];
  return {
    ...stats,
    [difficulty]: {
      solved: t.solved + 1,
      perfect: t.perfect + (score.extra <= 0 ? 1 : 0),
      bestStreak: Math.max(t.bestStreak, streak),
    },
  };
}

export function loadUnlimitedStats(): UnlimitedStats {
  return readJson(UNLIMITED_KEY, emptyUnlimitedStats(), sanitizeUnlimitedStats);
}

export function saveUnlimitedStats(stats: UnlimitedStats): void {
  writeJson(UNLIMITED_KEY, stats);
}
