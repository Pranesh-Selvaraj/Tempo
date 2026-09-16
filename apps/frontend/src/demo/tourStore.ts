import { create } from 'zustand';

export const TOUR_DONE_KEY = 'tempo.tour.v1.done';

interface TourState {
  open: boolean;
  start: () => void;
  close: () => void;
}

export const useTourStore = create<TourState>((set) => ({
  open: false,
  start: () => set({ open: true }),
  close: () => set({ open: false }),
}));
