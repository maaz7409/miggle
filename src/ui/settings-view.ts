import {
  applySettings,
  loadSettings,
  saveSettings,
  type Settings,
  type ThemeSetting,
} from '../settings';
import { h } from './dom';
import { openModal, type ModalHandle } from './modals';

const THEMES: [ThemeSetting, string][] = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

function toggle(
  id: string,
  label: string,
  hint: string,
  checked: boolean,
  onChange: (on: boolean) => void,
) {
  const input = h('input', { type: 'checkbox', id, role: 'switch' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return h(
    'div',
    { class: 'setting' },
    h(
      'label',
      { for: id },
      h('span', { class: 'setting-label' }, label),
      h('span', { class: 'setting-hint' }, hint),
    ),
    input,
  );
}

export function openSettingsModal(): ModalHandle {
  let settings = loadSettings();
  const update = (patch: Partial<Settings>) => {
    settings = { ...settings, ...patch };
    saveSettings(settings);
    applySettings(settings, document.documentElement);
  };
  const themes = h(
    'fieldset',
    { class: 'setting setting--theme' },
    h('legend', { class: 'setting-label' }, 'Theme'),
    h(
      'div',
      { class: 'segmented' },
      ...THEMES.map(([value, label]) => {
        const input = h('input', { type: 'radio', name: 'theme', value, id: `theme-${value}` });
        input.checked = settings.theme === value;
        input.addEventListener('change', () => update({ theme: value }));
        return h('label', { for: `theme-${value}` }, input, h('span', {}, label));
      }),
    ),
  );
  return openModal('Settings', [
    themes,
    toggle(
      'setting-contrast',
      'Colour-blind friendly colours',
      'Orange for the right spot, blue for elsewhere. Shared results use 🟧 and 🟦.',
      settings.highContrast,
      (on) => update({ highContrast: on }),
    ),
    toggle(
      'setting-motion',
      'Reduce motion',
      'Turns off shakes, bounces and fireworks. Your system setting also applies.',
      settings.reduceMotion,
      (on) => update({ reduceMotion: on }),
    ),
  ]);
}
