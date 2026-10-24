import { newGame, restoreGame, type GameState } from './engine/game';
import { isDifficulty, type UnlimitedRun } from './engine/unlimited';
import type { Dictionary } from './engine/words';
import { readJson, writeJson } from './storage';

const KEY = 'unlimited';

/** The Unlimited run in progress and its current puzzle (`miggle.unlimited`). */
export interface UnlimitedRecord {
  run: UnlimitedRun;
  start: string;
  state: GameState;
  /** The player gave up on this puzzle (the run is over). */
  forfeited: boolean;
}

export function recordFor(run: UnlimitedRun, start: string): UnlimitedRecord {
  return { run, start, state: newGame(start), forfeited: false };
}

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

/** The saved run, or null if there is none or it fails validation (the ladder is replayed). */
export function loadUnlimited(dict: Dictionary): UnlimitedRecord | null {
  const raw = readJson<unknown>(KEY, null);
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const run = r.run as Record<string, unknown> | undefined;
  if (!run || !isDifficulty(run.difficulty) || !isCount(run.streak) || !isCount(run.hints)) {
    return null;
  }
  if (!Array.isArray(run.used) || !run.used.every((w) => typeof w === 'string')) return null;
  if (typeof r.start !== 'string' || dict.par(r.start) === null) return null;
  const state = restoreGame(r.state, r.start, dict);
  if (!state) return null;
  return {
    run: { difficulty: run.difficulty, streak: run.streak, used: run.used, hints: run.hints },
    start: r.start,
    state,
    forfeited: r.forfeited === true,
  };
}

export function saveUnlimited(record: UnlimitedRecord): void {
  writeJson(KEY, record);
}
