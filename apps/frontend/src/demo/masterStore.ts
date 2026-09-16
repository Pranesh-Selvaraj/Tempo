import { create } from 'zustand';
import { DEMO_TOKEN } from '../lib/mode';
import { useAuthStore } from '../stores/authStore';

/**
 * Master access state for the static preview. Kept in sessionStorage so a new
 * browser session asks for the master credentials again, while reloads and
 * route changes stay unlocked.
 */
const SESSION_KEY = 'tempo.master.session.v1';

function readSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'unlocked';
  } catch {
    return false;
  }
}

interface MasterState {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

export const useMasterStore = create<MasterState>((set) => ({
  unlocked: readSession(),

  unlock: () => {
    try {
      sessionStorage.setItem(SESSION_KEY, 'unlocked');
    } catch {
      /* storage unavailable — the session stays in memory */
    }
    useAuthStore.getState().setAuth(DEMO_TOKEN, {
      id: '00000000-0000-4000-8000-000000000000',
      email: 'master@tempo.local',
      name: 'Master Access',
      teamName: null,
      createdAt: new Date(),
    });
    set({ unlocked: true });
  },

  lock: () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    useAuthStore.getState().clear();
    set({ unlocked: false });
  },
}));
