import { describe, expect, it, vi } from 'vitest';
import {
  Dictionary,
  loadGameData,
  loadUnlimitedPool,
  normalize,
  sortedKey,
} from '../src/engine/words';

const DATA = {
  CASTLE: [4, 4],
  CLEATS: [4, 4],
  ECLATS: [4, null],
  MIGGLE: [1, null],
  TASSEL: [-1, null],
  MIGUEL: [0, 0],
} as const;

describe('normalize / sortedKey', () => {
  it('upper-cases and trims', () => {
    expect(normalize('  castle\n')).toBe('CASTLE');
  });

  it('sorts letters, keeping duplicates', () => {
    expect(sortedKey('MIGGLE')).toBe('EGGILM');
    expect(sortedKey('CASTLE')).toBe(sortedKey('CLEATS'));
  });
});

describe('Dictionary', () => {
  const dict = new Dictionary(DATA);

  it('looks up entries', () => {
    expect(dict.size).toBe(6);
    expect(dict.has('CASTLE')).toBe(true);
    expect(dict.has('castle')).toBe(false); // callers normalize first
    expect(dict.entry('MIGGLE')).toEqual([1, null]);
    expect(dict.entry('ZZZZZZ')).toBeUndefined();
  });

  it('reports distances', () => {
    expect(dict.fullDist('CASTLE')).toBe(4);
    expect(dict.fullDist('TASSEL')).toBe(-1);
    expect(dict.fullDist('ZZZZZZ')).toBeUndefined();
    expect(dict.par('CASTLE')).toBe(4);
    expect(dict.par('MIGGLE')).toBeNull();
    expect(dict.par('ZZZZZZ')).toBeNull();
  });

  it('finds anagrams by sorted key, alphabetically', () => {
    expect(dict.withKey('ACELST')).toEqual(['CASTLE', 'CLEATS', 'ECLATS']);
    expect(dict.withKey('EGILMU')).toEqual(['MIGUEL']);
    expect(dict.withKey('AAAAAA')).toEqual([]);
  });
});

describe('loadGameData', () => {
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it('fetches both files from the base URL and caches the result', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith('words.json') ? ok(DATA) : ok(['CASTLE']),
    );
    const data = await loadGameData('/cache-test/', fetchFn);
    const again = await loadGameData('/cache-test/', fetchFn);
    expect(again.dict).toBe(data.dict); // the anagram index is built once
    expect(data.dict.par('CASTLE')).toBe(4);
    expect(data.daily).toEqual(['CASTLE']);
    expect(fetchFn.mock.calls.map(([u]) => u)).toEqual([
      '/cache-test/words.json',
      '/cache-test/daily.json',
    ]);
  });

  it('loads the unlimited pool through the same cache', async () => {
    const fetchFn = vi.fn(async () => ok(['CASTLE', 'ORANGE']));
    expect(await loadUnlimitedPool('/pool-test/', fetchFn)).toEqual(['CASTLE', 'ORANGE']);
    await loadUnlimitedPool('/pool-test/', fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/pool-test/unlimited.json');
  });

  it('defaults to the site data directory', async () => {
    const fetchFn = vi.fn(async () => ok({}));
    await loadGameData(undefined, fetchFn);
    expect(fetchFn).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}data/words.json`);
  });

  it('rejects on HTTP errors and lets the caller retry', async () => {
    const failing = vi.fn(async () => new Response('nope', { status: 404 }));
    await expect(loadGameData('/retry-test/', failing)).rejects.toThrow(
      'Failed to load words.json: HTTP 404',
    );
    const working = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith('words.json') ? ok(DATA) : ok([]),
    );
    await expect(loadGameData('/retry-test/', working)).resolves.toMatchObject({ daily: [] });
    expect(working).toHaveBeenCalledTimes(2);
  });
});
