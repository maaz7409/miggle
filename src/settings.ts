import { readJson, writeJson } from './storage';

const KEY = 'settings';

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeSetting;
  /** Colour-blind friendly tiles: orange (right spot) and blue (elsewhere). */
  highContrast: boolean;
  /** Force reduced motion; otherwise the system preference applies. */
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  highContrast: false,
  reduceMotion: false,
};

export function sanitizeSettings(raw: unknown): Settings | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  return {
    theme: r.theme === 'light' || r.theme === 'dark' ? r.theme : 'system',
    highContrast: r.highContrast === true,
    reduceMotion: r.reduceMotion === true,
  };
}

export function loadSettings(): Settings {
  return readJson(KEY, DEFAULT_SETTINGS, sanitizeSettings);
}

export function saveSettings(settings: Settings): void {
  writeJson(KEY, settings);
}

/**
 * Reflect settings on <html> as data attributes (read by the CSS). The same logic runs inline in
 * each page's <head> before first paint; keep the two in sync.
 */
export function applySettings(settings: Settings, root: HTMLElement): void {
  if (settings.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  if (settings.highContrast) root.dataset.contrast = 'high';
  else delete root.dataset.contrast;
  if (settings.reduceMotion) root.dataset.motion = 'reduce';
  else delete root.dataset.motion;
}
