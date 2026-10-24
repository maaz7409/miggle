import { describe, expect, it } from 'vitest';
import { describeHint, nextHint, withArticle } from '../src/engine/hints';
import { scoreLadder } from '../src/engine/scoring';
import {
  DIFFICULTIES,
  completePuzzle,
  earnsHint,
  isDifficulty,
  newRun,
  pickPuzzle,
  puzzlePool,
  stepLimit,
  useRunHint,
} from '../src/engine/unlimited';
import { readRepoFile, realDict } from './helpers';

const pool = JSON.parse(readRepoFile('public/data/unlimited.json')) as string[];

describe('hints', () => {
  it('points along the par path', () => {
    const hint = nextHint(['CASTLE'], realDict)!;
    expect(hint.from).toBe('CASTLE');
    expect(realDict.par(hint.next)).toBe(realDict.par('CASTLE')! - 1);
    expect(hint.change).toMatchObject({ removed: expect.any(String), added: expect.any(String) });
  });

  it('never suggests a word already in the ladder', () => {
    const first = nextHint(['CASTLE'], realDict)!.next;
    // Pretend the player already visited the obvious next word, then came back.
    const hint = nextHint([first, 'CASTLE'], realDict)!;
    expect(hint.next).not.toBe(first);
  });

  it('is null at MIGUEL or with an empty ladder', () => {
    expect(nextHint(['MIGGLE', 'MIGUEL'], realDict)).toBeNull();
    expect(nextHint([], realDict)).toBeNull();
  });

  it('describes the swap with the right article, then the word', () => {
    const hint = nextHint(['MIGGLE'], realDict)!;
    expect(hint.next).toBe('MIGUEL');
    expect(describeHint(hint, 1)).toBe('Swap a G for a U');
    expect(describeHint(hint, 2)).toBe('Try MIGUEL');
    expect(withArticle('S')).toBe('an S');
    expect(withArticle('U')).toBe('a U');
    expect(withArticle('H')).toBe('an H');
  });
});

describe('unlimited.json pool', () => {
  it('only holds reachable common words, alphabetically, par 3+', () => {
    expect(pool).toEqual([...pool].sort());
    for (const w of pool) {
      expect(realDict.fullDist(w), w).toBeGreaterThan(0);
      expect(realDict.par(w), w).toBeGreaterThanOrEqual(3);
    }
  });

  it('has plenty of puzzles at every difficulty', () => {
    for (const d of ['easy', 'medium', 'hard'] as const) {
      const words = puzzlePool(pool, realDict, d);
      expect(words.length, d).toBeGreaterThanOrEqual(100);
      for (const w of words) {
        expect(realDict.par(w)).toBeGreaterThanOrEqual(DIFFICULTIES[d].minPar);
        expect(realDict.par(w)).toBeLessThanOrEqual(DIFFICULTIES[d].maxPar);
      }
    }
  });
});

describe('unlimited runs', () => {
  it('picks unused words, repeating only once the pool runs dry', () => {
    const words = ['A', 'B', 'C'];
    expect(pickPuzzle(words, ['A', 'B'], () => 0.99)).toBe('C');
    expect(pickPuzzle(words, [], () => 0)).toBe('A');
    expect(pickPuzzle(words, [], () => 0.5)).toBe('B');
    expect(pickPuzzle(words, ['A', 'B', 'C'], () => 0.4)).toBe('B');
    expect(() => pickPuzzle([], [])).toThrow();
  });

  it('limits steps only on Hard', () => {
    expect(stepLimit('easy', 3)).toBeNull();
    expect(stepLimit('medium', 6)).toBeNull();
    expect(stepLimit('hard', 7)).toBe(9);
  });

  it('grows the streak and earns a hint at or under par', () => {
    const ladder = ['CASTLE', 'CLAUSE', 'MUSCLE', 'MUESLI', 'MIGUEL'];
    let run = newRun('medium');
    run = completePuzzle(run, scoreLadder(ladder, 4)); // par
    run = completePuzzle(run, scoreLadder(ladder, 3)); // one extra
    run = completePuzzle(run, scoreLadder(ladder, 5)); // under par
    expect(run).toMatchObject({ difficulty: 'medium', streak: 3, hints: 2 });
    expect(earnsHint(scoreLadder(ladder, 3))).toBe(false);
  });

  it('spends hints from the bank, never below zero', () => {
    const run = { ...newRun('easy'), hints: 1 };
    expect(useRunHint(run).hints).toBe(0);
    const empty = useRunHint(useRunHint(run));
    expect(empty.hints).toBe(0);
  });

  it('recognises difficulty names', () => {
    expect(isDifficulty('hard')).toBe(true);
    expect(isDifficulty('extreme')).toBe(false);
    expect(isDifficulty(3)).toBe(false);
  });
});
