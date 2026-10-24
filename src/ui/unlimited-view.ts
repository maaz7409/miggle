import { DIFFICULTIES, DIFFICULTY_ORDER, type UnlimitedRun } from '../engine/unlimited';
import type { UnlimitedStats } from '../stats';
import { h } from './dom';
import { openModal, type ModalHandle } from './modals';

export function openUnlimitedStatsModal(stats: UnlimitedStats, run: UnlimitedRun): ModalHandle {
  const cell = (text: string | number, tag: 'td' | 'th' = 'td') => h(tag, {}, String(text));
  return openModal('Unlimited stats', [
    h(
      'p',
      { class: 'stats-result' },
      `${DIFFICULTIES[run.difficulty].label} run: streak ${run.streak} · 💡 ${run.hints}`,
    ),
    h(
      'table',
      { class: 'tally' },
      h(
        'thead',
        {},
        h(
          'tr',
          {},
          cell('', 'th'),
          cell('Solved', 'th'),
          cell('At par', 'th'),
          cell('Best streak', 'th'),
        ),
      ),
      h(
        'tbody',
        {},
        ...DIFFICULTY_ORDER.map((d) => {
          const t = stats[d];
          return h(
            'tr',
            {},
            cell(DIFFICULTIES[d].label, 'th'),
            cell(t.solved),
            cell(t.perfect),
            cell(t.bestStreak),
          );
        }),
      ),
    ),
  ]);
}
