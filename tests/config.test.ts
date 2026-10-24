import { describe, expect, it } from 'vitest';
import { EPOCH, RESET_UTC, STORAGE_PREFIX, TARGET, WORD_LEN } from '../src/config';

describe('config', () => {
  it('target is an upper-case word of WORD_LEN letters', () => {
    expect(TARGET).toHaveLength(WORD_LEN);
    expect(TARGET).toMatch(/^[A-Z]+$/);
  });

  it('epoch falls exactly on a daily reset', () => {
    const d = new Date(EPOCH);
    expect(d.getUTCHours()).toBe(RESET_UTC.hour);
    expect(d.getUTCMinutes()).toBe(RESET_UTC.minute);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it('launches at midnight IST on 25 October 2026', () => {
    expect(EPOCH).toBe(Date.parse('2026-10-25T00:00:00+05:30'));
  });

  it('storage keys are namespaced', () => {
    expect(STORAGE_PREFIX).toBe('miggle.');
  });
});
