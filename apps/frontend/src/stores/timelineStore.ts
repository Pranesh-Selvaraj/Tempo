import { create } from 'zustand';
import { clamp } from '@tempo/shared-types';

export const SPEEDS = [0.25, 0.5, 1, 2] as const;
export type PlaybackSpeed = (typeof SPEEDS)[number];

export const FRAME_MS = 1000 / 30;

interface TimelineState {
  currentMs: number;
  playing: boolean;
  speed: PlaybackSpeed;
  loop: boolean;
  scrubbing: boolean;
  setCurrent: (ms: number) => void;
  advance: (deltaMs: number) => void;
  setPlaying: (playing: boolean) => void;
  toggle: () => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setLoop: (loop: boolean) => void;
  setScrubbing: (scrubbing: boolean) => void;
  stepFrames: (frames: number, durationMs: number) => void;
  reset: () => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  currentMs: 0,
  playing: false,
  speed: 1,
  loop: false,
  scrubbing: false,
  setCurrent: (ms) => set({ currentMs: Math.max(0, ms) }),
  advance: (deltaMs) => set((state) => ({ currentMs: Math.max(0, state.currentMs + deltaMs) })),
  setPlaying: (playing) => set({ playing }),
  toggle: () => set((state) => ({ playing: !state.playing })),
  setSpeed: (speed) => set({ speed }),
  setLoop: (loop) => set({ loop }),
  setScrubbing: (scrubbing) => set({ scrubbing }),
  stepFrames: (frames, durationMs) => {
    const next = clamp(get().currentMs + frames * FRAME_MS, 0, durationMs);
    set({ currentMs: next, playing: false });
  },
  reset: () => set({ currentMs: 0, playing: false, scrubbing: false }),
}));
