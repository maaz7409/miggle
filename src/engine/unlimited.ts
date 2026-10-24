import type { Score } from './scoring';
import type { Dictionary } from './words';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultySpec {
  label: string;
  minPar: number;
  maxPar: number;
  /** Steps allowed beyond par before the puzzle (and streak) is lost; null = unlimited. */
  extraSteps: number | null;
}

export const DIFFICULTIES: Readonly<Record<Difficulty, DifficultySpec>> = {
  easy: { label: 'Easy', minPar: 3, maxPar: 4, extraSteps: null },
  medium: { label: 'Medium', minPar: 5, maxPar: 6, extraSteps: null },
  hard: { label: 'Hard', minPar: 7, maxPar: Infinity, extraSteps: 2 },
};

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && value in DIFFICULTIES;
}

/** Start words from `pool` whose par falls in the difficulty's range. */
export function puzzlePool(
  pool: readonly string[],
  dict: Dictionary,
  difficulty: Difficulty,
): string[] {
  const { minPar, maxPar } = DIFFICULTIES[difficulty];
  return pool.filter((w) => {
    const par = dict.par(w);
    return par !== null && par >= minPar && par <= maxPar;
  });
}

/** A random start word not yet `used` in this run (repeats only once the pool is exhausted). */
export function pickPuzzle(
  candidates: readonly string[],
  used: readonly string[],
  rng: () => number = Math.random,
): string {
  if (candidates.length === 0) throw new Error('pickPuzzle: no candidates');
  const seen = new Set(used);
  const fresh = candidates.filter((w) => !seen.has(w));
  const from = fresh.length > 0 ? fresh : candidates;
  return from[Math.floor(rng() * from.length)]!;
}

/** Most steps allowed for a puzzle, or null when there is no limit. */
export function stepLimit(difficulty: Difficulty, par: number): number | null {
  const extra = DIFFICULTIES[difficulty].extraSteps;
  return extra === null ? null : par + extra;
}

/** A streak of unlimited puzzles at one difficulty. */
export interface UnlimitedRun {
  difficulty: Difficulty;
  /** Puzzles solved in a row. */
  streak: number;
  /** Start words played this run (never repeated). */
  used: readonly string[];
  /** Hints in the bank. */
  hints: number;
}

export function newRun(difficulty: Difficulty): UnlimitedRun {
  return { difficulty, streak: 0, used: [], hints: 0 };
}

/** Solving at or under par earns a hint. */
export function earnsHint(score: Score): boolean {
  return score.extra <= 0;
}

export function completePuzzle(run: UnlimitedRun, score: Score): UnlimitedRun {
  return { ...run, streak: run.streak + 1, hints: run.hints + (earnsHint(score) ? 1 : 0) };
}

export function useRunHint(run: UnlimitedRun): UnlimitedRun {
  return run.hints > 0 ? { ...run, hints: run.hints - 1 } : run;
}
