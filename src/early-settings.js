// Applies saved settings before first paint; injected inline into every page's <head> by
// vite.config.ts. Mirrors applySettings() in src/settings.ts.
try {
  var s = JSON.parse(localStorage.getItem('miggle.settings') || '{}');
  var d = document.documentElement;
  if (s.theme === 'light' || s.theme === 'dark') d.dataset.theme = s.theme;
  if (s.highContrast === true) d.dataset.contrast = 'high';
  if (s.reduceMotion === true) d.dataset.motion = 'reduce';
} catch {
  // Storage blocked: keep the defaults.
}
