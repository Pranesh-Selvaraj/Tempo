import { useFrame } from '@react-three/fiber';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';

/**
 * Advances the timeline. Playback state is a pure function of
 * (keyframes, currentMs), so recordings are reproducible.
 */
export function PlaybackDriver() {
  useFrame((_, delta) => {
    const timeline = useTimelineStore.getState();
    if (!timeline.playing) return;

    const { durationMs } = usePlayStore.getState();
    let next = timeline.currentMs + Math.min(delta, 0.1) * 1000 * timeline.speed;

    if (next >= durationMs) {
      if (timeline.loop && durationMs > 0) {
        next %= durationMs;
      } else {
        next = durationMs;
        timeline.setPlaying(false);
      }
    }
    timeline.setCurrent(next);
  });

  return null;
}
