import { useCallback } from 'react';
import { trpc } from '../../lib/trpc';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';

/** Delete whatever the inspector currently has selected. */
export function useDeleteSelection() {
  const deleteKeyframe = trpc.keyframe.delete.useMutation();
  const deleteTrajectory = trpc.trajectory.delete.useMutation();
  const deletePhase = trpc.phase.delete.useMutation();
  const deleteAnnotation = trpc.annotation.delete.useMutation();
  const deleteCameraPath = trpc.camera.deletePath.useMutation();

  return useCallback(() => {
    const editor = useEditorStore.getState();
    const store = usePlayStore.getState();

    if (editor.selectedKeyframeId) {
      const id = editor.selectedKeyframeId;
      deleteKeyframe.mutate(
        { id },
        {
          onSuccess: () => {
            store.removeKeyframe(id);
            editor.selectKeyframe(null);
          },
          onError: (error) => console.error(error),
        },
      );
      return;
    }
    if (editor.selectedTrajectoryId) {
      const id = editor.selectedTrajectoryId;
      deleteTrajectory.mutate(
        { id },
        {
          onSuccess: () => {
            store.removeTrajectory(id);
            editor.selectTrajectory(null);
          },
          onError: (error) => console.error(error),
        },
      );
      return;
    }
    if (editor.selectedPhaseId) {
      const id = editor.selectedPhaseId;
      deletePhase.mutate(
        { id },
        {
          onSuccess: () => {
            store.removePhase(id);
            editor.selectPhase(null);
          },
          onError: (error) => console.error(error),
        },
      );
      return;
    }
    if (editor.selectedAnnotationId) {
      const id = editor.selectedAnnotationId;
      deleteAnnotation.mutate(
        { id },
        {
          onSuccess: () => {
            store.removeAnnotation(id);
            editor.selectAnnotation(null);
          },
          onError: (error) => console.error(error),
        },
      );
      return;
    }
    if (editor.selectedCameraPathId) {
      const id = editor.selectedCameraPathId;
      deleteCameraPath.mutate(
        { id },
        {
          onSuccess: () => {
            store.removeCameraPath(id);
            editor.selectCameraPath(null);
          },
          onError: (error) => console.error(error),
        },
      );
    }
  }, [
    deleteAnnotation,
    deleteCameraPath,
    deleteKeyframe,
    deletePhase,
    deleteTrajectory,
  ]);
}
