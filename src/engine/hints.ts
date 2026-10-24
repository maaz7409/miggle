import { changedLetter, type LetterChange } from './rules';
import { nextOnShortestPath } from './solver';
import type { Dictionary } from './words';

/** 1 = which letter to swap, 2 = the whole next word. */
export type HintLevel = 1 | 2;

export interface Hint {
  /** The word the hint is about (the end of the ladder). */
  from: string;
  /** The next word on a shortest path, skipping words already in the ladder. */
  next: string;
  change: LetterChange;
}

/** The hint for the end of `ladder`, or null if no unused neighbour leads to MIGUEL. */
export function nextHint(ladder: readonly string[], dict: Dictionary): Hint | null {
  const from = ladder.at(-1);
  if (from === undefined) return null;
  const next = nextOnShortestPath(from, dict, ladder);
  const change = next && changedLetter(from, next);
  return next && change ? { from, next, change } : null;
}

/** "a G", "an S": the article follows how the letter's name sounds. */
export function withArticle(letter: string): string {
  return `${'AEFHILMNORSX'.includes(letter) ? 'an' : 'a'} ${letter}`;
}

export function describeHint(hint: Hint, level: HintLevel): string {
  return level === 1
    ? `Swap ${withArticle(hint.change.removed)} for ${withArticle(hint.change.added)}`
    : `Try ${hint.next}`;
}
