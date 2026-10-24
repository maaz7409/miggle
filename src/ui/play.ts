import { TARGET } from '../config';
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
} from '../engine/game';
import { STEP_ERROR_MESSAGES } from '../engine/rules';
import { resultMessage, scoreLadder, type Score } from '../engine/scoring';
import type { Dictionary } from '../engine/words';
import { fireworks, playAnimation } from './animations';
import { createBoard, createTile } from './board';
import { bindPhysicalKeyboard, createKeyboard, type GameKey } from './keyboard';
import { showToast } from './messages';

export interface PlayOptions {
  root: HTMLElement;
  dict: Dictionary;
  start: string;
  par: number;
  /** Shown before the par line, e.g. "#12". */
  label: string;
  onWin?: (state: GameState, score: Score) => void;
}

export interface PlayHandle {
  destroy(): void;
}

const TEMPLATE = `
  <section class="puzzle-info">
    <p class="puzzle-meta">
      <span data-ref="label"></span> · Try to solve in <strong data-ref="par"></strong>
    </p>
    <div class="goal">
      <span class="goal-label">Goal</span>
      <div class="row row--mini" data-ref="goal" role="img"></div>
    </div>
  </section>
  <div class="board-scroller" data-ref="scroller">
    <div class="board" data-ref="board" role="group" aria-label="Your ladder"></div>
  </div>
  <div class="controls" data-ref="controls">
    <button type="button" class="btn btn--ghost" data-ref="undo">↶ Undo</button>
    <p class="step-counter">Steps <strong data-ref="steps">0</strong></p>
    <button type="button" class="btn btn--ghost" data-ref="restart">⟲ Restart</button>
  </div>
  <section class="result" data-ref="result" hidden>
    <p class="result-message" data-ref="resultMessage"></p>
    <p class="result-detail" data-ref="resultDetail"></p>
    <button type="button" class="btn btn--primary" data-ref="again">Try again</button>
  </section>
  <div data-ref="keyboard"></div>
`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Mount a playable ladder from `start` into `root`. Shared by the daily and unlimited modes. */
export function mountGame({ root, dict, start, par, label, onWin }: PlayOptions): PlayHandle {
  root.innerHTML = TEMPLATE;
  const ref = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-ref="${name}"]`)!;

  ref('label').textContent = label;
  ref('par').textContent = plural(par, 'step');
  const goal = ref('goal');
  goal.setAttribute('aria-label', `Goal: ${TARGET}`);
  goal.append(...[...TARGET].map((ch) => createTile(ch, 'green')));

  const board = createBoard(ref('board'), ref('scroller'));
  const keyboard = createKeyboard(ref('keyboard'), onKey);
  const undoBtn = ref<HTMLButtonElement>('undo');
  const restartBtn = ref<HTMLButtonElement>('restart');

  let state = newGame(start);

  function update(next: GameState): void {
    state = next;
    board.render(state);
    ref('controls').hidden = state.won;
    ref('result').hidden = !state.won;
    keyboard.setEnabled(!state.won);
    ref('steps').textContent = String(stepsTaken(state));
    undoBtn.disabled = !canUndo(state);
    restartBtn.disabled = state.ladder.length === 1 && state.input === '';
    // Last, once the panels around the board have their final size.
    board.scrollToEnd();
  }

  function enter(): void {
    const { state: next, result } = submit(state, dict);
    if (!result) return;
    if (!result.ok) {
      showToast(STEP_ERROR_MESSAGES[result.error]);
      playAnimation(board.inputRow(), 'shake');
      return;
    }
    if (!next.won) {
      update(next);
      playAnimation(board.lastWordRow(), 'pop');
      return;
    }
    const score = scoreLadder(next.ladder, par);
    const message = resultMessage(score);
    ref('resultMessage').textContent = message;
    ref('resultDetail').textContent = `${plural(score.steps, 'step')} · par ${par}`;
    update(next);
    playAnimation(board.lastWordRow(), 'bounce');
    showToast(message, 3000);
    if (score.underPar) fireworks();
    onWin?.(next, score);
  }

  function onKey(key: GameKey): void {
    if (key === 'ENTER') enter();
    else if (key === 'BACKSPACE') update(deleteLetter(state));
    else update(typeLetter(state, key));
  }

  // As with the on-screen keys: a mouse click must not leave focus on a button that Enter would press.
  for (const name of ['controls', 'result']) {
    ref(name).addEventListener('mousedown', (e) => e.preventDefault());
  }
  undoBtn.addEventListener('click', () => update(undo(state)));
  restartBtn.addEventListener('click', () => update(restart(state)));
  ref('again').addEventListener('click', () => {
    update(restart(state));
    showToast(`Can you solve it in ${plural(par, 'step')}?`);
  });
  const unbindKeys = bindPhysicalKeyboard(onKey);

  update(state);
  return {
    destroy() {
      unbindKeys();
      root.replaceChildren();
    },
  };
}
