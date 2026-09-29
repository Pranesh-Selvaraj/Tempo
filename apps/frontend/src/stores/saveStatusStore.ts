import { create } from 'zustand';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusState {
  status: SaveStatus;
  message: string | null;
  /** A write started (debounced or immediate). */
  begin: (message?: string) => void;
  /** A write finished successfully. */
  succeed: (message?: string) => void;
  /** A write failed; stays visible until dismissed. */
  fail: (message: string) => void;
  reset: () => void;
}

let clearTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Lightweight editor save feedback. Every server write can report here so the
 * top-bar chip reflects reality and failures are visible instead of silent.
 */
export const useSaveStatusStore = create<SaveStatusState>((set, get) => ({
  status: 'idle',
  message: null,

  begin: (message = 'Saving…') => {
    if (clearTimer) clearTimeout(clearTimer);
    set({ status: 'saving', message });
  },

  succeed: (message = 'All changes saved') => {
    if (clearTimer) clearTimeout(clearTimer);
    set({ status: 'saved', message });
    clearTimer = setTimeout(() => {
      if (get().status === 'saved') set({ status: 'idle', message: null });
    }, 2500);
  },

  fail: (message) => {
    if (clearTimer) clearTimeout(clearTimer);
    set({ status: 'error', message });
  },

  reset: () => {
    if (clearTimer) clearTimeout(clearTimer);
    set({ status: 'idle', message: null });
  },
}));
