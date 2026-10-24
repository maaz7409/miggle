import '@fontsource-variable/fredoka';
import './styles/tokens.css';
import './styles/base.css';
import './styles/game.css';
import './styles/modals.css';
import { initClock } from './clock';

export type HeaderAction = 'help' | 'stats' | 'yesterday';

export function headerButton(action: HeaderAction): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
}

/** Shared start-up for every game page: dev clock override and the header buttons. */
export function setupPage(actions: Partial<Record<HeaderAction, () => void>>): void {
  initClock(location.search);
  // A mouse click must not leave focus on a header button that a physical Enter would press.
  document.querySelector('.site-header')?.addEventListener('mousedown', (e) => e.preventDefault());
  for (const [action, run] of Object.entries(actions)) {
    headerButton(action as HeaderAction)?.addEventListener('click', run);
  }
}

/** Replace `root` with an error message and a retry button. */
export function showLoadError(root: HTMLElement, err: unknown, retry: () => void): void {
  console.error(err);
  const msg = document.createElement('p');
  msg.className = 'status-message';
  msg.textContent = "Couldn't load the puzzle.";
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn--primary';
  button.textContent = 'Try again';
  button.addEventListener('click', () => {
    msg.textContent = 'Loading…';
    root.replaceChildren(msg);
    retry();
  });
  root.replaceChildren(msg, button);
}
