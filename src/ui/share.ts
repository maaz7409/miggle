import { h } from './dom';
import { showToast } from './messages';
import { openModal } from './modals';

type Outcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Native share sheet on touch devices, else the clipboard, else a hidden-textarea copy. */
async function deliver(text: string): Promise<Outcome> {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.share && navigator.canShare?.({ text }) !== false) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Otherwise fall through to copying.
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return legacyCopy(text) ? 'copied' : 'failed';
  }
}

function legacyCopy(text: string): boolean {
  const area = h('textarea', { readonly: '', 'aria-hidden': 'true', class: 'offscreen' });
  area.value = text;
  // Inside an open modal, the rest of the page is inert and can't be selected.
  (document.querySelector('dialog[open]') ?? document.body).append(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Share `text`, confirming with a toast, or show it for manual copying if all else fails. */
export async function share(text: string): Promise<void> {
  const outcome = await deliver(text);
  if (outcome === 'copied') showToast('Copied to clipboard');
  if (outcome !== 'failed') return;
  const area = h('textarea', { readonly: '', class: 'share-text', rows: '8' });
  area.value = text;
  openModal('Copy your result', [
    h('p', {}, 'Your browser blocked copying. Select the text below and copy it.'),
    area,
  ]);
  area.select();
}
