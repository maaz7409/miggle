import { describe, expect, it } from 'vitest';
import { TARGET } from '../src/config';
import { validateStep } from '../src/engine/rules';
import { neighbours, nextOnShortestPath, shortestPath } from '../src/engine/solver';
import { Dictionary } from '../src/engine/words';
import { GATE_WORDS, daily, realDict, wordData } from './helpers';

describe('neighbours', () => {
  it('finds every gate word next to MIGUEL', () => {
    const ns = neighbours('MIGUEL', realDict);
    for (const w of [...GATE_WORDS, 'MIGGLE']) expect(ns).toContain(w);
  });

  it('returns sorted, unique words one swap away, never anagrams of the word', () => {
    const ns = neighbours('CASTLE', realDict);
    expect(ns).toEqual([...new Set(ns)].sort());
    expect(ns).toContain('CLAUSE');
    expect(ns).not.toContain('CASTLE');
    expect(ns).not.toContain('CLEATS');
  });

  it('handles duplicate letters', () => {
    expect(neighbours('MIGGLE', realDict)).toContain('MIGUEL');
    expect(neighbours('ILLUME', realDict)).toContain('MIGUEL');
  });
});

describe('nextOnShortestPath', () => {
  // Distances are made up; only the neighbour relation is real.
  const dict = new Dictionary({
    SINGLE: [3, null],
    DINGLE: [2, null],
    MINGLE: [2, 2],
    TINGLE: [2, 3],
    SIGNAL: [4, 4],
    MIGUEL: [0, 0],
  });

  it('prefers a common word among equally short options', () => {
    // DINGLE sorts first but is obscure.
    expect(nextOnShortestPath('SINGLE', dict)).toBe('MINGLE');
  });

  it('follows par from a common word, even if an obscure word is shorter', () => {
    expect(nextOnShortestPath('ANIMAL', realDict)).toBe('ANEMIA'); // par path
    expect(realDict.fullDist('ANIMAL')).toBeLessThan(realDict.par('ANIMAL')!);
  });

  it('skips excluded words and still makes progress', () => {
    // TINGLE is common (has a par) so it beats DINGLE at the same full distance.
    expect(nextOnShortestPath('SINGLE', dict, ['MINGLE'])).toBe('TINGLE');
    expect(nextOnShortestPath('SINGLE', dict, ['MINGLE', 'TINGLE'])).toBe('DINGLE');
    const first = nextOnShortestPath('CASTLE', realDict)!;
    const other = nextOnShortestPath('CASTLE', realDict, [first])!;
    expect(other).not.toBe(first);
    expect(validateStep(['CASTLE', first], other, realDict).ok).toBe(true);
  });

  it('returns null when there is nowhere to go', () => {
    expect(nextOnShortestPath('MIGUEL', realDict)).toBeNull();
    expect(nextOnShortestPath('ZZZZZZ', realDict)).toBeNull();
    const deadEnd = Object.keys(wordData).find((w) => realDict.fullDist(w) === -1)!;
    expect(nextOnShortestPath(deadEnd, realDict)).toBeNull();
    expect(nextOnShortestPath('SINGLE', dict, ['MINGLE', 'DINGLE', 'TINGLE', 'SIGNAL'])).toBeNull();
  });
});

describe('shortestPath', () => {
  it('reaches MIGUEL in exactly par steps from every daily word, using common words', () => {
    for (const start of daily) {
      const path = shortestPath(start, realDict)!;
      expect(path.length - 1, start).toBe(realDict.par(start));
      expect(path.at(-1)).toBe(TARGET);
      for (const w of path) expect(realDict.par(w), `${start}: ${w}`).not.toBeNull();
    }
  });

  it('produces ladders that validate step by step', () => {
    for (const start of daily.slice(0, 50)) {
      const path = shortestPath(start, realDict)!;
      for (let i = 1; i < path.length; i++) {
        expect(validateStep(path.slice(0, i), path[i]!, realDict).ok, path.join(' ')).toBe(true);
      }
    }
  });

  it('reaches MIGUEL in fullDist steps from an obscure word', () => {
    expect(shortestPath('MIGGLE', realDict)).toEqual(['MIGGLE', 'MIGUEL']);
    const obscure = Object.keys(wordData).filter(
      (w) => realDict.par(w) === null && realDict.fullDist(w)! > 0,
    );
    for (const w of obscure.slice(0, 200)) {
      const path = shortestPath(w, realDict);
      expect(path?.at(-1), w).toBe(TARGET);
    }
  });

  it('handles MIGUEL itself, dead ends and unknown words', () => {
    expect(shortestPath('MIGUEL', realDict)).toEqual(['MIGUEL']);
    const deadEnd = Object.keys(wordData).find((w) => realDict.fullDist(w) === -1)!;
    expect(shortestPath(deadEnd, realDict)).toBeNull();
    expect(shortestPath('ZZZZZZ', realDict)).toBeNull();
  });
});
