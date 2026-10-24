import { TARGET } from '../config';
import { sortedKey, type Dictionary } from './words';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Every accepted word one step from `word` (one letter swapped, any order), alphabetically. */
export function neighbours(word: string, dict: Dictionary): string[] {
  const key = sortedKey(word);
  const out = new Set<string>();
  for (let i = 0; i < key.length; i++) {
    if (i > 0 && key[i] === key[i - 1]) continue; // removing either copy of a letter is the same
    const rest = key.slice(0, i) + key.slice(i + 1);
    for (const added of ALPHABET) {
      if (added === key[i]) continue;
      for (const n of dict.withKey(sortedKey(rest + added))) out.add(n);
    }
  }
  return [...out].sort();
}

/**
 * The next word on a shortest path to MIGUEL, skipping `exclude` (e.g. words already in the ladder).
 *
 * From a word that has a par, the path stays on common words (par − 1), so hints and answers use
 * familiar words. Otherwise it takes the lowest full distance, preferring common words, then
 * alphabetical order. Returns null at MIGUEL, for dead ends, unknown words, or when stuck.
 */
export function nextOnShortestPath(
  word: string,
  dict: Dictionary,
  exclude: Iterable<string> = [],
): string | null {
  const full = dict.fullDist(word);
  if (word === TARGET || full === undefined || full < 0) return null;
  const skip = new Set(exclude);
  const options = neighbours(word, dict).filter((n) => !skip.has(n) && dict.fullDist(n)! >= 0);

  const par = dict.par(word);
  if (par !== null) {
    const onPar = options.find((n) => dict.par(n) === par - 1);
    if (onPar) return onPar;
  }

  let best: string | null = null;
  let bestRank: [number, number] = [Infinity, Infinity];
  for (const n of options) {
    const rank: [number, number] = [dict.fullDist(n)!, dict.par(n) === null ? 1 : 0];
    if (rank[0] < bestRank[0] || (rank[0] === bestRank[0] && rank[1] < bestRank[1])) {
      best = n;
      bestRank = rank;
    }
  }
  return best;
}

/** The full ladder from `start` to MIGUEL (both included), or null if MIGUEL can't be reached. */
export function shortestPath(start: string, dict: Dictionary): string[] | null {
  const path = [start];
  let word: string | null = start;
  while (word !== TARGET) {
    word = nextOnShortestPath(word, dict, path);
    if (word === null) return null;
    path.push(word);
  }
  return path;
}
