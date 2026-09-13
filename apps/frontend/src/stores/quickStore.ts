import { create } from 'zustand';
import { NET_HEIGHT_MEN, clamp, type Formation, type PlayerState, type Vec3 } from '@tempo/shared-types';
import type { Keyframe, Trajectory } from '../lib/trpc';
import { basePlayersFor, usePlayStore } from './playStore';
import { useEditorStore } from './editorStore';
import { useTimelineStore } from './timelineStore';
import {
  QUICK_SET_HEIGHT_DEFAULT,
  QUICK_TIMING,
  autoPose,
  buildKeyframes,
  buildLegs,
  buildTrajectories,
  resolveRoleIds,
  syncOpponents,
  type QuickRoles,
  type QuickStep,
} from '../features/quick/quickPlay';

export type QuickFormation = Formation | 'custom';

const CUSTOM_KEY = 'tempo.customFormations.v1';

function readCustomFormations(): Record<string, PlayerState[]> {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PlayerState[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCustomFormations(value: Record<string, PlayerState[]>): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

interface QuickSnapshot {
  step: QuickStep;
  rotation: number;
  formation: QuickFormation;
  roles: QuickRoles;
  libero: boolean;
  ballTargets: Vec3[];
  spikeTarget: Vec3 | null;
  blockers: number;
  receiveFormation: PlayerState[] | null;
  attackFormation: PlayerState[] | null;
  setHeight: number;
  selectedTarget: number | null;
  players: PlayerState[];
  keyframes: Keyframe[];
  trajectories: Trajectory[];
  durationMs: number;
}

interface QuickState {
  active: boolean;
  step: QuickStep;
  rotation: number;
  formation: QuickFormation;
  roles: QuickRoles;
  customFormations: Record<string, PlayerState[]>;
  libero: boolean;
  name: string;
  setHeight: number;
  receiveFormation: PlayerState[] | null;
  attackFormation: PlayerState[] | null;
  ballTargets: Vec3[];
  spikeTarget: Vec3 | null;
  selectedTarget: number | null;
  blockers: number;
  rosterOpen: boolean;
  past: QuickSnapshot[];
  future: QuickSnapshot[];
  historyTag: string | null;
  historyAt: number;
  savedPlayId: string | null;
  saving: boolean;
  error: string | null;

  start: (rotation?: number) => void;
  stop: () => void;
  setStep: (step: QuickStep) => void;
  setName: (name: string) => void;
  setRotation: (rotation: number) => void;
  setFormation: (formation: QuickFormation) => void;
  saveCustomFormation: () => void;
  setRole: (kind: 'receiver' | 'setter' | 'spiker', playerId: string | null) => void;
  syncDefaultRoles: () => void;
  setLibero: (libero: boolean) => void;
  setSetHeight: (height: number) => void;
  toggleRoster: () => void;
  beginHistory: (tag?: string) => void;
  undo: () => void;
  redo: () => void;
  addBallTarget: (point: Vec3) => void;
  updateBallTarget: (index: number, point: Vec3) => void;
  undoBallTarget: () => void;
  clearBall: () => void;
  setSpikeTarget: (point: Vec3 | null) => void;
  selectTarget: (index: number | null) => void;
  nudgeSelected: (dx: number, dz: number) => void;
  setBlockers: (count: number) => void;
  lockReceive: () => void;
  startPlayback: () => void;
  markSaving: () => void;
  markSaved: (playId: string) => void;
  markError: (message: string) => void;
}

const initialState = {
  active: false,
  step: 'receive' as QuickStep,
  rotation: 1,
  formation: '5-1' as QuickFormation,
  roles: {} as QuickRoles,
  customFormations: {} as Record<string, PlayerState[]>,
  libero: true,
  name: 'Quick play',
  setHeight: QUICK_SET_HEIGHT_DEFAULT,
  receiveFormation: null as PlayerState[] | null,
  attackFormation: null as PlayerState[] | null,
  ballTargets: [] as Vec3[],
  spikeTarget: null as Vec3 | null,
  selectedTarget: null as number | null,
  blockers: 0,
  rosterOpen: true,
  past: [] as QuickSnapshot[],
  future: [] as QuickSnapshot[],
  historyTag: null as string | null,
  historyAt: 0,
  savedPlayId: null as string | null,
  saving: false,
  error: null as string | null,
};

function cloneState(player: PlayerState): PlayerState {
  return { ...player, position: { ...player.position } };
}

function capture(state: QuickState): QuickSnapshot {
  const playStore = usePlayStore.getState();
  return {
    step: state.step,
    rotation: state.rotation,
    formation: state.formation,
    roles: { ...state.roles },
    libero: state.libero,
    ballTargets: state.ballTargets.map((point) => ({ ...point })),
    spikeTarget: state.spikeTarget ? { ...state.spikeTarget } : null,
    blockers: state.blockers,
    receiveFormation: state.receiveFormation?.map(cloneState) ?? null,
    attackFormation: state.attackFormation?.map(cloneState) ?? null,
    setHeight: state.setHeight,
    selectedTarget: state.selectedTarget,
    players: playStore.players.map(cloneState),
    keyframes: playStore.keyframes.map((keyframe) => ({
      ...keyframe,
      playerStates: keyframe.playerStates.map(cloneState),
    })),
    trajectories: playStore.trajectories.map((trajectory) => ({
      ...trajectory,
      controlPoints: trajectory.controlPoints.map((point) => ({ ...point })),
    })),
    durationMs: playStore.durationMs,
  };
}

function apply(snapshot: QuickSnapshot): void {
  const playStore = usePlayStore.getState();
  const timeline = useTimelineStore.getState();
  playStore.setPlayers(snapshot.players.map(cloneState));
  playStore.setKeyframes(snapshot.keyframes.map((keyframe) => ({
    ...keyframe,
    playerStates: keyframe.playerStates.map(cloneState),
  })));
  playStore.setTrajectories(snapshot.trajectories.map((trajectory) => ({
    ...trajectory,
    controlPoints: trajectory.controlPoints.map((point) => ({ ...point })),
  })));
  playStore.setDuration(snapshot.durationMs);
  if (snapshot.step === 'play') {
    timeline.setCurrent(0);
    timeline.setPlaying(true);
  } else {
    timeline.reset();
  }
  useQuickStore.setState({
    step: snapshot.step,
    rotation: snapshot.rotation,
    formation: snapshot.formation,
    libero: snapshot.libero,
    ballTargets: snapshot.ballTargets.map((point) => ({ ...point })),
    spikeTarget: snapshot.spikeTarget ? { ...snapshot.spikeTarget } : null,
    blockers: snapshot.blockers,
    roles: { ...snapshot.roles },
    receiveFormation: snapshot.receiveFormation?.map(cloneState) ?? null,
    attackFormation: snapshot.attackFormation?.map(cloneState) ?? null,
    setHeight: snapshot.setHeight,
    selectedTarget: snapshot.selectedTarget,
  });
}

export const useQuickStore = create<QuickState>((set, get) => ({
  ...initialState,

  start: (rotation = 1) => {
    usePlayStore.getState().reset();
    usePlayStore.getState().setPlay({
      id: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      name: 'Quick play',
      category: 'serve_receive',
      rotation,
      formation: '5-1',
      libero: true,
      courtType: 'indoor',
      netHeight: NET_HEIGHT_MEN,
      description: null,
      coachingNotes: null,
      isPublic: false,
      thumbnailUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    usePlayStore.getState().setPlayers(basePlayersFor(rotation, '5-1', true));
    usePlayStore.getState().setDuration(QUICK_TIMING.totalMs);
    useTimelineStore.getState().reset();
    useEditorStore.getState().setTool('select');
    useEditorStore.getState().setDragEnabled(true);
    set({ ...initialState, customFormations: readCustomFormations(), active: true, rotation });
  },

  stop: () => {
    usePlayStore.getState().reset();
    useTimelineStore.getState().reset();
    useEditorStore.getState().setDragEnabled(true);
    set({ ...initialState, customFormations: get().customFormations });
  },

  beginHistory: (tag) =>
    set((state) => {
      const now = Date.now();
      const coalesce =
        tag !== undefined && state.historyTag === tag && now - state.historyAt < 1000;
      return {
        past: coalesce ? state.past : [...state.past.slice(-59), capture(state)],
        future: [],
        historyTag: tag ?? null,
        historyAt: now,
      };
    }),

  undo: () => {
    const state = get();
    const previous = state.past.at(-1);
    if (!previous) return;
    const current = capture(state);
    set((store) => ({
      past: store.past.slice(0, -1),
      future: [current, ...store.future].slice(0, 60),
      historyTag: null,
    }));
    apply(previous);
  },

  redo: () => {
    const state = get();
    const next = state.future[0];
    if (!next) return;
    const current = capture(state);
    set((store) => ({
      past: [...store.past.slice(-59), current],
      future: store.future.slice(1),
      historyTag: null,
    }));
    apply(next);
  },

  setStep: (step) => {
    const current = get().step;
    if (step === current) return;
    if (step === 'play') {
      get().startPlayback();
      return;
    }
    get().beginHistory();
    if (current === 'play') {
      usePlayStore.getState().setKeyframes([]);
      usePlayStore.getState().setTrajectories([]);
      useTimelineStore.getState().reset();
      const attack = get().attackFormation;
      if (attack) usePlayStore.getState().setPlayers(attack);
    }
    set({ step, selectedTarget: null });
  },

  setName: (name) => set({ name }),

  setRotation: (rotation) => {
    get().beginHistory();
    const { formation, libero, customFormations } = get();
    if (formation === 'custom') {
      const saved = customFormations[String(rotation)];
      if (saved) usePlayStore.getState().setPlayers(saved.map(cloneState));
      else usePlayStore.getState().setPlayers(basePlayersFor(rotation, '5-1', libero));
    } else {
      usePlayStore.getState().setPlayers(basePlayersFor(rotation, formation, libero));
    }
    set({
      rotation,
      receiveFormation: null,
      attackFormation: null,
      selectedTarget: null,
    });
  },

  setFormation: (formation) => {
    get().beginHistory();
    const { rotation, libero, customFormations } = get();
    const play = usePlayStore.getState().play;
    if (formation === 'custom') {
      const saved = customFormations[String(rotation)];
      if (saved) usePlayStore.getState().setPlayers(saved.map(cloneState));
      if (play) usePlayStore.getState().setPlay({ ...play, formation: '5-1' });
    } else {
      usePlayStore.getState().setPlayers(basePlayersFor(rotation, formation, libero));
      if (play) usePlayStore.getState().setPlay({ ...play, formation });
    }
    set({
      formation,
      receiveFormation: null,
      attackFormation: null,
      selectedTarget: null,
    });
  },

  saveCustomFormation: () => {
    const { rotation, customFormations } = get();
    const saved = usePlayStore.getState().players.map(cloneState);
    const next = { ...customFormations, [String(rotation)]: saved };
    writeCustomFormations(next);
    set({ customFormations: next, formation: 'custom' });
  },

  setRole: (kind, playerId) => set((state) => ({ roles: { ...state.roles, [kind]: playerId } })),

  syncDefaultRoles: () => {
    const { ballTargets, spikeTarget, roles } = get();
    const ids = resolveRoleIds(usePlayStore.getState().players, {
      serveTarget: ballTargets[0] ?? null,
      setterSpot: ballTargets[1] ?? null,
      setTarget: ballTargets[2] ?? null,
      spikeTarget,
      roles,
    });
    set({ roles: ids });
  },

  setLibero: (libero) => {
    get().beginHistory();
    const { rotation, formation } = get();
    const play = usePlayStore.getState().play;
    const baseFormation = formation === 'custom' ? '5-1' : formation;
    usePlayStore.getState().setPlayers(basePlayersFor(rotation, baseFormation, libero));
    if (play) usePlayStore.getState().setPlay({ ...play, libero });
    set({
      formation: baseFormation,
      libero,
      receiveFormation: null,
      attackFormation: null,
      selectedTarget: null,
    });
  },

  setSetHeight: (setHeight) => set({ setHeight }),

  toggleRoster: () => set((state) => ({ rosterOpen: !state.rosterOpen })),

  addBallTarget: (point) => {
    get().beginHistory();
    set((state) => {
      if (state.ballTargets.length >= 3) return {};
      const targets = [...state.ballTargets, point];
      return {
        ballTargets: targets,
        selectedTarget: null,
        step: targets.length === 3 ? 'attack' : 'ball',
      };
    });
    get().syncDefaultRoles();
  },

  updateBallTarget: (index, point) => {
    set((state) =>
      index < state.ballTargets.length
        ? { ballTargets: state.ballTargets.map((item, i) => (i === index ? point : item)) }
        : {},
    );
  },

  undoBallTarget: () => {
    if (get().ballTargets.length === 0) return;
    get().beginHistory();
    set((state) => ({
      ballTargets: state.ballTargets.slice(0, -1),
      selectedTarget: null,
      step: 'ball',
    }));
    get().syncDefaultRoles();
  },

  clearBall: () => {
    if (get().ballTargets.length === 0 && !get().spikeTarget) return;
    get().beginHistory();
    set({ ballTargets: [], spikeTarget: null, selectedTarget: null, step: 'ball', roles: {} });
  },

  setSpikeTarget: (spikeTarget) => {
    set({ spikeTarget });
    get().syncDefaultRoles();
  },

  selectTarget: (selectedTarget) => set({ selectedTarget }),

  nudgeSelected: (dx, dz) => {
    const { selectedTarget } = get();
    if (selectedTarget === null) return;
    get().beginHistory(`nudge:${selectedTarget}`);
    if (selectedTarget < 3) {
      const target = get().ballTargets[selectedTarget];
      if (!target) return;
      get().updateBallTarget(selectedTarget, {
        x: clamp(target.x + dx, -12, 12),
        y: 0,
        z: clamp(target.z + dz, -7, 7),
      });
      return;
    }
    const spike = get().spikeTarget;
    if (!spike) return;
    get().setSpikeTarget({
      x: clamp(spike.x + dx, -12, 12),
      y: 0,
      z: clamp(spike.z + dz, -7, 7),
    });
  },

  setBlockers: (count) => {
    get().beginHistory();
    const { ballTargets, spikeTarget, roles } = get();
    const anchorZ = spikeTarget?.z ?? ballTargets[2]?.z ?? 0;
    const synced = syncOpponents(usePlayStore.getState().players, count, anchorZ);
    usePlayStore.getState().setPlayers(
      autoPose(synced, {
        passTarget: ballTargets[0] ?? null,
        setTarget: ballTargets[1] ?? null,
        spikeTarget,
        roles,
      }),
    );
    set({ blockers: count });
  },

  lockReceive: () => {
    get().beginHistory();
    set({
      receiveFormation: usePlayStore.getState().players.map(cloneState),
      step: 'ball',
      selectedTarget: null,
    });
  },

  startPlayback: () => {
    const { receiveFormation, ballTargets, spikeTarget, setHeight, blockers, roles } = get();
    if (!receiveFormation || ballTargets.length < 3) return;
    const play = usePlayStore.getState().play;
    if (!play) return;
    get().beginHistory();

    const anchorZ = spikeTarget?.z ?? ballTargets[2]?.z ?? 0;
    const synced = syncOpponents(usePlayStore.getState().players, blockers, anchorZ);
    const attack = autoPose(synced, {
      passTarget: ballTargets[0] ?? null,
      setTarget: ballTargets[1] ?? null,
      spikeTarget,
      roles,
    });

    const legs = buildLegs(ballTargets, spikeTarget, setHeight);
    usePlayStore.getState().setPlayers(attack);
    usePlayStore.getState().setTrajectories(buildTrajectories(play.id, legs));
    usePlayStore.getState().setKeyframes(
      buildKeyframes(play.id, {
        receive: receiveFormation,
        attack,
        serveTarget: ballTargets[0] ?? null,
        setterSpot: ballTargets[1] ?? null,
        setTarget: ballTargets[2] ?? null,
        spikeTarget,
        roles,
      }),
    );
    usePlayStore.getState().setDuration(QUICK_TIMING.totalMs);
    useTimelineStore.getState().setCurrent(0);
    useTimelineStore.getState().setPlaying(true);
    set({ step: 'play', attackFormation: attack, blockers, selectedTarget: null });
  },

  markSaving: () => set({ saving: true, error: null }),
  markSaved: (savedPlayId) => set({ saving: false, savedPlayId, error: null }),
  markError: (error) => set({ saving: false, error }),
}));
