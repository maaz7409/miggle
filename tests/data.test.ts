import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { EPOCH, TARGET, WORD_LEN } from '../src/config';
import { DAY_MS } from '../src/engine/daily';
import { neighbours } from '../src/engine/solver';
import { sortedKey } from '../src/engine/words';
import {
  EXAMPLE_LADDERS,
  GATE_WORDS,
  curationList,
  daily,
  readRepoFile,
  dailyRaw,
  realDict,
  wordData,
  wordsRaw,
} from './helpers';

describe('words.json', () => {
  it('has well-formed entries', () => {
    expect(realDict.size).toBeGreaterThan(10_000);
    for (const [w, [full, par]] of Object.entries(wordData)) {
      expect(w).toMatch(new RegExp(`^[A-Z]{${WORD_LEN}}$`));
      expect(Number.isInteger(full) && full >= -1).toBe(true);
      if (par !== null) expect(par).toBeGreaterThanOrEqual(full);
      if (full === -1) expect(par).toBeNull();
    }
    expect(wordData[TARGET]).toEqual([0, 0]);
  });

  it('puts every gate word one step from MIGUEL, counting for par', () => {
    for (const w of GATE_WORDS) expect(wordData[w], w).toEqual([1, 1]);
    expect(realDict.fullDist('MIGGLE')).toBe(1);
  });

  it('has consistent full distances (BFS invariant)', () => {
    for (const [w, [full]] of Object.entries(wordData)) {
      if (w === TARGET) continue;
      const ds = neighbours(w, realDict)
        .map((n) => realDict.fullDist(n)!)
        .filter((d) => d >= 0);
      if (full === -1) {
        expect(ds, w).toEqual([]);
      } else {
        expect(Math.min(...ds), w).toBe(full - 1);
      }
    }
  });

  it('has consistent par over common words (BFS invariant)', () => {
    for (const [w, [, par]] of Object.entries(wordData)) {
      if (w === TARGET || par === null) continue;
      const ps = neighbours(w, realDict)
        .map((n) => realDict.par(n))
        .filter((p): p is number => p !== null);
      expect(Math.min(...ps), w).toBe(par - 1);
    }
  });

  it('accepts every word of the example ladders', () => {
    for (const ladder of EXAMPLE_LADDERS) {
      for (const w of ladder) expect(realDict.has(w), w).toBe(true);
      for (let i = 1; i < ladder.length; i++) {
        expect(neighbours(ladder[i - 1]!, realDict), ladder.join(' ')).toContain(ladder[i]);
      }
      expect(realDict.par(ladder[0]!)).toBeLessThanOrEqual(ladder.length - 1);
    }
  });
});

describe('daily.json', () => {
  it('lasts at least three years with no repeated word or anagram family', () => {
    expect(daily.length).toBeGreaterThanOrEqual(3 * 365 + 1);
    expect(new Set(daily).size).toBe(daily.length);
    expect(new Set(daily.map(sortedKey)).size).toBe(daily.length);
  });

  it('only uses reachable common words with par 4–7', () => {
    for (const w of daily) {
      expect(realDict.fullDist(w), w).toBeGreaterThan(0);
      expect(realDict.par(w), w).toBeGreaterThanOrEqual(4);
      expect(realDict.par(w), w).toBeLessThanOrEqual(7);
    }
  });

  it('never starts on an excluded word, except in already-published (frozen) days', () => {
    const excluded = new Set(curationList('daily-exclude.txt'));
    // Mirrors freeze_published() in build_data.py: published days + FREEZE_AHEAD_DAYS (2).
    const published = Math.max(0, Math.floor((Date.now() - EPOCH) / DAY_MS) + 1) + 2;
    expect(daily.slice(published).filter((w) => excluded.has(w))).toEqual([]);
  });
});

describe('build_data.py', () => {
  it('freezes published days from the same launch instant as EPOCH', () => {
    const py = readRepoFile('scripts/build_data.py');
    const m = py.match(/LAUNCH_UTC = datetime\.datetime\((\d+), (\d+), (\d+), (\d+), (\d+)/)!;
    const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
    expect(Date.UTC(y, mo - 1, d, h, mi)).toBe(EPOCH);
  });
});

describe('curation', () => {
  it('removes every blocklisted word', () => {
    const blocked = curationList('blocklist.txt');
    expect(blocked.length).toBeGreaterThan(0);
    for (const w of blocked) {
      expect(realDict.has(w), w).toBe(false);
      expect(daily).not.toContain(w);
    }
  });

  it('keeps the data small (< 400 KB gzipped)', () => {
    const gz = gzipSync(wordsRaw).length + gzipSync(dailyRaw).length;
    expect(gz).toBeLessThan(400 * 1024);
  });
});
