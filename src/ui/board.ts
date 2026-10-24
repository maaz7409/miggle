import { TARGET, WORD_LEN } from '../config';
import type { GameState } from '../engine/game';
import { changedLetter } from '../engine/rules';
import { tileColours, type TileColour } from '../engine/share';
import { prefersReducedMotion } from './animations';

const STATE_LABELS: Readonly<Record<TileColour, string>> = {
  green: 'right spot',
  amber: `elsewhere in ${TARGET}`,
  grey: `not in ${TARGET}`,
};

/** Screen-reader label for a tile, e.g. "U, right spot, new letter". Colour-free, so it suits every palette. */
export function tileLabel(letter: string, colour?: TileColour, isNew = false): string {
  const parts = [letter || 'blank'];
  if (colour) parts.push(STATE_LABELS[colour]);
  if (isNew) parts.push('new letter');
  return parts.join(', ');
}

export function createTile(letter = '', colour?: TileColour, isNew = false): HTMLDivElement {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.textContent = letter;
  tile.setAttribute('role', 'img');
  tile.setAttribute('aria-label', tileLabel(letter, colour, isNew));
  if (colour) tile.dataset.state = colour;
  if (isNew) tile.dataset.new = '';
  return tile;
}

function createRow(tiles: HTMLElement[], className = 'row'): HTMLDivElement {
  const row = document.createElement('div');
  row.className = className;
  row.append(...tiles);
  return row;
}

/**
 * A word in the ladder, coloured against the target, with the newly added letter marked.
 * `step` is its position in the ladder (0 = the start word).
 */
export function wordRow(
  word: string,
  prev: string | undefined,
  step = prev ? 1 : 0,
): HTMLDivElement {
  const colours = tileColours(word);
  const changed = prev === undefined ? null : changedLetter(prev, word);
  const tiles = [...word].map((ch, i) => {
    const tile = createTile(ch, colours[i], changed?.index === i);
    tile.style.setProperty('--i', String(i));
    return tile;
  });
  const row = createRow(tiles, 'row row--word');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', step === 0 ? `Start: ${word}` : `Step ${step}: ${word}`);
  return row;
}

/** Read-only rows for a whole ladder (used by How to play and Yesterday's answer). */
export function ladderRows(ladder: readonly string[]): HTMLDivElement[] {
  return ladder.map((w, i) => wordRow(w, ladder[i - 1], i));
}

function inputRow(input: string): HTMLDivElement {
  const tiles = Array.from({ length: WORD_LEN }, (_, i) => {
    const tile = createTile(input[i] ?? '');
    if (i < input.length) tile.dataset.filled = '';
    if (i === input.length) tile.dataset.cursor = '';
    return tile;
  });
  const row = createRow(tiles, 'row row--input');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'Next word');
  return row;
}

export interface BoardView {
  render(state: GameState): void;
  /** Scroll so the newest row is visible. Call after surrounding layout changes. */
  scrollToEnd(): void;
  /** The row being typed into (absent once won). */
  inputRow(): HTMLElement | null;
  /** The most recently accepted word. */
  lastWordRow(): HTMLElement | null;
}

export function createBoard(container: HTMLElement, scroller: HTMLElement): BoardView {
  return {
    render(state) {
      const rows = ladderRows(state.ladder);
      if (!state.won) rows.push(inputRow(state.input));
      container.replaceChildren(...rows);
    },
    scrollToEnd() {
      scroller.scrollTo({
        top: scroller.scrollHeight,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    },
    inputRow: () => container.querySelector('.row--input'),
    lastWordRow: () => [...container.querySelectorAll<HTMLElement>('.row--word')].at(-1) ?? null,
  };
}
