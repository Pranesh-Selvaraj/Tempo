import { create } from 'zustand';
import type { RecordingPresetId } from '@tempo/shared-types';
import type { RecordingResult } from '../features/recording/useRecorder';

export type RenderJobStatus =
  | 'queued'
  | 'rendering'
  | 'finalizing'
  | 'done'
  | 'error'
  | 'cancelled';

export interface RenderJob {
  id: string;
  presetId: RecordingPresetId;
  status: RenderJobStatus;
  progress: number;
  frame: number;
  totalFrames: number;
  error?: string;
  result?: RecordingResult;
  createdAt: number;
}

const controllers = new Map<string, AbortController>();

export function registerRenderAbort(id: string, controller: AbortController): void {
  controllers.set(id, controller);
}

export function releaseRenderJob(id: string): void {
  controllers.delete(id);
}

export function abortRenderJob(id: string): void {
  controllers.get(id)?.abort();
  controllers.delete(id);
}

interface RenderQueueState {
  jobs: RenderJob[];
  activeJobId: string | null;
  enqueue: (presetId: RecordingPresetId) => string;
  updateJob: (id: string, patch: Partial<RenderJob>) => void;
  removeJob: (id: string) => void;
  cancelJob: (id: string) => void;
  clearFinished: () => void;
  setActiveJob: (id: string | null) => void;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** In-browser studio render queue — jobs run one after another, off the UI's critical path. */
export const useRenderQueueStore = create<RenderQueueState>((set) => ({
  jobs: [],
  activeJobId: null,

  enqueue: (presetId) => {
    const id = newId();
    set((state) => ({
      jobs: [
        ...state.jobs,
        {
          id,
          presetId,
          status: 'queued',
          progress: 0,
          frame: 0,
          totalFrames: 0,
          createdAt: Date.now(),
        },
      ],
    }));
    return id;
  },

  updateJob: (id, patch) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    })),

  removeJob: (id) => {
    abortRenderJob(id);
    set((state) => ({ jobs: state.jobs.filter((job) => job.id !== id) }));
  },

  cancelJob: (id) => {
    abortRenderJob(id);
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id && (job.status === 'queued' || job.status === 'rendering' || job.status === 'finalizing')
          ? { ...job, status: 'cancelled' }
          : job,
      ),
    }));
  },

  clearFinished: () =>
    set((state) => ({
      jobs: state.jobs.filter(
        (job) => job.status === 'queued' || job.status === 'rendering' || job.status === 'finalizing',
      ),
    })),

  setActiveJob: (activeJobId) => set({ activeJobId }),
}));
