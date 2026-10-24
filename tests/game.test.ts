import { describe, expect, it } from 'vitest';
import {
  canUndo,
  deleteLetter,
  newGame,
  restart,
  stepsTaken,
  submit,
  typeLetter,
  undo,
  type GameState,
} from '../src/engine/game';
import { realDict } from './helpers';

const typeWord = (state: GameState, word: string) => [...word].reduce(typeLetter, state);

function play(start: string, words: string[]): GameState {
  let state = newGame(start);
  for (const w of words) {
    const out = submit(typeWord(state, w), realDict);
    expect(out.result?.ok, w).toBe(true);
    state = out.state;
  }
  return state;
}

describe('game state', () => {
  it('starts with only the start word', () => {
    expect(newGame('CASTLE')).toEqual({
      start: 'CASTLE',
      ladder: ['CASTLE'],
      input: '',
      won: false,
    });
  });

  it('types letters up to the word length, upper-cased, ignoring non-letters', () => {
    let state = typeWord(newGame('CASTLE'), 'clause');
    expect(state.input).toBe('CLAUSE');
    state = typeLetter(state, 'X');
    expect(state.input).toBe('CLAUSE');
    expect(typeLetter(newGame('CASTLE'), '1').input).toBe('');
    expect(typeLetter(newGame('CASTLE'), 'AB').input).toBe('');
  });

  it('deletes letters', () => {
    const state = typeWord(newGame('CASTLE'), 'CL');
    expect(deleteLetter(state).input).toBe('C');
    const empty = newGame('CASTLE');
    expect(deleteLetter(empty)).toBe(empty);
  });

  it('keeps the input after a rejected word', () => {
    const typed = typeWord(newGame('CASTLE'), 'CLEATS');
    const { state, result } = submit(typed, realDict);
    expect(result).toEqual({ ok: false, error: 'anagramOnly' });
    expect(state).toBe(typed);
    expect(submit(typeWord(newGame('CASTLE'), 'CLA'), realDict).result).toEqual({
      ok: false,
      error: 'length',
    });
  });

  it('plays a ladder to a win, then ignores further input', () => {
    const state = play('CASTLE', ['CLAUSE', 'MUSCLE', 'MUESLI', 'MIGUEL']);
    expect(state.won).toBe(true);
    expect(stepsTaken(state)).toBe(4);
    expect(typeLetter(state, 'A')).toBe(state);
    expect(deleteLetter(state)).toBe(state);
    expect(submit(state, realDict)).toEqual({ state, result: null });
  });

  it('undoes one word at a time, never past the start word or after a win', () => {
    let state = typeLetter(play('CASTLE', ['CLAUSE', 'MUSCLE']), 'M');
    expect(canUndo(state)).toBe(true);
    state = undo(state);
    expect(state.ladder).toEqual(['CASTLE', 'CLAUSE']);
    expect(state.input).toBe('');
    state = undo(state);
    expect(canUndo(state)).toBe(false);
    expect(undo(state)).toBe(state);
    const won = play('MIGGLE', ['MIGUEL']);
    expect(canUndo(won)).toBe(false);
    expect(undo(won)).toBe(won);
  });

  it('restarts from the start word, even after a win', () => {
    expect(restart(play('MIGGLE', ['MIGUEL']))).toEqual(newGame('MIGGLE'));
  });
});
