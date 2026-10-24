import '@fontsource-variable/fredoka';
import './styles/tokens.css';
import './styles/base.css';
import './styles/game.css';
import './styles/modals.css';
import { initClock, now } from './clock';
import { dayNumber, msUntilNext, startWord } from './engine/daily';
import type { GameState } from './engine/game';
import { scoreLadder, type Score } from './engine/scoring';
import { shareText, streakShareText } from './engine/share';
import { loadGameData, type Dictionary } from './engine/words';
import { currentStreak, loadStats, recordWin, saveStats } from './stats';
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

initClock(location.search);
const root = document.querySelector<HTMLElement>('#game')!;
const headerButton = (action: string) =>
  document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;

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
  if (current && ladder) void share(shareText({ day: current.day, ladder, par: current.par }));
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
    onShare: shareResult,
  });
  current = { dict, daily, day, par, record, game };
  headerButton('stats').disabled = false;
  headerButton('yesterday').disabled = false;
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

function showLoadError(err: unknown): void {
  console.error(err);
  const msg = document.createElement('p');
  msg.className = 'status-message';
  msg.textContent = "Couldn't load today's puzzle.";
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn btn--primary';
  retry.textContent = 'Try again';
  retry.addEventListener('click', () => {
    msg.textContent = 'Loading…';
    root.replaceChildren(msg);
    void init();
  });
  root.replaceChildren(msg, retry);
}

async function init(): Promise<void> {
  try {
    await startDay();
  } catch (err) {
    showLoadError(err);
    return;
  }
  if (!readJson('seenIntro', false)) {
    writeJson('seenIntro', true);
    openHelpModal();
  } else if (current?.game.getState().won) {
    showStats();
  }
}

const header = document.querySelector<HTMLElement>('.site-header')!;
// A mouse click must not leave focus on a header button that a physical Enter would press.
header.addEventListener('mousedown', (e) => e.preventDefault());
headerButton('help').addEventListener('click', () => openHelpModal());
headerButton('stats').addEventListener('click', showStats);
headerButton('yesterday').addEventListener('click', () => {
  if (current) openYesterdayModal(current.day, current.dict, current.daily);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkRollover();
});

void init();
