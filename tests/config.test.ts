import { describe, expect, it } from 'vitest';
import { EPOCH, RESET_HOUR_UTC, STORAGE_PREFIX, TARGET, WORD_LEN } from '../src/config';

describe('config', () => {
  it('target is an upper-case word of WORD_LEN letters', () => {
    expect(TARGET).toHaveLength(WORD_LEN);
    expect(TARGET).toMatch(/^[A-Z]+$/);
  });

  it('epoch falls exactly on a daily reset', () => {
    const d = new Date(EPOCH);
    expect(d.getUTCHours()).toBe(RESET_HOUR_UTC);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it('storage keys are namespaced', () => {
    expect(STORAGE_PREFIX).toBe('miggle.');
  });
});
