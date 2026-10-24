import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { TARGET, WORD_LEN } from '../src/config';

type Entry = [fullDist: number, par: number | null];

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const wordsRaw = read('public/data/words.json');
const dailyRaw = read('public/data/daily.json');
const words = JSON.parse(wordsRaw) as Record<string, Entry>;
const daily = JSON.parse(dailyRaw) as string[];

/** Same format as scripts/build_data.py: whitespace-separated words, # comments. */
function curationList(name: string): string[] {
  return read(`data-src/${name}`)
    .split('\n')
    .flatMap((line) => (line.split('#')[0] ?? '').split(/\s+/))
    .filter(Boolean)
    .map((w) => w.toUpperCase());
}

const sortKey = (w: string) => [...w].sort().join('');

// Words grouped by sorted letters, for neighbour lookup (one letter swapped, then any order).
const buckets = new Map<string, string[]>();
for (const w of Object.keys(words)) {
  const k = sortKey(w);
  buckets.set(k, [...(buckets.get(k) ?? []), w]);
}

function neighbours(word: string): string[] {
  const k = sortKey(word);
  const out = new Set<string>();
  for (let i = 0; i < k.length; i++) {
    const rest = k.slice(0, i) + k.slice(i + 1);
    for (let c = 65; c <= 90; c++) {
      const added = String.fromCharCode(c);
      if (added === k[i]) continue;
      for (const n of buckets.get(sortKey(rest + added)) ?? []) out.add(n);
    }
  }
  return [...out];
}

const GATE_WORDS = ['MINGLE', 'LEGUME', 'HELIUM', 'MUESLI', 'GIMLET', 'MILIEU', 'UGLIER', 'ILLUME'];

describe('words.json', () => {
  it('has well-formed entries', () => {
    expect(Object.keys(words).length).toBeGreaterThan(10_000);
    for (const [w, [full, par]] of Object.entries(words)) {
      expect(w).toMatch(new RegExp(`^[A-Z]{${WORD_LEN}}$`));
      expect(Number.isInteger(full) && full >= -1).toBe(true);
      if (par !== null) expect(par).toBeGreaterThanOrEqual(full);
      if (full === -1) expect(par).toBeNull();
    }
    expect(words[TARGET]).toEqual([0, 0]);
  });

  it('puts every gate word one step from MIGUEL, counting for par', () => {
    for (const w of GATE_WORDS) expect(words[w], w).toEqual([1, 1]);
    expect(words.MIGGLE?.[0]).toBe(1);
  });

  it('has consistent full distances (BFS invariant)', () => {
    for (const [w, [full]] of Object.entries(words)) {
      if (w === TARGET) continue;
      const ds = neighbours(w)
        .map((n) => words[n]![0])
        .filter((d) => d >= 0);
      if (full === -1) {
        expect(ds, w).toEqual([]);
      } else {
        expect(Math.min(...ds), w).toBe(full - 1);
      }
    }
  });

  it('has consistent par over common words (BFS invariant)', () => {
    for (const [w, [, par]] of Object.entries(words)) {
      if (w === TARGET || par === null) continue;
      const ps = neighbours(w)
        .map((n) => words[n]![1])
        .filter((p): p is number => p !== null);
      expect(Math.min(...ps), w).toBe(par - 1);
    }
  });

  it('accepts every word of the example ladders', () => {
    const ladders = [
      'CASTLE CLAUSE MUSCLE MUESLI MIGUEL',
      'BRIDGE FRIDGE FIGURE UGLIER MIGUEL',
      'ORANGE LONGER LEGION MINGLE MIGUEL',
      'PLANET PANELS SALINE SINGLE MINGLE MIGUEL',
    ];
    for (const ladder of ladders) {
      const steps = ladder.split(' ');
      for (const w of steps) expect(words[w], w).toBeDefined();
      for (let i = 1; i < steps.length; i++) {
        expect(neighbours(steps[i - 1]!), ladder).toContain(steps[i]);
      }
      expect(words[steps[0]!]![1]).toBeLessThanOrEqual(steps.length - 1);
    }
  });
});

describe('daily.json', () => {
  it('lasts at least three years with no repeated word or anagram family', () => {
    expect(daily.length).toBeGreaterThanOrEqual(3 * 365 + 1);
    expect(new Set(daily).size).toBe(daily.length);
    expect(new Set(daily.map(sortKey)).size).toBe(daily.length);
  });

  it('only uses reachable common words with par 4–7', () => {
    for (const w of daily) {
      const [full, par] = words[w] ?? [-1, null];
      expect(full, w).toBeGreaterThan(0);
      expect(par, w).toBeGreaterThanOrEqual(4);
      expect(par, w).toBeLessThanOrEqual(7);
    }
  });

  it('never starts on an excluded word', () => {
    const excluded = new Set(curationList('daily-exclude.txt'));
    expect(daily.filter((w) => excluded.has(w))).toEqual([]);
  });
});

describe('curation', () => {
  it('removes every blocklisted word', () => {
    const blocked = curationList('blocklist.txt');
    expect(blocked.length).toBeGreaterThan(0);
    for (const w of blocked) {
      expect(words[w], w).toBeUndefined();
      expect(daily).not.toContain(w);
    }
  });

  it('keeps the data small (< 400 KB gzipped)', () => {
    const gz = gzipSync(wordsRaw).length + gzipSync(dailyRaw).length;
    expect(gz).toBeLessThan(400 * 1024);
  });
});
