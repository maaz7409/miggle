import { STORAGE_PREFIX } from './config';

/** The subset of the Web Storage API we use; tests swap in an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let override: KeyValueStore | null | undefined;

/** Replace the backing store (tests). `undefined` restores localStorage. */
export function setStorageBackend(store: KeyValueStore | null | undefined): void {
  override = store;
}

function backend(): KeyValueStore | null {
  if (override !== undefined) return override;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // e.g. blocked site data
  }
}

/**
 * Read and parse `miggle.<key>`. Returns `fallback` if storage is unavailable, the key is missing,
 * the JSON is invalid, or `sanitize` rejects it (by returning null).
 */
export function readJson<T>(key: string, fallback: T, sanitize?: (raw: unknown) => T | null): T {
  try {
    const raw = backend()?.getItem(STORAGE_PREFIX + key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return sanitize ? (sanitize(parsed) ?? fallback) : (parsed as T);
  } catch {
    return fallback;
  }
}

/** Write `miggle.<key>`. Returns false if storage is unavailable or full. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    const store = backend();
    if (!store) return false;
    store.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    backend()?.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Nothing to do: storage is unavailable.
  }
}
