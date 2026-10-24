import { TARGET, WORD_LEN } from '../config';
import { dayStart } from '../engine/daily';
import { prefersReducedMotion } from './animations';
import { createTile, ladderRows, wordRow } from './board';
import { h } from './dom';
import { openModal, type ModalHandle } from './modals';

const EXAMPLE_LADDER = ['CASTLE', 'CLAUSE', 'MUSCLE', 'MUESLI', TARGET];

/** MIGGLE → MIGUEL, one frame at a time: start word, the swapped-out letter, the result. */
function swapDemo(): { el: HTMLElement; stop(): void } {
  const stage = h('div', { class: 'demo-stage board board--compact' });
  const caption = h('p', { class: 'demo-caption', 'aria-live': 'off' });
  const frames: [() => HTMLElement[], string][] = [
    [() => [wordRow('MIGGLE', undefined)], 'Start from MIGGLE…'],
    [
      () => {
        const row = wordRow('MIGGLE', undefined);
        row.children[3]!.classList.add('tile--out');
        return [row];
      },
      '…swap one G for a U…',
    ],
    [() => [wordRow(TARGET, 'MIGGLE')], `…shuffle, and you've reached ${TARGET}!`],
  ];
  const show = (i: number) => {
    const [rows, text] = frames[i]!;
    stage.replaceChildren(...rows());
    caption.textContent = text;
  };
  const el = h('div', { class: 'demo' }, stage, caption);
  if (prefersReducedMotion()) {
    stage.replaceChildren(wordRow('MIGGLE', undefined), wordRow(TARGET, 'MIGGLE'));
    caption.textContent = `MIGGLE → ${TARGET}: swap a G for a U, then shuffle.`;
    return { el, stop: () => {} };
  }
  let frame = 0;
  show(frame);
  const timer = window.setInterval(() => show((frame = (frame + 1) % frames.length)), 1700);
  return { el, stop: () => window.clearInterval(timer) };
}

function legendItem(colour: 'green' | 'amber' | 'grey', letter: string, text: string) {
  return h(
    'li',
    {},
    h('span', { class: 'row row--mini' }, createTile(letter, colour)),
    h('span', {}, text),
  );
}

export function openHelpModal(): ModalHandle {
  const demo = swapDemo();
  const marked = createTile('U', 'green');
  marked.dataset.new = '';
  const resetLocal = new Date(dayStart(2)).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return openModal(
    'How to play',
    [
      h('p', {}, `Climb from the start word to ${TARGET} in as few steps as possible.`),
      h(
        'ul',
        { class: 'rules' },
        h('li', {}, `Every step is a real ${WORD_LEN}-letter word.`),
        h('li', {}, h('strong', {}, 'Swap exactly one letter'), ' for a different one…'),
        h('li', {}, '…then ', h('strong', {}, 'rearrange'), ' the letters however you like.'),
        h('li', {}, "Just shuffling doesn't count, and you can't reuse a word."),
      ),
      demo.el,
      h('h3', {}, 'Tile colours'),
      h(
        'ul',
        { class: 'legend' },
        legendItem('green', 'M', `In ${TARGET}, in the same spot`),
        legendItem('amber', 'L', `In ${TARGET}, somewhere else`),
        legendItem('grey', 'S', `Not in ${TARGET}`),
        h(
          'li',
          {},
          h('span', { class: 'row row--mini' }, marked),
          h('span', {}, 'The letter you swapped in'),
        ),
      ),
      h('h3', {}, 'Example'),
      h('div', { class: 'board board--compact' }, ...ladderRows(EXAMPLE_LADDER)),
      h(
        'p',
        { class: 'muted' },
        'Par is the fewest steps using everyday words. Rare words can sometimes beat it! ',
        `A new puzzle arrives every day at ${resetLocal} your time.`,
      ),
    ],
    demo.stop,
  );
}
