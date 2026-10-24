/** [fullDist, par]: steps to MIGUEL over all accepted words (-1 = dead end) and over common words. */
export type WordEntry = readonly [fullDist: number, par: number | null];

/** Shape of public/data/words.json. */
export type WordData = Readonly<Record<string, WordEntry>>;

/** Upper-cased, trimmed form used everywhere in the engine. */
export function normalize(word: string): string {
  return word.trim().toUpperCase();
}

/** The word's letters in alphabetical order; anagrams share a key. */
export function sortedKey(word: string): string {
  return [...word].sort().join('');
}

/** Accepted words with their distances, indexed for anagram lookup. */
export class Dictionary {
  private readonly entries: ReadonlyMap<string, WordEntry>;
  private byKey: Map<string, string[]> | undefined;

  constructor(data: WordData) {
    this.entries = new Map(Object.entries(data));
  }

  get size(): number {
    return this.entries.size;
  }

  has(word: string): boolean {
    return this.entries.has(word);
  }

  entry(word: string): WordEntry | undefined {
    return this.entries.get(word);
  }

  /** Steps to MIGUEL using any accepted word; -1 for a dead end, undefined if not a word. */
  fullDist(word: string): number | undefined {
    return this.entries.get(word)?.[0];
  }

  /** Steps to MIGUEL using common words only; null if not common or unreachable that way. */
  par(word: string): number | null {
    return this.entries.get(word)?.[1] ?? null;
  }

  /** Every accepted word whose sorted letters equal `key`, alphabetically. */
  withKey(key: string): readonly string[] {
    if (!this.byKey) {
      this.byKey = new Map();
      for (const w of [...this.entries.keys()].sort()) {
        const k = sortedKey(w);
        const bucket = this.byKey.get(k);
        if (bucket) bucket.push(w);
        else this.byKey.set(k, [w]);
      }
    }
    return this.byKey.get(key) ?? [];
  }
}

export interface GameData {
  dict: Dictionary;
  /** Daily start words in puzzle order. */
  daily: readonly string[];
}

const cache = new Map<string, Promise<GameData>>();

/**
 * Fetch and cache words.json and daily.json from `baseUrl`.
 * A failed load is evicted from the cache so the caller can retry.
 */
export function loadGameData(
  baseUrl = `${import.meta.env.BASE_URL}data/`,
  fetchFn: typeof fetch = fetch,
): Promise<GameData> {
  let pending = cache.get(baseUrl);
  if (!pending) {
    const getJson = async <T>(name: string): Promise<T> => {
      const res = await fetchFn(`${baseUrl}${name}`);
      if (!res.ok) throw new Error(`Failed to load ${name}: HTTP ${res.status}`);
      return (await res.json()) as T;
    };
    pending = Promise.all([getJson<WordData>('words.json'), getJson<string[]>('daily.json')]).then(
      ([words, daily]) => ({ dict: new Dictionary(words), daily }),
    );
    pending.catch(() => cache.delete(baseUrl));
    cache.set(baseUrl, pending);
  }
  return pending;
}
