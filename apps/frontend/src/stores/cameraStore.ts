import { create } from 'zustand';
import type { CameraPresetId } from '@tempo/shared-types';

interface CameraStoreState {
  presetId: CameraPresetId;
  /** Camera path id currently driving playback, or null for the static preset. */
  previewPathId: string | null;
  setPreset: (presetId: CameraPresetId) => void;
  setPreviewPath: (pathId: string | null) => void;
}

export const useCameraStore = create<CameraStoreState>((set) => ({
  presetId: 'coach',
  previewPathId: null,
  setPreset: (presetId) => set({ presetId, previewPathId: null }),
  setPreviewPath: (previewPathId) => set({ previewPathId }),
}));
