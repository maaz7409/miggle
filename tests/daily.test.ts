import { describe, expect, it } from 'vitest';
import { EPOCH } from '../src/config';
import {
  DAY_MS,
  dayNumber,
  dayStart,
  formatCountdown,
  msUntilNext,
  startWord,
} from '../src/engine/daily';

const HOUR = 60 * 60 * 1000;
const utc = (iso: string) => Date.parse(iso);

describe('dayNumber', () => {
  it('is 1 at launch and rolls over at midnight IST (18:30 UTC)', () => {
    expect(EPOCH).toBe(utc('2026-10-25T00:00:00+05:30'));
    expect(dayNumber(EPOCH)).toBe(1);
    expect(dayNumber(utc('2026-10-25T12:00:00Z'))).toBe(1);
    expect(dayNumber(utc('2026-10-25T18:29:59.999Z'))).toBe(1);
    expect(dayNumber(utc('2026-10-25T18:30:00Z'))).toBe(2);
    expect(dayNumber(utc('2026-11-04T00:00:00+05:30'))).toBe(11);
  });

  it('accepts Date objects', () => {
    expect(dayNumber(new Date('2026-10-27T12:00:00+05:30'))).toBe(3);
  });

  it('is unaffected by the viewer’s time zone offset in the ISO string', () => {
    // 20:00 in UTC+2 is 18:00 UTC: still before the reset.
    expect(dayNumber(utc('2026-10-25T20:00:00+02:00'))).toBe(1);
    // 11:00 in UTC−8 is 19:00 UTC: after the reset.
    expect(dayNumber(utc('2026-10-25T11:00:00-08:00'))).toBe(2);
  });

  it('crosses leap days and year ends on the midnight-IST boundary', () => {
    const feb29 = dayNumber(utc('2028-02-29T00:00:00+05:30'));
    expect(dayNumber(utc('2028-02-29T23:59:59+05:30'))).toBe(feb29);
    expect(dayNumber(utc('2028-03-01T00:00:00+05:30'))).toBe(feb29 + 1);
    expect(
      dayNumber(utc('2027-01-01T00:00:00+05:30')) - dayNumber(utc('2026-12-31T00:00:00+05:30')),
    ).toBe(1);
    expect(dayNumber(utc('2027-10-25T00:00:00+05:30'))).toBe(366);
  });

  it('shows puzzle #1 before launch', () => {
    expect(dayNumber(EPOCH - 1)).toBe(1);
    expect(dayNumber(EPOCH - 10 * DAY_MS)).toBe(1);
  });

  it('takes a custom epoch', () => {
    const epoch = utc('2030-01-01T08:00:00Z');
    expect(dayNumber(utc('2030-01-03T08:00:00Z'), epoch)).toBe(3);
  });
});

describe('dayStart', () => {
  it('is the reset instant for each puzzle', () => {
    expect(dayStart(1)).toBe(EPOCH);
    expect(dayStart(2)).toBe(utc('2026-10-26T00:00:00+05:30'));
  });

  it('brackets every instant with dayNumber', () => {
    for (let t = EPOCH; t < EPOCH + 40 * DAY_MS; t += 7 * HOUR + 13_579) {
      const day = dayNumber(t);
      expect(dayStart(day)).toBeLessThanOrEqual(t);
      expect(dayStart(day + 1)).toBeGreaterThan(t);
    }
  });
});

describe('msUntilNext', () => {
  it('counts down to the next midnight IST', () => {
    expect(msUntilNext(EPOCH)).toBe(DAY_MS);
    expect(msUntilNext(utc('2026-10-25T01:00:00+05:30'))).toBe(23 * HOUR);
    expect(msUntilNext(utc('2026-10-25T23:59:59+05:30'))).toBe(1000);
    expect(msUntilNext(new Date('2026-10-26T00:00:00+05:30'))).toBe(DAY_MS);
  });

  it('counts down to puzzle #2 before launch', () => {
    expect(msUntilNext(EPOCH - 2 * HOUR)).toBe(DAY_MS + 2 * HOUR);
  });
});

describe('startWord', () => {
  const list = ['CASTLE', 'BRIDGE', 'ORANGE'];

  it('picks puzzle N from index N−1 and wraps around', () => {
    expect(startWord(1, list)).toBe('CASTLE');
    expect(startWord(3, list)).toBe('ORANGE');
    expect(startWord(4, list)).toBe('CASTLE');
    expect(startWord(0, list)).toBe('ORANGE');
  });

  it('needs a non-empty list', () => {
    expect(() => startWord(1, [])).toThrow();
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, '0:00:00'],
    [-5, '0:00:00'],
    [999, '0:00:01'],
    [61_000, '0:01:01'],
    [HOUR, '1:00:00'],
    [23 * HOUR + 59 * 60_000 + 59_000, '23:59:59'],
    [DAY_MS, '24:00:00'],
  ])('formats %d ms as %s', (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });
});
