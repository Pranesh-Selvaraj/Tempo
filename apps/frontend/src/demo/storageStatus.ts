import { create } from 'zustand';

/**
 * Surfaces localStorage write failures (almost always a full quota) so the
 * preview never loses work silently.
 */
interface StorageStatus {
  error: string | null;
  setError: (error: string | null) => void;
}

export const useStorageStatus = create<StorageStatus>((set) => ({
  error: null,
  setError: (error) => set({ error }),
}));
