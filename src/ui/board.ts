import { WORD_LEN } from '../config';
import type { GameState } from '../engine/game';
import { changedLetter } from '../engine/rules';
import { tileColours, type TileColour } from '../engine/share';
import { prefersReducedMotion } from './animations';

export function createTile(letter = '', colour?: TileColour): HTMLDivElement {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.textContent = letter;
  if (colour) tile.dataset.state = colour;
  return tile;
}

function createRow(tiles: HTMLElement[], className = 'row'): HTMLDivElement {
  const row = document.createElement('div');
  row.className = className;
  row.append(...tiles);
  return row;
}

/** A word in the ladder, coloured against the target, with the newly added letter marked. */
function wordRow(word: string, prev: string | undefined): HTMLDivElement {
  const colours = tileColours(word);
  const changed = prev === undefined ? null : changedLetter(prev, word);
  const tiles = [...word].map((ch, i) => {
    const tile = createTile(ch, colours[i]);
    tile.style.setProperty('--i', String(i));
    if (changed?.index === i) tile.dataset.new = '';
    return tile;
  });
  const row = createRow(tiles, 'row row--word');
  row.setAttribute('aria-label', prev === undefined ? `Start: ${word}` : word);
  return row;
}

function inputRow(input: string): HTMLDivElement {
  const tiles = Array.from({ length: WORD_LEN }, (_, i) => {
    const tile = createTile(input[i] ?? '');
    if (i < input.length) tile.dataset.filled = '';
    if (i === input.length) tile.dataset.cursor = '';
    return tile;
  });
  return createRow(tiles, 'row row--input');
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
      const rows = state.ladder.map((w, i) => wordRow(w, state.ladder[i - 1]));
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
