let region: HTMLElement | undefined;
let hideTimer: number | undefined;

function toastRegion(): HTMLElement {
  if (!region) {
    region = document.createElement('div');
    region.className = 'toasts';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
  }
  // An open modal <dialog> sits in the top layer, above anything in <body>.
  const host = document.querySelector('dialog[open]') ?? document.body;
  if (region.parentElement !== host) host.append(region);
  return region;
}

/** Show a short message above the board, replacing any message already showing. */
export function showToast(text: string, durationMs = 1800): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  const region = toastRegion();
  // Just below the puzzle info, so the message never covers the subheader or goal strip.
  const anchor = document.querySelector('dialog[open]')
    ? null
    : document.querySelector('.board-scroller')?.getBoundingClientRect();
  region.style.top = anchor ? `${Math.round(anchor.top) + 8}px` : '';
  region.replaceChildren(toast);
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    toast.classList.add('toast--leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, durationMs);
}

let announcer: HTMLElement | undefined;

/** Read `text` to screen-reader users without showing anything. */
export function announce(text: string): void {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', 'polite');
    document.body.append(announcer);
  }
  const el = announcer;
  el.textContent = '';
  // A fresh text node after a tick makes repeated messages announce again.
  window.setTimeout(() => {
    el.textContent = text;
  }, 50);
}
