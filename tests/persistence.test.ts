import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseDateParam } from '../src/clock';
import { newGame, restoreGame, submit, typeLetter, type GameState } from '../src/engine/game';
import { scoreLadder } from '../src/engine/scoring';
import {
  currentStreak,
  emptyStats,
  emptyUnlimitedStats,
  loadUnlimitedStats,
  recordUnlimitedWin,
  sanitizeUnlimitedStats,
  saveUnlimitedStats,
  histogramBuckets,
  loadStats,
  recordWin,
  sanitizeStats,
  saveStats,
} from '../src/stats';
import {
  readJson,
  removeKey,
  setStorageBackend,
  writeJson,
  type KeyValueStore,
} from '../src/storage';
import { freshToday, loadToday, saveToday } from '../src/today';
import { loadUnlimited, recordFor, saveUnlimited } from '../src/unlimited-record';
import { realDict } from './helpers';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
}

const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  setStorageBackend(store);
});
afterEach(() => setStorageBackend(undefined));

function play(start: string, words: string[], input = ''): GameState {
  let state = newGame(start);
  for (const w of words) state = submit({ ...state, input: w }, realDict).state;
  return [...input].reduce(typeLetter, state);
}

describe('storage', () => {
  it('prefixes keys and round-trips JSON', () => {
    expect(writeJson('x', { a: 1 })).toBe(true);
    expect(store.data.get('miggle.x')).toBe('{"a":1}');
    expect(readJson('x', null)).toEqual({ a: 1 });
    removeKey('x');
    expect(readJson('x', 'gone')).toBe('gone');
  });

  it('falls back on bad JSON or a rejected value', () => {
    store.data.set('miggle.bad', '{oops');
    expect(readJson('bad', 7)).toBe(7);
    writeJson('n', 5);
    expect(readJson('n', 0, (raw) => (raw === 6 ? 6 : null))).toBe(0);
  });

  it('survives storage that throws or is missing', () => {
    setStorageBackend(throwing);
    expect(writeJson('x', 1)).toBe(false);
    expect(readJson('x', 'fallback')).toBe('fallback');
    expect(() => removeKey('x')).not.toThrow();
    setStorageBackend(null);
    expect(writeJson('x', 1)).toBe(false);
    expect(readJson('x', 'fallback')).toBe('fallback');
    setStorageBackend(undefined); // real localStorage: absent under Node
    expect(readJson('x', 'fallback')).toBe('fallback');
  });
});

describe('restoreGame', () => {
  it('replays a saved ladder and keeps the typed input', () => {
    const saved = play('CASTLE', ['CLAUSE', 'MUSCLE'], 'MUE');
    expect(restoreGame(JSON.parse(JSON.stringify(saved)), 'CASTLE', realDict)).toEqual(saved);
  });

  it('restores a won game', () => {
    const won = play('CASTLE', ['CLAUSE', 'MUSCLE', 'MUESLI', 'MIGUEL']);
    expect(restoreGame(won, 'CASTLE', realDict)).toEqual(won);
  });

  it.each([
    ['not an object', 'CASTLE'],
    ['wrong start word', { ladder: ['BRIDGE'], input: '' }],
    ['illegal step', { ladder: ['CASTLE', 'BRIDGE'], input: '' }],
    ['non-string word', { ladder: ['CASTLE', 42], input: '' }],
    ['words after the win', { ladder: ['MIGGLE', 'MIGUEL', 'MIGGLE'], input: '' }],
    ['bad input', { ladder: ['CASTLE'], input: 'abc' }],
    ['overlong input', { ladder: ['CASTLE'], input: 'ABCDEFG' }],
    ['missing ladder', { input: '' }],
  ])('rejects %s', (_, saved) => {
    const start = (saved as { ladder?: string[] }).ladder?.[0] === 'MIGGLE' ? 'MIGGLE' : 'CASTLE';
    expect(restoreGame(saved, start, realDict)).toBeNull();
  });
});

describe('today record', () => {
  it('starts fresh when nothing is saved', () => {
    expect(loadToday(3, 'CASTLE', realDict)).toEqual(freshToday(3, 'CASTLE'));
  });

  it('restores the same day, including the counted flag and first solve', () => {
    const solved = play('CASTLE', ['CLAUSE', 'MUSCLE', 'MUESLI', 'MIGUEL']);
    const record = {
      day: 3,
      state: play('CASTLE', ['CLAUSE'], 'MU'),
      counted: true,
      solved: solved.ladder,
      hints: 1,
    };
    saveToday(record);
    expect(loadToday(3, 'CASTLE', realDict)).toEqual(record);
  });

  it('resets on a new day', () => {
    saveToday({ ...freshToday(3, 'CASTLE'), state: play('CASTLE', ['CLAUSE']), counted: true });
    expect(loadToday(4, 'BRIDGE', realDict)).toEqual(freshToday(4, 'BRIDGE'));
  });

  it('resets when the saved ladder no longer validates', () => {
    store.data.set(
      'miggle.today',
      JSON.stringify({
        day: 3,
        state: { ladder: ['CASTLE', 'ZZZZZZ'], input: '' },
        counted: false,
      }),
    );
    expect(loadToday(3, 'CASTLE', realDict)).toEqual(freshToday(3, 'CASTLE'));
  });

  it('drops an invalid first-solve ladder but keeps the rest', () => {
    saveToday({ ...freshToday(3, 'CASTLE'), counted: true, solved: ['CASTLE', 'CLAUSE'] });
    expect(loadToday(3, 'CASTLE', realDict)).toMatchObject({ counted: true, solved: null });
  });

  it('clamps the hint count', () => {
    saveToday({ ...freshToday(3, 'CASTLE'), hints: 9 });
    expect(loadToday(3, 'CASTLE', realDict).hints).toBe(2);
    store.data.set('miggle.today', JSON.stringify({ ...freshToday(3, 'CASTLE'), hints: 'lots' }));
    expect(loadToday(3, 'CASTLE', realDict).hints).toBe(0);
  });

  it('ignores garbage', () => {
    store.data.set('miggle.today', '"hello"');
    expect(loadToday(3, 'CASTLE', realDict)).toEqual(freshToday(3, 'CASTLE'));
  });
});

describe('stats', () => {
  it('counts wins, extra steps and streaks', () => {
    let s = recordWin(emptyStats(), 5, 0);
    s = recordWin(s, 6, 2);
    s = recordWin(s, 7, -1);
    expect(s).toEqual({
      wins: 3,
      streak: 3,
      bestStreak: 3,
      lastWin: 7,
      histogram: { 0: 1, 2: 1, [-1]: 1 },
    });
  });

  it('counts only the first win of a day', () => {
    const s = recordWin(emptyStats(), 5, 0);
    expect(recordWin(s, 5, 3)).toBe(s);
    expect(recordWin(s, 4, 3)).toBe(s); // never backwards
  });

  it('restarts the streak after a missed day but keeps the best', () => {
    let s = recordWin(recordWin(emptyStats(), 1, 0), 2, 0);
    s = recordWin(s, 4, 1);
    expect(s).toMatchObject({ streak: 1, bestStreak: 2, wins: 3 });
  });

  it('shows a streak as alive until a whole day is missed', () => {
    const s = recordWin(recordWin(emptyStats(), 1, 0), 2, 0);
    expect(currentStreak(s, 2)).toBe(2);
    expect(currentStreak(s, 3)).toBe(2); // not played yet today
    expect(currentStreak(s, 4)).toBe(0);
    expect(currentStreak(emptyStats(), 1)).toBe(0);
  });

  it('buckets the histogram for display', () => {
    let s = emptyStats();
    for (const [day, extra] of [
      [1, -2],
      [2, -1],
      [3, 0],
      [4, 1],
      [5, 4],
      [6, 5],
      [7, 9],
    ] as const) {
      s = recordWin(s, day, extra);
    }
    const buckets = histogramBuckets(s);
    expect(buckets.map((b) => [b.label, b.count])).toEqual([
      ['Under', 2],
      ['Par', 1],
      ['+1', 1],
      ['+2', 0],
      ['+3', 0],
      ['+4', 1],
      ['+5', 2],
    ]);
    expect(buckets.find((b) => b.matches(7))?.label).toBe('+5');
    expect(buckets.find((b) => b.matches(-3))?.label).toBe('Under');
  });

  it('round-trips through storage and rejects malformed data', () => {
    const s = recordWin(emptyStats(), 9, 1);
    saveStats(s);
    expect(loadStats()).toEqual(s);
    for (const bad of [
      null,
      'x',
      { ...s, wins: -1 },
      { ...s, lastWin: 0 },
      { ...s, histogram: null },
      { ...s, streak: 1.5 },
    ]) {
      expect(sanitizeStats(bad)).toBeNull();
    }
    expect(sanitizeStats({ ...s, histogram: { 1: 2, x: 3, 2: -1 } })?.histogram).toEqual({ 1: 2 });
    expect(sanitizeStats({ ...s, streak: 4, bestStreak: 2 })?.bestStreak).toBe(4);
    store.data.set('miggle.stats', '{"wins":"lots"}');
    expect(loadStats()).toEqual(emptyStats());
  });
});

describe('parseDateParam', () => {
  it('reads a bare date as noon UTC and full timestamps as given', () => {
    expect(parseDateParam('2026-11-02')).toBe(Date.parse('2026-11-02T12:00:00Z'));
    expect(parseDateParam('2026-11-02T07:59:50Z')).toBe(Date.parse('2026-11-02T07:59:50Z'));
    expect(parseDateParam('soon')).toBeNaN();
  });
});

describe('unlimited record', () => {
  const run = { difficulty: 'hard' as const, streak: 2, used: ['RABIES', 'CASTLE'], hints: 1 };

  it('round-trips a run in progress', () => {
    const record = {
      run,
      start: 'CASTLE',
      state: play('CASTLE', ['CLAUSE'], 'MU'),
      forfeited: false,
    };
    saveUnlimited(record);
    expect(loadUnlimited(realDict)).toEqual(record);
    expect(recordFor(run, 'BRIDGE')).toEqual({
      run,
      start: 'BRIDGE',
      state: newGame('BRIDGE'),
      forfeited: false,
    });
  });

  it.each([
    ['nothing saved', undefined],
    [
      'bad difficulty',
      { run: { ...run, difficulty: 'insane' }, start: 'CASTLE', state: newGame('CASTLE') },
    ],
    ['bad streak', { run: { ...run, streak: -1 }, start: 'CASTLE', state: newGame('CASTLE') }],
    ['bad used list', { run: { ...run, used: [1] }, start: 'CASTLE', state: newGame('CASTLE') }],
    ['unknown start', { run, start: 'ZZZZZZ', state: newGame('ZZZZZZ') }],
    [
      'invalid ladder',
      { run, start: 'CASTLE', state: { ladder: ['CASTLE', 'BRIDGE'], input: '' } },
    ],
    ['missing run', { start: 'CASTLE', state: newGame('CASTLE') }],
  ])('rejects %s', (_, value) => {
    if (value !== undefined) store.data.set('miggle.unlimited', JSON.stringify(value));
    expect(loadUnlimited(realDict)).toBeNull();
  });
});

describe('unlimited stats', () => {
  const ladder = ['CASTLE', 'CLAUSE', 'MUSCLE', 'MUESLI', 'MIGUEL'];

  it('tallies solves, par-or-better solves and best streak per difficulty', () => {
    let s = recordUnlimitedWin(emptyUnlimitedStats(), 'hard', scoreLadder(ladder, 4), 1);
    s = recordUnlimitedWin(s, 'hard', scoreLadder(ladder, 3), 2);
    s = recordUnlimitedWin(s, 'hard', scoreLadder(ladder, 5), 1);
    expect(s.hard).toEqual({ solved: 3, perfect: 2, bestStreak: 2 });
    expect(s.easy).toEqual({ solved: 0, perfect: 0, bestStreak: 0 });
    saveUnlimitedStats(s);
    expect(loadUnlimitedStats()).toEqual(s);
  });

  it('drops malformed tallies', () => {
    expect(sanitizeUnlimitedStats('x')).toBeNull();
    const s = sanitizeUnlimitedStats({
      easy: { solved: 1, perfect: 1, bestStreak: 1 },
      hard: { solved: -2 },
    });
    expect(s?.easy.solved).toBe(1);
    expect(s?.hard).toEqual({ solved: 0, perfect: 0, bestStreak: 0 });
  });
});
