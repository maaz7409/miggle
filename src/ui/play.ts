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
import { describeHint, nextHint, type HintLevel } from '../engine/hints';
import { STEP_ERROR_MESSAGES } from '../engine/rules';
import { plural, resultMessage, retryPrompt, scoreLadder, type Score } from '../engine/scoring';
import { shortestPath } from '../engine/solver';
import type { Dictionary } from '../engine/words';
import { fireworks, playAnimation } from './animations';
import { createBoard, createTile } from './board';
import { h } from './dom';
import { bindPhysicalKeyboard, createKeyboard, type GameKey } from './keyboard';
import { showToast } from './messages';

export type Outcome = 'playing' | 'won' | 'lost';
export type LossReason = 'outOfSteps' | 'forfeit';

export interface ResultAction {
  label: string;
  primary?: boolean;
  onClick(): void;
}

/** Where hints come from: a fixed daily allowance or an earned bank. */
export interface HintBudget {
  remaining(): number;
  spend(): void;
}

export interface PlayOptions {
  root: HTMLElement;
  dict: Dictionary;
  start: string;
  par: number;
  /** Shown before the par line, e.g. "#12" or "Medium". */
  label: string;
  /** Resume a saved game (defaults to a fresh one from `start`). */
  initialState?: GameState;
  /** Resume a game the player already gave up on. */
  initialForfeited?: boolean;
  /** Called after every state change, e.g. to save progress. */
  onChange?: (state: GameState) => void;
  /** Called when a submitted word reaches MIGUEL (not when a won game is restored). */
  onWin?: (state: GameState, score: Score) => void;
  /** Called when the puzzle is lost: out of steps, or given up via `forfeit()`. */
  onLose?: (state: GameState, reason: LossReason) => void;
  /** Enables the Hint button. */
  hints?: HintBudget;
  /** Most steps allowed (Unlimited Hard). Undo and Restart are hidden: every step counts. */
  maxSteps?: number | null;
  /** Buttons under the result message. Default: "Try again" after a win. */
  resultActions?: (outcome: 'won' | 'lost', game: PlayHandle) => ResultAction[];
}

export interface PlayHandle {
  getState(): GameState;
  outcome(): Outcome;
  /** Restart after a win, nudging the player towards a better score. */
  retry(): void;
  /** Give up: the puzzle is lost and a solution is shown. */
  forfeit(): void;
  destroy(): void;
}

const ICONS = {
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  restart:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
};

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
  <p class="hint-banner" data-ref="hintBanner" role="status" hidden></p>
  <div class="controls" data-ref="controls">
    <div class="controls-group" data-ref="editing">
      <button type="button" class="icon-btn" data-ref="undo" aria-label="Undo" title="Undo">
        ${ICONS.undo}
      </button>
      <button type="button" class="icon-btn" data-ref="restart" aria-label="Restart" title="Restart">
        ${ICONS.restart}
      </button>
    </div>
    <p class="step-counter">Steps <strong data-ref="steps">0</strong><span data-ref="limit"></span></p>
    <button type="button" class="btn btn--ghost btn--hint" data-ref="hint" hidden>
      💡 Hint <span class="badge" data-ref="hintCount"></span>
    </button>
  </div>
  <section class="result" data-ref="result" hidden>
    <p class="result-message" data-ref="resultMessage"></p>
    <p class="result-detail" data-ref="resultDetail"></p>
    <div class="result-actions" data-ref="resultActions"></div>
  </section>
  <div data-ref="keyboard"></div>
`;

/** Mount a playable ladder from `start` into `root`. Shared by the daily and unlimited modes. */
export function mountGame(options: PlayOptions): PlayHandle {
  const { root, dict, start, par, label, hints, onChange, onWin, onLose } = options;
  const maxSteps = options.maxSteps ?? null;
  root.innerHTML = TEMPLATE;
  const ref = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-ref="${name}"]`)!;

  ref('label').textContent = label;
  ref('par').textContent = plural(par, 'step');
  const goal = ref('goal');
  goal.setAttribute('aria-label', `Goal: ${TARGET}`);
  goal.append(...[...TARGET].map((ch) => createTile(ch, 'green')));
  if (maxSteps !== null) {
    ref('editing').hidden = true;
    ref('limit').textContent = ` / ${maxSteps}`;
  }
  ref('hint').hidden = !hints;

  const board = createBoard(ref('board'), ref('scroller'));
  const keyboard = createKeyboard(ref('keyboard'), onKey);
  const undoBtn = ref<HTMLButtonElement>('undo');
  const restartBtn = ref<HTMLButtonElement>('restart');
  const hintBtn = ref<HTMLButtonElement>('hint');

  let state = options.initialState ?? newGame(start);
  let forfeited = options.initialForfeited ?? false;
  let shownOutcome: Outcome | null = null;
  /** The latest hint, shown while the ladder still ends at `from`. */
  let hintShown: { from: string; level: HintLevel; text: string } | null = null;

  const outOfSteps = () => maxSteps !== null && !state.won && stepsTaken(state) >= maxSteps;
  const outcome = (): Outcome =>
    state.won ? 'won' : forfeited || outOfSteps() ? 'lost' : 'playing';

  function showResult(current: Outcome): void {
    if (current === 'won') {
      const score = scoreLadder(state.ladder, par);
      ref('resultMessage').textContent = resultMessage(score);
      ref('resultDetail').textContent = `${plural(score.steps, 'step')} · par ${par}`;
    } else if (current === 'lost') {
      ref('resultMessage').textContent = forfeited ? 'You gave up' : 'Out of steps!';
      const path = shortestPath(start, dict);
      ref('resultDetail').textContent = path ? `One way: ${path.join(' → ')}` : '';
    }
    if (current === 'playing') return;
    const actions =
      options.resultActions?.(current, handle) ??
      (current === 'won' ? [{ label: 'Try again', onClick: retry }] : []);
    ref('resultActions').replaceChildren(
      ...actions.map((a) => {
        const btn = h(
          'button',
          { type: 'button', class: `btn ${a.primary ? 'btn--primary' : 'btn--ghost'}` },
          a.label,
        );
        btn.addEventListener('click', a.onClick);
        return btn;
      }),
    );
  }

  function refreshHint(playing: boolean): void {
    if (!hints) return;
    const left = hints.remaining();
    ref('hintCount').textContent = String(left);
    hintBtn.disabled = left <= 0 && hintShown?.from !== state.ladder.at(-1);
    const banner = ref('hintBanner');
    banner.hidden = !(playing && hintShown && hintShown.from === state.ladder.at(-1));
    if (!banner.hidden) banner.textContent = `💡 ${hintShown!.text}`;
  }

  function update(next: GameState): void {
    const changed = next !== state;
    state = next;
    board.render(state);
    const current = outcome();
    if (current !== shownOutcome) {
      showResult(current);
      shownOutcome = current;
    }
    const playing = current === 'playing';
    ref('controls').hidden = !playing;
    ref('result').hidden = playing;
    keyboard.setEnabled(playing);
    ref('steps').textContent = String(stepsTaken(state));
    undoBtn.disabled = !canUndo(state);
    restartBtn.disabled = state.ladder.length === 1 && state.input === '';
    refreshHint(playing);
    // Last, once the panels around the board have their final size.
    board.scrollToEnd();
    if (changed) onChange?.(state);
  }

  function retry(): void {
    if (!state.won) return;
    const prompt = retryPrompt(scoreLadder(state.ladder, par));
    update(restart(state));
    showToast(prompt, 2500);
  }

  function forfeit(): void {
    if (outcome() !== 'playing') return;
    forfeited = true;
    update(state);
    onLose?.(state, 'forfeit');
  }

  function useHint(): void {
    if (!hints || outcome() !== 'playing') return;
    const from = state.ladder.at(-1)!;
    if (hintShown?.from === from && hintShown.level === 2) {
      showToast(hintShown.text);
      return;
    }
    const hint = nextHint(state.ladder, dict);
    if (!hint) {
      showToast('No hint from here. Try undoing a step.');
      return;
    }
    if (hints.remaining() <= 0) {
      showToast('No hints left');
      return;
    }
    const level: HintLevel = hintShown?.from === from ? 2 : 1;
    hints.spend();
    hintShown = { from, level, text: describeHint(hint, level) };
    refreshHint(true);
  }

  function enter(): void {
    const { state: next, result } = submit(state, dict);
    if (!result) return;
    if (!result.ok) {
      showToast(STEP_ERROR_MESSAGES[result.error]);
      playAnimation(board.inputRow(), 'shake');
      return;
    }
    update(next);
    if (next.won) {
      const score = scoreLadder(next.ladder, par);
      playAnimation(board.lastWordRow(), 'bounce');
      showToast(resultMessage(score), 3000);
      if (score.underPar) fireworks();
      onWin?.(next, score);
    } else if (outcome() === 'lost') {
      playAnimation(board.lastWordRow(), 'shake');
      showToast('Out of steps!', 2500);
      onLose?.(next, 'outOfSteps');
    } else {
      playAnimation(board.lastWordRow(), 'pop');
    }
  }

  function onKey(key: GameKey): void {
    if (outcome() !== 'playing') return;
    if (key === 'ENTER') enter();
    else if (key === 'BACKSPACE') update(deleteLetter(state));
    else update(typeLetter(state, key));
  }

  const handle: PlayHandle = {
    getState: () => state,
    outcome,
    retry,
    forfeit,
    destroy() {
      unbindKeys();
      root.replaceChildren();
    },
  };

  // As with the on-screen keys: a mouse click must not leave focus on a button that Enter would press.
  for (const name of ['controls', 'result']) {
    ref(name).addEventListener('mousedown', (e) => e.preventDefault());
  }
  undoBtn.addEventListener('click', () => update(undo(state)));
  restartBtn.addEventListener('click', () => update(restart(state)));
  hintBtn.addEventListener('click', useHint);
  const unbindKeys = bindPhysicalKeyboard(onKey);

  update(state);
  return handle;
}
