import { create } from 'zustand';
import type { TrajectoryType, Vec3 } from '@tempo/shared-types';

export type EditorTool = 'select' | 'draw-trajectory' | 'place-annotation';

interface RecordingFrame {
  active: boolean;
  width: number;
  height: number;
}

interface EditorState {
  tool: EditorTool;
  trajectoryType: TrajectoryType;
  brushHeight: number;
  draftPoints: Vec3[];

  selectedPlayerId: string | null;
  selectedTrajectoryId: string | null;
  selectedPointIndex: number | null;
  selectedKeyframeId: string | null;
  selectedPhaseId: string | null;
  selectedAnnotationId: string | null;
  selectedCameraPathId: string | null;

  showZones: boolean;
  showGhosts: boolean;
  showTrajectories: boolean;
  showRoster: boolean;
  recordingFrame: RecordingFrame;
  pendingAnnotation: Vec3 | null;
  editing: boolean;
  dragEnabled: boolean;
  renderJobActive: boolean;

  setTool: (tool: EditorTool) => void;
  setTrajectoryType: (type: TrajectoryType) => void;
  setBrushHeight: (height: number) => void;
  startDraft: () => void;
  addDraftPoint: (point: Vec3) => void;
  clearDraft: () => void;

  selectPlayer: (id: string | null) => void;
  selectTrajectory: (id: string | null) => void;
  selectPoint: (index: number | null) => void;
  selectKeyframe: (id: string | null) => void;
  selectPhase: (id: string | null) => void;
  selectAnnotation: (id: string | null) => void;
  selectCameraPath: (id: string | null) => void;
  clearSelection: () => void;

  toggleZones: () => void;
  toggleGhosts: () => void;
  toggleTrajectories: () => void;
  toggleRoster: () => void;
  setRecordingFrame: (frame: Partial<RecordingFrame>) => void;
  setPendingAnnotation: (point: Vec3 | null) => void;
  setEditing: (editing: boolean) => void;
  setDragEnabled: (dragEnabled: boolean) => void;
  setRenderJobActive: (active: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tool: 'select',
  trajectoryType: 'serve',
  brushHeight: 1.5,
  draftPoints: [],

  selectedPlayerId: null,
  selectedTrajectoryId: null,
  selectedPointIndex: null,
  selectedKeyframeId: null,
  selectedPhaseId: null,
  selectedAnnotationId: null,
  selectedCameraPathId: null,

  showZones: false,
  showGhosts: true,
  showTrajectories: true,
  showRoster: true,
  recordingFrame: { active: false, width: 1080, height: 1920 },
  pendingAnnotation: null,
  editing: true,
  dragEnabled: true,
  renderJobActive: false,

  setTool: (tool) => set({ tool, ...(tool === 'draw-trajectory' ? {} : { draftPoints: [] }) }),
  setTrajectoryType: (trajectoryType) => set({ trajectoryType }),
  setBrushHeight: (brushHeight) => set({ brushHeight }),
  startDraft: () => set({ draftPoints: [], tool: 'draw-trajectory' }),
  addDraftPoint: (point) => set((state) => ({ draftPoints: [...state.draftPoints, point] })),
  clearDraft: () => set({ draftPoints: [] }),

  selectPlayer: (selectedPlayerId) =>
    set({ selectedPlayerId, selectedTrajectoryId: null, selectedPointIndex: null, selectedAnnotationId: null }),
  selectTrajectory: (selectedTrajectoryId) =>
    set({ selectedTrajectoryId, selectedPlayerId: null, selectedPointIndex: null, selectedAnnotationId: null }),
  selectPoint: (selectedPointIndex) => set({ selectedPointIndex }),
  selectKeyframe: (selectedKeyframeId) => set({ selectedKeyframeId }),
  selectPhase: (selectedPhaseId) => set({ selectedPhaseId }),
  selectAnnotation: (selectedAnnotationId) =>
    set({ selectedAnnotationId, selectedPlayerId: null, selectedTrajectoryId: null }),
  selectCameraPath: (selectedCameraPathId) => set({ selectedCameraPathId }),
  clearSelection: () =>
    set({
      selectedPlayerId: null,
      selectedTrajectoryId: null,
      selectedPointIndex: null,
      selectedAnnotationId: null,
      selectedCameraPathId: null,
    }),

  toggleZones: () => set((state) => ({ showZones: !state.showZones })),
  toggleGhosts: () => set((state) => ({ showGhosts: !state.showGhosts })),
  toggleTrajectories: () => set((state) => ({ showTrajectories: !state.showTrajectories })),
  toggleRoster: () => set((state) => ({ showRoster: !state.showRoster })),
  setRecordingFrame: (frame) => set((state) => ({ recordingFrame: { ...state.recordingFrame, ...frame } })),
  setPendingAnnotation: (pendingAnnotation) => set({ pendingAnnotation }),
  setEditing: (editing) => set({ editing }),
  setDragEnabled: (dragEnabled) => set({ dragEnabled }),
  setRenderJobActive: (renderJobActive) => set({ renderJobActive }),
}));
