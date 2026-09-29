import { create } from 'zustand';
import {
  asFormation,
  computePlayDuration,
  getFormationPositions,
  interpolatePlayerStates,
  type Formation,
  type PlayerState,
} from '@tempo/shared-types';
import type {
  Annotation,
  CameraPath,
  Keyframe,
  Phase,
  Play,
  PlayDetail,
  Trajectory,
} from '../lib/trpc';

export function basePlayersFor(
  rotation: number,
  formation: Formation | string = '5-1',
  libero = true,
): PlayerState[] {
  return getFormationPositions(asFormation(formation), rotation, libero).map((player) => ({
    playerId: player.playerId,
    role: player.role,
    position: player.position,
    rotationY: player.rotationY,
    pose: 'ready' as const,
    animationTime: 0,
  }));
}

interface PlayState {
  play: Play | null;
  keyframes: Keyframe[];
  trajectories: Trajectory[];
  phases: Phase[];
  annotations: Annotation[];
  cameraPaths: CameraPath[];
  players: PlayerState[];
  durationMs: number;
  dirty: boolean;
  past: PlaySnapshot[];
  future: PlaySnapshot[];
  historyTag: string | null;
  historyAt: number;

  loadDetail: (detail: PlayDetail) => void;
  reset: () => void;
  setPlay: (play: Play) => void;
  setDuration: (durationMs: number) => void;
  setPlayers: (players: PlayerState[], options?: { silent?: boolean }) => void;
  updatePlayer: (playerId: string, patch: Partial<PlayerState>) => void;
  setPlayerPose: (playerId: string, pose: PlayerState['pose']) => void;
  setKeyframes: (keyframes: Keyframe[]) => void;
  upsertKeyframe: (keyframe: Keyframe) => void;
  removeKeyframe: (id: string) => void;
  setTrajectories: (trajectories: Trajectory[]) => void;
  addTrajectory: (trajectory: Trajectory) => void;
  updateTrajectory: (id: string, patch: Partial<Trajectory>) => void;
  removeTrajectory: (id: string) => void;
  setPhases: (phases: Phase[]) => void;
  addPhase: (phase: Phase) => void;
  updatePhase: (id: string, patch: Partial<Phase>) => void;
  removePhase: (id: string) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  setCameraPaths: (cameraPaths: CameraPath[]) => void;
  addCameraPath: (cameraPath: CameraPath) => void;
  updateCameraPath: (id: string, patch: Partial<CameraPath>) => void;
  removeCameraPath: (id: string) => void;
  markDirty: (dirty?: boolean) => void;

  /** Editor undo/redo support. */
  beginHistory: (tag?: string) => void;
  captureSnapshot: () => PlaySnapshot;
  applySnapshot: (snapshot: PlaySnapshot) => void;
  clearHistory: () => void;
}

export interface PlaySnapshot {
  players: PlayerState[];
  keyframes: Keyframe[];
  trajectories: Trajectory[];
  phases: Phase[];
  annotations: Annotation[];
  cameraPaths: CameraPath[];
  durationMs: number;
}

function snapshotOf(state: PlaySnapshot): PlaySnapshot {
  return structuredClone({
    players: state.players,
    keyframes: state.keyframes,
    trajectories: state.trajectories,
    phases: state.phases,
    annotations: state.annotations,
    cameraPaths: state.cameraPaths,
    durationMs: state.durationMs,
  });
}

const emptyState = {
  play: null,
  keyframes: [] as Keyframe[],
  trajectories: [] as Trajectory[],
  phases: [] as Phase[],
  annotations: [] as Annotation[],
  cameraPaths: [] as CameraPath[],
  players: [] as PlayerState[],
  durationMs: 6000,
  dirty: false,
  past: [] as PlaySnapshot[],
  future: [] as PlaySnapshot[],
  historyTag: null as string | null,
  historyAt: 0,
};

export const usePlayStore = create<PlayState>((set, get) => ({
  ...emptyState,

  loadDetail: (detail) => {
    const base = basePlayersFor(detail.play.rotation, detail.play.formation, detail.play.libero);
    const players =
      detail.keyframes.length > 0
        ? interpolatePlayerStates(detail.keyframes, 0, base)
        : base;
    set({
      play: detail.play,
      keyframes: detail.keyframes,
      trajectories: detail.trajectories,
      phases: detail.phases,
      annotations: detail.annotations,
      cameraPaths: detail.cameraPaths,
      players,
      durationMs: Math.max(
        computePlayDuration({
          keyframes: detail.keyframes,
          trajectories: detail.trajectories,
          phases: detail.phases,
        }),
        detail.phases.reduce((max, phase) => Math.max(max, phase.endMs), 0) + 1000,
        detail.trajectories.reduce((max, t) => Math.max(max, t.startMs + t.durationMs), 0) + 1000,
        detail.keyframes.reduce((max, k) => Math.max(max, k.timestampMs), 0) + 1000,
      ),
      dirty: false,
      // A fresh play starts with a clean history.
      past: [],
      future: [],
      historyTag: null,
      historyAt: 0,
    });
  },

  reset: () => set({ ...emptyState }),

  setPlay: (play) => set({ play }),
  setDuration: (durationMs) =>
    set({ durationMs: Number.isFinite(durationMs) ? Math.max(1000, durationMs) : 6000 }),

  setPlayers: (players, options) => {
    if (!options?.silent) get().beginHistory();
    set({ players });
  },
  updatePlayer: (playerId, patch) => {
    get().beginHistory(`player:${playerId}`);
    set((state) => ({
      players: state.players.map((player) =>
        player.playerId === playerId ? { ...player, ...patch } : player,
      ),
    }));
  },
  setPlayerPose: (playerId, pose) => {
    get().beginHistory(`pose:${playerId}`);
    set((state) => ({
      players: state.players.map((player) =>
        player.playerId === playerId ? { ...player, pose } : player,
      ),
    }));
  },

  setKeyframes: (keyframes) => {
    get().beginHistory('keyframes');
    set({ keyframes });
  },
  upsertKeyframe: (keyframe) => {
    get().beginHistory();
    set((state) => {
      const next = state.keyframes.filter((k) => k.id !== keyframe.id && k.timestampMs !== keyframe.timestampMs);
      next.push(keyframe);
      next.sort((a, b) => a.timestampMs - b.timestampMs);
      return { keyframes: next, dirty: true };
    });
  },
  removeKeyframe: (id) => {
    get().beginHistory();
    set((state) => ({ keyframes: state.keyframes.filter((k) => k.id !== id), dirty: true }));
  },

  setTrajectories: (trajectories) => set({ trajectories }),
  addTrajectory: (trajectory) => {
    get().beginHistory();
    set((state) => ({ trajectories: [...state.trajectories, trajectory] }));
  },
  updateTrajectory: (id, patch) => {
    get().beginHistory(`trajectory:${id}`);
    set((state) => ({
      trajectories: state.trajectories.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },
  removeTrajectory: (id) => {
    get().beginHistory();
    set((state) => ({ trajectories: state.trajectories.filter((t) => t.id !== id) }));
  },

  setPhases: (phases) => set({ phases }),
  addPhase: (phase) => {
    get().beginHistory();
    set((state) => ({ phases: [...state.phases, phase].sort((a, b) => a.startMs - b.startMs) }));
  },
  updatePhase: (id, patch) => {
    get().beginHistory(`phase:${id}`);
    set((state) => ({
      phases: state.phases
        .map((p) => (p.id === id ? { ...p, ...patch } : p))
        .sort((a, b) => a.startMs - b.startMs),
    }));
  },
  removePhase: (id) => {
    get().beginHistory();
    set((state) => ({ phases: state.phases.filter((p) => p.id !== id) }));
  },

  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) => {
    get().beginHistory();
    set((state) => ({ annotations: [...state.annotations, annotation] }));
  },
  updateAnnotation: (id, patch) => {
    get().beginHistory(`annotation:${id}`);
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  },
  removeAnnotation: (id) => {
    get().beginHistory();
    set((state) => ({ annotations: state.annotations.filter((a) => a.id !== id) }));
  },

  setCameraPaths: (cameraPaths) => set({ cameraPaths }),
  addCameraPath: (cameraPath) => {
    get().beginHistory();
    set((state) => ({ cameraPaths: [...state.cameraPaths, cameraPath] }));
  },
  updateCameraPath: (id, patch) => {
    get().beginHistory(`camera:${id}`);
    set((state) => ({
      cameraPaths: state.cameraPaths.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },
  removeCameraPath: (id) => {
    get().beginHistory();
    set((state) => ({ cameraPaths: state.cameraPaths.filter((p) => p.id !== id) }));
  },

  markDirty: (dirty = true) => set({ dirty }),

  beginHistory: (tag) =>
    set((state) => {
      const now = Date.now();
      const coalesce =
        tag !== undefined && state.historyTag === tag && now - state.historyAt < 1000;
      if (coalesce) return { historyAt: now };
      return {
        past: [...state.past.slice(-59), snapshotOf(state)],
        future: [],
        historyTag: tag ?? null,
        historyAt: now,
      };
    }),

  captureSnapshot: () => snapshotOf(get()),

  applySnapshot: (snapshot) =>
    set({
      players: structuredClone(snapshot.players),
      keyframes: structuredClone(snapshot.keyframes),
      trajectories: structuredClone(snapshot.trajectories),
      phases: structuredClone(snapshot.phases),
      annotations: structuredClone(snapshot.annotations),
      cameraPaths: structuredClone(snapshot.cameraPaths),
      durationMs: snapshot.durationMs,
    }),

  clearHistory: () => set({ past: [], future: [], historyTag: null, historyAt: 0 }),
}));
