import {
  DIFFICULTIES,
  completePuzzle,
  earnsHint,
  isDifficulty,
  newRun,
  pickPuzzle,
  puzzlePool,
  stepLimit,
  useRunHint,
  type Difficulty,
  type UnlimitedRun,
} from './engine/unlimited';
import { loadGameData, loadUnlimitedPool, type Dictionary } from './engine/words';
import { headerButton, setupPage, showLoadError } from './page';
import { loadUnlimitedStats, recordUnlimitedWin, saveUnlimitedStats } from './stats';
import { readJson, writeJson } from './storage';
import { loadUnlimited, recordFor, saveUnlimited, type UnlimitedRecord } from './unlimited-record';
import { openHelpModal } from './ui/help';
import { showToast } from './ui/messages';
import { confirmModal } from './ui/modals';
import { mountGame, type PlayHandle } from './ui/play';
import { openUnlimitedStatsModal } from './ui/unlimited-view';

const root = document.querySelector<HTMLElement>('#game')!;
const streakEl = document.querySelector<HTMLElement>('[data-ref="streak"]')!;
const giveUpBtn = document.querySelector<HTMLButtonElement>('[data-ref="giveUp"]')!;
const difficultyBtns = [...document.querySelectorAll<HTMLButtonElement>('[data-difficulty]')];

let dict: Dictionary;
let pool: readonly string[];
let record: UnlimitedRecord;
let game: PlayHandle | null = null;
let stats = loadUnlimitedStats();

function save(patch: Partial<UnlimitedRecord>): void {
  record = { ...record, ...patch };
  saveUnlimited(record);
}

/** Deal a fresh puzzle in `run`, never repeating a start word within the run. */
function nextPuzzle(run: UnlimitedRun = record.run): void {
  const start = pickPuzzle(puzzlePool(pool, dict, run.difficulty), run.used);
  record = recordFor({ ...run, used: [...run.used, start] }, start);
  saveUnlimited(record);
  mount();
}

function renderBar(): void {
  const { difficulty, streak } = record.run;
  for (const btn of difficultyBtns) {
    btn.setAttribute('aria-pressed', String(btn.dataset.difficulty === difficulty));
  }
  const lost = game?.outcome() === 'lost';
  streakEl.textContent = String(streak);
  streakEl.classList.toggle('streak-ended', lost);
  streakEl.title = lost ? 'Streak ended' : '';
  giveUpBtn.disabled = game?.outcome() !== 'playing';
}

function mount(): void {
  game?.destroy();
  const { run, start } = record;
  const par = dict.par(start)!;
  game = mountGame({
    root,
    dict,
    start,
    par,
    label: DIFFICULTIES[run.difficulty].label,
    initialState: record.state,
    initialForfeited: record.forfeited,
    maxSteps: stepLimit(run.difficulty, par),
    hints: {
      remaining: () => record.run.hints,
      spend: () => save({ run: useRunHint(record.run) }),
    },
    onChange: (state) => save({ state }),
    onWin: (_, score) => {
      const next = completePuzzle(record.run, score);
      save({ run: next });
      stats = recordUnlimitedWin(stats, next.difficulty, score, next.streak);
      saveUnlimitedStats(stats);
      if (earnsHint(score)) window.setTimeout(() => showToast('+1 hint earned 💡', 2200), 1600);
      renderBar();
    },
    onLose: (_, reason) => {
      save({ forfeited: reason === 'forfeit' });
      renderBar();
    },
    resultActions: (outcome) =>
      outcome === 'won'
        ? [{ label: 'Next word →', primary: true, onClick: () => nextPuzzle() }]
        : [
            {
              label: 'Start a new run',
              primary: true,
              onClick: () => nextPuzzle(newRun(record.run.difficulty)),
            },
          ],
  });
  renderBar();
}

async function chooseDifficulty(difficulty: Difficulty): Promise<void> {
  if (!game || difficulty === record.run.difficulty) return;
  const { streak } = record.run;
  const playing = game.outcome() === 'playing';
  const label = DIFFICULTIES[record.run.difficulty].label;
  const atStake =
    streak > 0 && game.outcome() !== 'lost'
      ? `This ends your ${label} streak of ${streak}.`
      : playing && game.getState().ladder.length > 1
        ? 'This abandons the current puzzle.'
        : null;
  if (atStake && !(await confirmModal('Switch difficulty?', atStake, 'Switch'))) return;
  nextPuzzle(newRun(difficulty));
}

async function giveUp(): Promise<void> {
  if (game?.outcome() !== 'playing') return;
  const { streak } = record.run;
  const message =
    streak > 0
      ? `Your streak of ${streak} ends and an answer is shown.`
      : 'An answer will be shown.';
  if (await confirmModal('Give up?', message, 'Give up', 'Keep playing')) game.forfeit();
}

async function init(): Promise<void> {
  try {
    [{ dict }, pool] = await Promise.all([loadGameData(), loadUnlimitedPool()]);
  } catch (err) {
    showLoadError(root, err, () => void init());
    return;
  }
  const saved = loadUnlimited(dict);
  if (saved) {
    record = saved;
    mount();
  } else {
    nextPuzzle(newRun('medium'));
  }
  headerButton('stats')!.disabled = false;
  for (const btn of difficultyBtns) btn.disabled = false;
  if (!readJson('seenIntro', false)) {
    writeJson('seenIntro', true);
    openHelpModal('unlimited');
  }
}

setupPage({
  help: () => openHelpModal('unlimited'),
  stats: () => {
    if (game) openUnlimitedStatsModal(stats, record.run);
  },
});
for (const btn of difficultyBtns) {
  btn.addEventListener('click', () => {
    const d = btn.dataset.difficulty;
    if (isDifficulty(d)) void chooseDifficulty(d);
  });
}
giveUpBtn.addEventListener('click', () => void giveUp());
document.querySelector('.unlimited-bar')?.addEventListener('mousedown', (e) => e.preventDefault());
void init();
