import { describe, expect, it } from 'vitest';
import {
  STEP_ERROR_MESSAGES,
  changedLetter,
  multisetDiff,
  validateStep,
} from '../src/engine/rules';
import { Dictionary } from '../src/engine/words';
import { EXAMPLE_LADDERS, GATE_WORDS, realDict } from './helpers';

const dict = new Dictionary({
  CASTLE: [4, 4],
  CLEATS: [4, 4],
  CLAUSE: [3, 3],
  MUSCLE: [2, 2],
  MUESLI: [1, 1],
  MIGGLE: [1, null],
  BRIDGE: [3, 3],
  TASSEL: [-1, null], // one step from CASTLE, but marked a dead end
  MIGUEL: [0, 0],
});

describe('multisetDiff', () => {
  it('is 0 for identical words and anagrams', () => {
    expect(multisetDiff('CASTLE', 'CASTLE')).toBe(0);
    expect(multisetDiff('CASTLE', 'CLEATS')).toBe(0);
  });

  it('counts swapped letters', () => {
    expect(multisetDiff('CASTLE', 'CLAUSE')).toBe(1);
    expect(multisetDiff('CASTLE', 'BRIDGE')).toBe(5);
    expect(multisetDiff('AABBCC', 'ABCDEF')).toBe(3);
  });

  it('respects duplicate letters', () => {
    expect(multisetDiff('MIGGLE', 'MIGUEL')).toBe(1);
    expect(multisetDiff('ILLUME', 'MIGUEL')).toBe(1);
    expect(multisetDiff('MIGUEL', 'ILLUME')).toBe(1);
    expect(multisetDiff('GIGGLE', 'MIGUEL')).toBe(2);
  });

  it('puts every gate word one swap from MIGUEL', () => {
    for (const w of GATE_WORDS) expect(multisetDiff(w, 'MIGUEL'), w).toBe(1);
  });
});

describe('changedLetter', () => {
  it('finds the swapped letter and where it landed', () => {
    expect(changedLetter('CASTLE', 'CLAUSE')).toEqual({ removed: 'T', added: 'U', index: 3 });
    expect(changedLetter('MIGGLE', 'MIGUEL')).toEqual({ removed: 'G', added: 'U', index: 3 });
    expect(changedLetter('MIGUEL', 'MIGGLE')).toEqual({ removed: 'U', added: 'G', index: 3 });
  });

  it('marks the copy of a duplicated letter that was not already there', () => {
    expect(changedLetter('MIGUEL', 'ILLUME')).toEqual({ removed: 'G', added: 'L', index: 2 });
    // The X kept in place at the end is old; the X at the front is new.
    expect(changedLetter('ABCDEX', 'XBCDEX')).toEqual({ removed: 'A', added: 'X', index: 0 });
  });

  it('returns null unless the words are exactly one step apart', () => {
    expect(changedLetter('CASTLE', 'CLEATS')).toBeNull();
    expect(changedLetter('CASTLE', 'BRIDGE')).toBeNull();
    expect(changedLetter('CASTLE', 'CASTLES')).toBeNull();
  });
});

describe('validateStep', () => {
  it('accepts a legal step and normalizes the input', () => {
    expect(validateStep(['CASTLE'], ' clause ', dict)).toEqual({
      ok: true,
      word: 'CLAUSE',
      won: false,
    });
  });

  it('reports a win on MIGUEL', () => {
    expect(validateStep(['MUESLI'], 'MIGUEL', dict)).toEqual({
      ok: true,
      word: 'MIGUEL',
      won: true,
    });
    expect(validateStep(['MIGGLE'], 'miguel', dict)).toMatchObject({ ok: true, won: true });
  });

  it.each([
    ['CASTL', 'length'],
    ['CASTLES', 'length'],
    ['', 'length'],
    ['ABCDEF', 'notWord'],
    ['CAST1E', 'notWord'],
    ['CASTLE', 'repeat'],
    ['CLEATS', 'anagramOnly'],
    ['BRIDGE', 'notOneChange'],
    ['MIGUEL', 'notOneChange'],
    ['TASSEL', 'deadEnd'],
  ])('rejects %j from CASTLE with %s', (input, error) => {
    expect(validateStep(['CASTLE'], input, dict)).toEqual({ ok: false, error });
  });

  it('rejects any word already in the ladder, not just the previous one', () => {
    expect(validateStep(['CASTLE', 'CLAUSE'], 'CASTLE', dict)).toEqual({
      ok: false,
      error: 'repeat',
    });
  });

  it('needs the start word', () => {
    expect(() => validateStep([], 'CASTLE', dict)).toThrow();
  });

  it('accepts the verified example ladders on real data', () => {
    for (const ladder of EXAMPLE_LADDERS) {
      for (let i = 1; i < ladder.length; i++) {
        const result = validateStep(ladder.slice(0, i), ladder[i]!, realDict);
        expect(result, ladder.slice(0, i + 1).join(' → ')).toEqual({
          ok: true,
          word: ladder[i],
          won: i === ladder.length - 1,
        });
      }
    }
  });
});

describe('STEP_ERROR_MESSAGES', () => {
  it('uses the agreed wording', () => {
    expect(STEP_ERROR_MESSAGES).toEqual({
      length: 'Need 6 letters',
      notWord: 'Not in word list',
      notOneChange: 'Change exactly one letter',
      anagramOnly: "You must change a letter — just shuffling isn't allowed",
      repeat: 'Already used',
      deadEnd: "Dead end! That word can't reach MIGUEL",
    });
  });
});
