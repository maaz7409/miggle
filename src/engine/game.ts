import { WORD_LEN } from '../config';
import { validateStep, type StepResult } from './rules';
import type { Dictionary } from './words';

/** One puzzle in progress. Plain data, so it can be saved and restored as JSON. */
export interface GameState {
  readonly start: string;
  /** Accepted words, start word first. Ends with MIGUEL once won. */
  readonly ladder: readonly string[];
  /** Letters typed for the next word. */
  readonly input: string;
  readonly won: boolean;
}

export function newGame(start: string): GameState {
  return { start, ladder: [start], input: '', won: false };
}

/** Steps taken so far (words after the start word). */
export function stepsTaken(state: GameState): number {
  return state.ladder.length - 1;
}

export function typeLetter(state: GameState, letter: string): GameState {
  const ch = letter.toUpperCase();
  if (state.won || state.input.length >= WORD_LEN || !/^[A-Z]$/.test(ch)) return state;
  return { ...state, input: state.input + ch };
}

export function deleteLetter(state: GameState): GameState {
  if (state.won || state.input === '') return state;
  return { ...state, input: state.input.slice(0, -1) };
}

/**
 * Try the typed word as the next step. On success it joins the ladder and the input clears;
 * on failure the state is unchanged so the player can fix it. `result` is null once won.
 */
export function submit(
  state: GameState,
  dict: Dictionary,
): { state: GameState; result: StepResult | null } {
  if (state.won) return { state, result: null };
  const result = validateStep(state.ladder, state.input, dict);
  if (!result.ok) return { state, result };
  return {
    state: { ...state, ladder: [...state.ladder, result.word], input: '', won: result.won },
    result,
  };
}

export function canUndo(state: GameState): boolean {
  return !state.won && state.ladder.length > 1;
}

/** Remove the last word (never the start word) and clear the input. */
export function undo(state: GameState): GameState {
  if (!canUndo(state)) return state;
  return { ...state, ladder: state.ladder.slice(0, -1), input: '' };
}

export function restart(state: GameState): GameState {
  return newGame(state.start);
}
