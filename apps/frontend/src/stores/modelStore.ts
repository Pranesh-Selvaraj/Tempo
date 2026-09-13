import { create } from 'zustand';
import type { Pose } from '@tempo/shared-types';

export interface ModelSettings {
  modelUrl: string | null;
  yawOffsetDeg: number;
  scale: number;
  autoScale: boolean;
  timeScale: number;
  clipMap: Partial<Record<Pose, string>>;
}

interface ModelStoreState extends ModelSettings {
  availableClips: string[];
  setModelUrl: (url: string | null) => void;
  setYawOffset: (deg: number) => void;
  setScale: (scale: number) => void;
  setAutoScale: (value: boolean) => void;
  setTimeScale: (value: number) => void;
  setClip: (pose: Pose, clip: string | null) => void;
  setAvailableClips: (clips: string[]) => void;
}

const STORAGE_KEY = 'tempo.player-model';

const DEFAULTS: ModelSettings = {
  modelUrl: null,
  // Mixamo exports face +Z; our mannequins face −Z.
  yawOffsetDeg: 180,
  scale: 1,
  autoScale: true,
  timeScale: 1,
  clipMap: {},
};

function readStored(): Partial<ModelSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ModelSettings>;
    return {
      modelUrl: typeof parsed.modelUrl === 'string' && parsed.modelUrl.length > 0 ? parsed.modelUrl : null,
      yawOffsetDeg: typeof parsed.yawOffsetDeg === 'number' ? parsed.yawOffsetDeg : DEFAULTS.yawOffsetDeg,
      scale: typeof parsed.scale === 'number' ? parsed.scale : DEFAULTS.scale,
      autoScale: typeof parsed.autoScale === 'boolean' ? parsed.autoScale : DEFAULTS.autoScale,
      timeScale: typeof parsed.timeScale === 'number' ? parsed.timeScale : DEFAULTS.timeScale,
      clipMap: parsed.clipMap && typeof parsed.clipMap === 'object' ? parsed.clipMap : {},
    };
  } catch {
    return {};
  }
}

function persist(state: ModelStoreState): void {
  const settings: ModelSettings = {
    modelUrl: state.modelUrl,
    yawOffsetDeg: state.yawOffsetDeg,
    scale: state.scale,
    autoScale: state.autoScale,
    timeScale: state.timeScale,
    clipMap: state.clipMap,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Could not persist player model settings', error);
  }
}

/**
 * User-supplied GLB player model (Mixamo or similar). Stored as a client
 * preference because licensed models never ship with the repo — drop files in
 * `public/models/` and reference them by URL.
 */
export const useModelStore = create<ModelStoreState>((set, get) => ({
  ...DEFAULTS,
  ...readStored(),
  availableClips: [],

  setModelUrl: (modelUrl) => {
    set({ modelUrl, availableClips: [], clipMap: {} });
    persist(get());
  },
  setYawOffset: (yawOffsetDeg) => {
    set({ yawOffsetDeg });
    persist(get());
  },
  setScale: (scale) => {
    set({ scale });
    persist(get());
  },
  setAutoScale: (autoScale) => {
    set({ autoScale });
    persist(get());
  },
  setTimeScale: (timeScale) => {
    set({ timeScale });
    persist(get());
  },
  setClip: (pose, clip) => {
    const clipMap = { ...get().clipMap };
    if (clip) clipMap[pose] = clip;
    else delete clipMap[pose];
    set({ clipMap });
    persist(get());
  },
  setAvailableClips: (availableClips) => set({ availableClips }),
}));
