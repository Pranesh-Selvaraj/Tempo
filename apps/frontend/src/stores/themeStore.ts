import { create } from 'zustand';
import { THEMES, THEME_INFO, type ThemeId } from '../lib/theme';

const STORAGE_KEY = 'tempo.theme';

function readTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.includes(stored as ThemeId)) return stored as ThemeId;
  } catch {
    /* storage unavailable */
  }
  return 'oled';
}

function applyTheme(theme: ThemeId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_INFO[theme].swatch);
}

interface ThemeStore {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable */
    }
    set({ theme });
  },
}));

applyTheme(useThemeStore.getState().theme);
