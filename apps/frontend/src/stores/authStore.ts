import { create } from 'zustand';
import type { AuthUser } from '../lib/trpc';

const STORAGE_KEY = 'tempo.auth';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

function readStored(): { token: string | null; user: AuthUser | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw) as { token?: string; user?: AuthUser };
    if (typeof parsed.token !== 'string' || !parsed.user) return { token: null, user: null };
    return { token: parsed.token, user: parsed.user };
  } catch {
    return { token: null, user: null };
  }
}

const initial = readStored();

export function getStoredToken(): string | null {
  return useAuthStore.getState().token;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initial.token,
  user: initial.user,
  setAuth: (token, user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },
  setUser: (user) => {
    const token = get().token;
    if (token) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ user });
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },
}));
