/**
 * @file ThemeService.js
 * Applies and persists the light/dark/system theme preference.
 */

import { StorageService } from './StorageService.js';

const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function resolveEffectiveTheme(pref) {
  if (pref === 'dark' || pref === 'light') return pref;
  return mediaQuery && mediaQuery.matches ? 'dark' : 'light';
}

function applyTheme(pref) {
  const effective = resolveEffectiveTheme(pref);
  document.documentElement.setAttribute('data-theme', effective);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', effective === 'dark' ? '#0b1220' : '#0d47a1');
  }
}

export const ThemeService = {
  init() {
    const settings = StorageService.getSettings();
    applyTheme(settings.theme || 'system');

    if (mediaQuery) {
      mediaQuery.addEventListener('change', () => {
        const current = StorageService.getSettings();
        if (current.theme === 'system') applyTheme('system');
      });
    }
  },

  setTheme(pref) {
    const settings = StorageService.getSettings();
    settings.theme = pref;
    StorageService.saveSettings(settings);
    applyTheme(pref);
  },

  getTheme() {
    return StorageService.getSettings().theme || 'system';
  },
};
