import { readFileSync } from 'node:fs';
import { Dictionary, type WordData } from '../src/engine/words';

export const readRepoFile = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

export const wordsRaw = readRepoFile('public/data/words.json');
export const dailyRaw = readRepoFile('public/data/daily.json');
export const wordData = JSON.parse(wordsRaw) as WordData;
export const daily = JSON.parse(dailyRaw) as string[];

/** The real generated dictionary. */
export const realDict = new Dictionary(wordData);

/** Same format as scripts/build_data.py: whitespace-separated words, # comments. */
export function curationList(name: string): string[] {
  return readRepoFile(`data-src/${name}`)
    .split('\n')
    .flatMap((line) => (line.split('#')[0] ?? '').split(/\s+/))
    .filter(Boolean)
    .map((w) => w.toUpperCase());
}

/** Verified example ladders from CLAUDE.md §2. */
export const EXAMPLE_LADDERS = [
  ['CASTLE', 'CLAUSE', 'MUSCLE', 'MUESLI', 'MIGUEL'],
  ['BRIDGE', 'FRIDGE', 'FIGURE', 'UGLIER', 'MIGUEL'],
  ['ORANGE', 'LONGER', 'LEGION', 'MINGLE', 'MIGUEL'],
  ['PLANET', 'PANELS', 'SALINE', 'SINGLE', 'MINGLE', 'MIGUEL'],
];

export const GATE_WORDS = [
  'MINGLE',
  'LEGUME',
  'HELIUM',
  'MUESLI',
  'GIMLET',
  'MILIEU',
  'UGLIER',
  'ILLUME',
];
