import { useCallback } from 'react';
import { ballPositionAt } from '../../lib/ballPosition';
import { trpc } from '../../lib/trpc';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';

/** Snapshot the current roster + ball into a keyframe at the playhead. */
export function useRecordKeyframe() {
  const upsert = trpc.keyframe.upsert.useMutation();

  return useCallback(() => {
    const { play, players, trajectories, keyframes } = usePlayStore.getState();
    if (!play || useEditorStore.getState().recordingFrame.active) return;
    const timestampMs = Math.round(useTimelineStore.getState().currentMs);
    const ball = ballPositionAt(trajectories, keyframes, timestampMs);
    upsert.mutate(
      {
        playId: play.id,
        timestampMs,
        playerStates: players,
        ballState: ball,
        cameraState: null,
      },
      {
        onSuccess: (keyframe) => {
          usePlayStore.getState().upsertKeyframe(keyframe);
          useEditorStore.getState().selectKeyframe(keyframe.id);
        },
        onError: (error) => console.error('Could not record keyframe', error),
      },
    );
  }, [upsert]);
}
