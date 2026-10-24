import '@fontsource-variable/fredoka';
import './styles/tokens.css';
import './styles/base.css';
import './styles/game.css';
import { TARGET, WORD_LEN } from './config';

const PLACEHOLDER_ROWS = 5;

function tile(letter = '', state?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'tile';
  el.textContent = letter;
  if (state) el.dataset.state = state;
  return el;
}

function row(tiles: HTMLDivElement[]): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'row';
  el.append(...tiles);
  return el;
}

const board = document.querySelector<HTMLDivElement>('#board');
if (board) {
  for (let i = 0; i < PLACEHOLDER_ROWS; i++) {
    board.append(row(Array.from({ length: WORD_LEN }, () => tile())));
  }
  board.append(row([...TARGET].map((ch) => tile(ch, 'green'))));
}
