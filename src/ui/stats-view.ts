import { msUntilNext, formatCountdown } from '../engine/daily';
import { resultMessage, retryPrompt, type Score } from '../engine/scoring';
import { now } from '../clock';
import { currentStreak, histogramBuckets, type Stats } from '../stats';
import { h } from './dom';
import { openModal, type ModalHandle } from './modals';

export interface StatsModalOptions {
  day: number;
  stats: Stats;
  /** Today's result to summarise, if solved. */
  score: Score | null;
  /** Offer "Try again" (the current board is solved). */
  canRetry: boolean;
  onRetry(): void;
  onShareResult(): void;
  onShareStreak(): void;
}

function statTile(value: number, label: string): HTMLElement {
  return h(
    'div',
    { class: 'stat' },
    h('span', { class: 'stat-value' }, String(value)),
    h('span', { class: 'stat-label' }, label),
  );
}

function histogram(stats: Stats, todayExtra: number | null): HTMLElement {
  const buckets = histogramBuckets(stats);
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return h(
    'ol',
    { class: 'histogram', 'aria-label': 'Wins by steps over par' },
    ...buckets.map((b) => {
      const bar = h('span', { class: 'histogram-bar' }, String(b.count));
      bar.style.setProperty('--pct', `${(b.count / max) * 100}%`);
      if (todayExtra !== null && b.matches(todayExtra)) bar.classList.add('histogram-bar--today');
      return h('li', {}, h('span', { class: 'histogram-label' }, b.label), bar);
    }),
  );
}

export function openStatsModal(o: StatsModalOptions): ModalHandle {
  const streak = currentStreak(o.stats, o.day);
  const countdown = h('strong', { class: 'countdown' });
  const tick = () => {
    countdown.textContent = formatCountdown(msUntilNext(now()));
  };
  tick();
  const timer = window.setInterval(tick, 1000);

  const button = (text: string, cls: string, onClick: () => void) => {
    const btn = h('button', { type: 'button', class: `btn ${cls}` }, text);
    btn.addEventListener('click', onClick);
    return btn;
  };

  const summary: Node[] = [];
  if (o.score) {
    summary.push(h('p', { class: 'stats-result' }, resultMessage(o.score)));
    if (o.canRetry) {
      summary.push(
        h(
          'div',
          { class: 'stats-retry' },
          h('span', {}, retryPrompt(o.score)),
          button('Try again', 'btn--ghost', () => {
            modal.close();
            o.onRetry();
          }),
        ),
      );
    }
  }

  const modal = openModal(
    'Statistics',
    [
      ...summary,
      h(
        'div',
        { class: 'stat-row' },
        statTile(o.stats.wins, 'Wins'),
        statTile(streak, 'Streak'),
        statTile(o.stats.bestStreak, 'Best streak'),
      ),
      h('h3', {}, 'Steps over par'),
      histogram(o.stats, o.score?.extra ?? null),
      h(
        'div',
        { class: 'share-row' },
        o.score && button('Share result', 'btn--primary', o.onShareResult),
        streak > 0 && button('Share streak', 'btn--ghost', o.onShareStreak),
      ),
      h('p', { class: 'next-puzzle' }, 'Next Miggle in ', countdown),
    ],
    () => window.clearInterval(timer),
  );
  return modal;
}
