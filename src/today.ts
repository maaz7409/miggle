import { isSolved, newGame, restoreGame, type GameState } from './engine/game';
import type { Dictionary } from './engine/words';
import { readJson, writeJson } from './storage';

const KEY = 'today';

/** Progress on the current daily puzzle (`miggle.today`). */
export interface TodayRecord {
  day: number;
  state: GameState;
  /** The first solve has been added to the stats; later solves (after Try again) are not. */
  counted: boolean;
  /** Ladder of the first solve, so it can still be shared mid-retry. */
  solved: readonly string[] | null;
}

export function freshToday(day: number, start: string): TodayRecord {
  return { day, state: newGame(start), counted: false, solved: null };
}

/**
 * Today's saved progress, or a fresh record if there is none, it belongs to another day, or it
 * fails validation (every saved ladder is replayed through the rules).
 */
export function loadToday(day: number, start: string, dict: Dictionary): TodayRecord {
  const fresh = freshToday(day, start);
  const raw = readJson<unknown>(KEY, null);
  if (typeof raw !== 'object' || raw === null) return fresh;
  const r = raw as Record<string, unknown>;
  if (r.day !== day) return fresh;
  const state = restoreGame(r.state, start, dict);
  if (!state) return fresh;
  const solved =
    r.solved == null ? null : restoreGame({ ladder: r.solved, input: '' }, start, dict);
  return {
    day,
    state,
    counted: r.counted === true,
    solved: solved && isSolved(solved.ladder) ? solved.ladder : null,
  };
}

export function saveToday(record: TodayRecord): void {
  writeJson(KEY, record);
}
