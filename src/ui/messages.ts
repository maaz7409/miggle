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
  toastRegion().replaceChildren(toast);
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    toast.classList.add('toast--leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, durationMs);
}
