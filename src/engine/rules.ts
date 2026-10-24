import { TARGET, WORD_LEN } from '../config';
import { normalize, type Dictionary } from './words';

export type StepError =
  'length' | 'notWord' | 'notOneChange' | 'anagramOnly' | 'repeat' | 'deadEnd';

export type StepResult = { ok: true; word: string; won: boolean } | { ok: false; error: StepError };

export const STEP_ERROR_MESSAGES: Readonly<Record<StepError, string>> = {
  length: `Need ${WORD_LEN} letters`,
  notWord: 'Not in word list',
  notOneChange: 'Change exactly one letter',
  anagramOnly: "You must change a letter — just shuffling isn't allowed",
  repeat: 'Already used',
  deadEnd: `Dead end! That word can't reach ${TARGET}`,
};

function letterCounts(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
}

/**
 * Number of letters in `b` left over after matching it against the letters of `a`,
 * counting duplicates. For equal-length words this is the number of letters swapped.
 */
export function multisetDiff(a: string, b: string): number {
  const left = letterCounts(a);
  let diff = 0;
  for (const ch of b) {
    const n = left.get(ch) ?? 0;
    if (n > 0) left.set(ch, n - 1);
    else diff++;
  }
  return diff;
}

export interface LetterChange {
  removed: string;
  added: string;
  /** Position of the added letter in the new word (for the "new letter" marker). */
  index: number;
}

/** The letter swapped between two words one step apart, or null if they are not one step apart. */
export function changedLetter(prev: string, next: string): LetterChange | null {
  if (prev.length !== next.length || multisetDiff(prev, next) !== 1) return null;
  const left = letterCounts(prev);
  const kept: boolean[] = [...next].map(() => false);
  const keep = (i: number) => {
    const ch = next[i]!;
    const n = left.get(ch) ?? 0;
    if (n === 0) return;
    left.set(ch, n - 1);
    kept[i] = true;
  };
  // Letters that stayed in place are matched first, so a duplicated letter's marker lands
  // on the copy that actually moved in.
  for (let i = 0; i < next.length; i++) if (next[i] === prev[i]) keep(i);
  for (let i = 0; i < next.length; i++) if (!kept[i]) keep(i);
  const index = kept.indexOf(false);
  const removed = [...left].find(([, n]) => n > 0)![0];
  return { removed, added: next[index]!, index };
}

/** Check whether `input` is a legal next word for a ladder (start word first, at least one word). */
export function validateStep(
  ladder: readonly string[],
  input: string,
  dict: Dictionary,
): StepResult {
  const prev = ladder.at(-1);
  if (prev === undefined) throw new Error('validateStep: ladder must contain the start word');
  const word = normalize(input);
  const fail = (error: StepError): StepResult => ({ ok: false, error });

  if (word.length !== WORD_LEN) return fail('length');
  if (!dict.has(word)) return fail('notWord');
  if (ladder.includes(word)) return fail('repeat');
  const diff = multisetDiff(prev, word);
  if (diff === 0) return fail('anagramOnly');
  if (diff > 1) return fail('notOneChange');
  if (dict.fullDist(word) === -1) return fail('deadEnd');
  return { ok: true, word, won: word === TARGET };
}
