import { TARGET } from '../config';
import { startWord } from '../engine/daily';
import { plural } from '../engine/scoring';
import { shortestPath } from '../engine/solver';
import type { Dictionary } from '../engine/words';
import { ladderRows } from './board';
import { h } from './dom';
import { openModal, type ModalHandle } from './modals';

export function openYesterdayModal(
  day: number,
  dict: Dictionary,
  daily: readonly string[],
): ModalHandle {
  if (day <= 1) {
    return openModal("Yesterday's answer", [
      h('p', {}, "This is puzzle #1, so there's no yesterday yet. Come back tomorrow!"),
    ]);
  }
  const start = startWord(day - 1, daily);
  const path = shortestPath(start, dict) ?? [start];
  return openModal("Yesterday's answer", [
    h(
      'p',
      {},
      `#${day - 1} · ${start} → ${TARGET} in `,
      h('strong', {}, plural(path.length - 1, 'step')),
      '. One shortest path:',
    ),
    h('div', { class: 'board board--compact' }, ...ladderRows(path)),
  ]);
}
