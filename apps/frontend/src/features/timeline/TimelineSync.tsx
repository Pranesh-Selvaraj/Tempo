import { useEffect } from 'react';
import { interpolatePlayerStates } from '@tempo/shared-types';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';

/**
 * Keeps the editable roster in sync with the keyframe animation whenever the
 * playhead moves. While the playhead is still, the roster is editable and
 * "Record keyframe" snapshots it.
 */
export function TimelineSync() {
  const currentMs = useTimelineStore((state) => state.currentMs);

  useEffect(() => {
    const { keyframes, players } = usePlayStore.getState();
    if (keyframes.length === 0) return;
    usePlayStore.getState().setPlayers(interpolatePlayerStates(keyframes, currentMs, players));
  }, [currentMs]);

  return null;
}
