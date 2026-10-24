import { now } from './clock';
import { DAILY_HINTS } from './config';
import { dayNumber, msUntilNext, startWord } from './engine/daily';
import type { GameState } from './engine/game';
import { scoreLadder, type Score } from './engine/scoring';
import { shareText, streakShareText } from './engine/share';
import { loadGameData, type Dictionary } from './engine/words';
import { currentStreak, loadStats, recordWin, saveStats } from './stats';
import { headerButton, setupPage, showLoadError } from './page';
import { loadSettings } from './settings';
import { readJson, writeJson } from './storage';
import { loadToday, saveToday, type TodayRecord } from './today';
import { openHelpModal } from './ui/help';
import { showToast } from './ui/messages';
import { closeModal } from './ui/modals';
import { mountGame, type PlayHandle } from './ui/play';
import { share } from './ui/share';
import { openStatsModal } from './ui/stats-view';
import { openYesterdayModal } from './ui/yesterday';

interface Daily {
  dict: Dictionary;
  daily: readonly string[];
  day: number;
  par: number;
  record: TodayRecord;
  game: PlayHandle;
}

const root = document.querySelector<HTMLElement>('#game')!;

let current: Daily | null = null;
let rolloverTimer: number | undefined;

function save(patch: Partial<TodayRecord>): void {
  if (!current) return;
  current.record = { ...current.record, ...patch };
  saveToday(current.record);
}

/** The ladder to share or summarise: the current board if solved, else the first solve. */
function solvedLadder(): readonly string[] | null {
  if (!current) return null;
  const state = current.game.getState();
  return state.won ? state.ladder : current.record.solved;
}

function shareResult(): void {
  const ladder = solvedLadder();
  if (!current || !ladder) return;
  const { day, par, record } = current;
  const { highContrast } = loadSettings();
  void share(shareText({ day, ladder, par, hints: record.hints, highContrast }));
}

function shareStreak(): void {
  if (!current) return;
  const stats = loadStats();
  void share(streakShareText(currentStreak(stats, current.day), stats.bestStreak));
}

function showStats(): void {
  if (!current) return;
  const ladder = solvedLadder();
  openStatsModal({
    day: current.day,
    stats: loadStats(),
    score: ladder ? scoreLadder(ladder, current.par) : null,
    canRetry: current.game.getState().won,
    onRetry: () => current?.game.retry(),
    onShareResult: shareResult,
    onShareStreak: shareStreak,
  });
}

function handleWin(state: GameState, score: Score): void {
  if (!current) return;
  // Only the first solve of the day counts; "Try again" is just for fun.
  if (!current.record.counted) {
    saveStats(recordWin(loadStats(), current.day, score.extra));
    save({ counted: true, solved: state.ladder });
  }
  window.setTimeout(showStats, 1800);
}

/** Load (or reload, after the daily reset) the puzzle for the current day. */
async function startDay(): Promise<void> {
  const { dict, daily } = await loadGameData();
  const day = dayNumber(now());
  const start = startWord(day, daily);
  const par = dict.par(start)!;
  const record = loadToday(day, start, dict);
  current?.game.destroy();
  current = null;
  const game = mountGame({
    root,
    dict,
    start,
    par,
    label: `#${day}`,
    initialState: record.state,
    onChange: (state) => save({ state }),
    onWin: handleWin,
    hints: {
      // `current` is only set once mountGame returns, so fall back to the loaded record.
      remaining: () => DAILY_HINTS - (current?.record ?? record).hints,
      spend: () => save({ hints: (current?.record ?? record).hints + 1 }),
    },
    resultActions: (outcome, game) =>
      outcome === 'won'
        ? [
            { label: 'Share', primary: true, onClick: shareResult },
            { label: 'Try again', onClick: () => game.retry() },
          ]
        : [],
  });
  current = { dict, daily, day, par, record, game };
  headerButton('stats')!.disabled = false;
  headerButton('yesterday')!.disabled = false;
  scheduleRollover();
}

function scheduleRollover(): void {
  window.clearTimeout(rolloverTimer);
  rolloverTimer = window.setTimeout(checkRollover, msUntilNext(now()) + 250);
}

function checkRollover(): void {
  if (!current) return;
  if (dayNumber(now()) === current.day) {
    scheduleRollover();
    return;
  }
  closeModal();
  void startDay().then(() => showToast('A new Miggle is here!', 2500));
}

async function init(): Promise<void> {
  try {
    await startDay();
  } catch (err) {
    showLoadError(root, err, () => void init());
    return;
  }
  if (!readJson('seenIntro', false)) {
    writeJson('seenIntro', true);
    openHelpModal();
  } else if (current?.game.getState().won) {
    showStats();
  }
}

setupPage({
  help: () => openHelpModal(),
  stats: showStats,
  yesterday: () => {
    if (current) openYesterdayModal(current.day, current.dict, current.daily);
  },
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkRollover();
});

void init();
