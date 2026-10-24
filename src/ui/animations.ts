/** The system preference, or the Settings toggle (data-motion on <html>). */
export function prefersReducedMotion(): boolean {
  return (
    document.documentElement.dataset.motion === 'reduce' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** (Re)start a CSS animation driven by `className`, even if it is already applied. */
export function playAnimation(el: Element | null, className: string): void {
  if (!el) return;
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth; // force a reflow so the animation restarts
  el.classList.add(className);
}

const BURSTS = 3;
const SPARKS_PER_BURST = 20;

/** Celebration bursts over the page (skipped when the user prefers reduced motion). */
export function fireworks(): void {
  if (prefersReducedMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'fireworks';
  layer.setAttribute('aria-hidden', 'true');
  for (let b = 0; b < BURSTS; b++) {
    const x = 20 + Math.random() * 60;
    const y = 15 + Math.random() * 30;
    for (let i = 0; i < SPARKS_PER_BURST; i++) {
      const angle = (i / SPARKS_PER_BURST) * 2 * Math.PI;
      const dist = 60 + Math.random() * 70;
      const spark = document.createElement('span');
      spark.className = `spark spark--${i % 3}`;
      spark.style.setProperty('--x', `${x}%`);
      spark.style.setProperty('--y', `${y}%`);
      spark.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      spark.style.setProperty('--delay', `${b * 350}ms`);
      layer.append(spark);
    }
  }
  document.body.append(layer);
  window.setTimeout(() => layer.remove(), BURSTS * 350 + 1500);
}
