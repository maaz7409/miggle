import { TARGET } from '../config';

/** 'A'–'Z', 'ENTER' or 'BACKSPACE'. */
export type GameKey = string;
export type KeyHandler = (key: GameKey) => void;

const ROWS: readonly (readonly GameKey[])[] = [
  [...'QWERTYUIOP'],
  [...'ASDFGHJKL'],
  ['ENTER', ...'ZXCVBNM', 'BACKSPACE'],
];

const LABELS: Readonly<Record<string, string>> = { ENTER: 'Enter', BACKSPACE: '⌫' };
const ARIA: Readonly<Record<string, string>> = { BACKSPACE: 'Backspace' };

export interface KeyboardView {
  setEnabled(enabled: boolean): void;
}

/** On-screen QWERTY keyboard. Letters of the target get a marker so players can spot them. */
export function createKeyboard(container: HTMLElement, onKey: KeyHandler): KeyboardView {
  container.classList.add('keyboard');
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Keyboard');
  for (const keys of ROWS) {
    const row = document.createElement('div');
    row.className = 'keyboard-row';
    for (const key of keys) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key';
      btn.dataset.key = key;
      btn.textContent = LABELS[key] ?? key;
      if (ARIA[key]) btn.setAttribute('aria-label', ARIA[key]);
      if (key.length > 1) btn.classList.add('key--wide');
      if (key.length === 1 && TARGET.includes(key)) btn.classList.add('key--target');
      row.append(btn);
    }
    container.append(row);
  }
  // Clicking with a mouse should not move focus, or a later physical Enter would press that key.
  container.addEventListener('mousedown', (e) => e.preventDefault());
  container.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-key]');
    if (btn && !btn.disabled) onKey(btn.dataset.key!);
  });
  return {
    setEnabled(enabled) {
      for (const btn of container.querySelectorAll('button')) btn.disabled = !enabled;
    },
  };
}

/** Route physical key presses to `onKey`. Returns a function that removes the listener. */
export function bindPhysicalKeyboard(onKey: KeyHandler): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    // While a modal is open, keys belong to it. (Checked via the open attribute, not the event
    // target: focus can linger inside a dialog for a moment after it closes.)
    if (document.querySelector('dialog[open]')) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    // A focused button handles its own Enter/Space.
    if (target instanceof HTMLButtonElement && (e.key === 'Enter' || e.key === ' ')) return;
    let key: GameKey | null = null;
    if (e.key === 'Enter') key = 'ENTER';
    else if (e.key === 'Backspace') key = 'BACKSPACE';
    else if (/^[a-z]$/i.test(e.key)) key = e.key.toUpperCase();
    if (!key) return;
    e.preventDefault();
    onKey(key);
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
