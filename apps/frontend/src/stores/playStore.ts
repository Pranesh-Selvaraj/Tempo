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

  loadDetail: (detail: PlayDetail) => void;
  reset: () => void;
  setPlay: (play: Play) => void;
  setDuration: (durationMs: number) => void;
  setPlayers: (players: PlayerState[]) => void;
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
};

export const usePlayStore = create<PlayState>((set) => ({
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
    });
  },

  reset: () => set({ ...emptyState }),

  setPlay: (play) => set({ play }),
  setDuration: (durationMs) =>
    set({ durationMs: Number.isFinite(durationMs) ? Math.max(1000, durationMs) : 6000 }),

  setPlayers: (players) => set({ players }),
  updatePlayer: (playerId, patch) =>
    set((state) => ({
      players: state.players.map((player) =>
        player.playerId === playerId ? { ...player, ...patch } : player,
      ),
    })),
  setPlayerPose: (playerId, pose) =>
    set((state) => ({
      players: state.players.map((player) =>
        player.playerId === playerId ? { ...player, pose } : player,
      ),
    })),

  setKeyframes: (keyframes) => set({ keyframes }),
  upsertKeyframe: (keyframe) =>
    set((state) => {
      const next = state.keyframes.filter((k) => k.id !== keyframe.id && k.timestampMs !== keyframe.timestampMs);
      next.push(keyframe);
      next.sort((a, b) => a.timestampMs - b.timestampMs);
      return { keyframes: next, dirty: true };
    }),
  removeKeyframe: (id) =>
    set((state) => ({ keyframes: state.keyframes.filter((k) => k.id !== id), dirty: true })),

  setTrajectories: (trajectories) => set({ trajectories }),
  addTrajectory: (trajectory) => set((state) => ({ trajectories: [...state.trajectories, trajectory] })),
  updateTrajectory: (id, patch) =>
    set((state) => ({
      trajectories: state.trajectories.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTrajectory: (id) =>
    set((state) => ({ trajectories: state.trajectories.filter((t) => t.id !== id) })),

  setPhases: (phases) => set({ phases }),
  addPhase: (phase) => set((state) => ({ phases: [...state.phases, phase].sort((a, b) => a.startMs - b.startMs) })),
  updatePhase: (id, patch) =>
    set((state) => ({
      phases: state.phases
        .map((p) => (p.id === id ? { ...p, ...patch } : p))
        .sort((a, b) => a.startMs - b.startMs),
    })),
  removePhase: (id) => set((state) => ({ phases: state.phases.filter((p) => p.id !== id) })),

  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) => set((state) => ({ annotations: [...state.annotations, annotation] })),
  updateAnnotation: (id, patch) =>
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),
  removeAnnotation: (id) =>
    set((state) => ({ annotations: state.annotations.filter((a) => a.id !== id) })),

  setCameraPaths: (cameraPaths) => set({ cameraPaths }),
  addCameraPath: (cameraPath) => set((state) => ({ cameraPaths: [...state.cameraPaths, cameraPath] })),
  updateCameraPath: (id, patch) =>
    set((state) => ({
      cameraPaths: state.cameraPaths.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removeCameraPath: (id) =>
    set((state) => ({ cameraPaths: state.cameraPaths.filter((p) => p.id !== id) })),

  markDirty: (dirty = true) => set({ dirty }),
}));
