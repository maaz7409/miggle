import { h } from './dom';

export interface ModalHandle {
  readonly dialog: HTMLDialogElement;
  close(): void;
}

let current: ModalHandle | null = null;
let nextId = 0;

/**
 * Open a modal <dialog> (focus trap, Esc to close and focus restore come from the browser).
 * Only one modal is open at a time; opening another closes the first.
 */
export function openModal(title: string, content: Node[], onClose?: () => void): ModalHandle {
  current?.close();
  const titleId = `modal-title-${++nextId}`;
  const closeBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close' }, '✕');
  const dialog = h(
    'dialog',
    { class: 'modal', 'aria-labelledby': titleId },
    h(
      'div',
      { class: 'modal-inner' },
      h(
        'div',
        { class: 'modal-header' },
        // Focus lands on the title (read out first), not on the close button.
        h('h2', { id: titleId, tabindex: '-1', autofocus: '' }, title),
        closeBtn,
      ),
      h('div', { class: 'modal-body' }, ...content),
    ),
  );
  let done = false;
  // Remove the dialog right away: the native 'close' event is async, and until then focus stays on
  // a button inside the closed dialog, where a physical Enter would be lost.
  const finish = () => {
    if (done) return;
    done = true;
    dialog.remove();
    if (current === handle) current = null;
    onClose?.();
  };
  const handle: ModalHandle = {
    dialog,
    close: () => {
      if (dialog.open) dialog.close();
      finish();
    },
  };
  closeBtn.addEventListener('click', handle.close);
  // A click on the dialog element itself is a click on the backdrop.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) handle.close();
  });
  dialog.addEventListener('close', finish); // Esc
  document.body.append(dialog);
  dialog.showModal();
  current = handle;
  return handle;
}

export function closeModal(): void {
  current?.close();
}
