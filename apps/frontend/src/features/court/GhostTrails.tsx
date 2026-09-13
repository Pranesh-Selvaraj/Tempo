import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { ROLE_COLORS, interpolatePlayerStates } from '@tempo/shared-types';
import { useEditorStore } from '../../stores/editorStore';
import { usePlayStore } from '../../stores/playStore';
import { useTimelineStore } from '../../stores/timelineStore';

const TRAIL_WINDOW_MS = 2500;
const TRAIL_STEPS = 14;

/**
 * Fading footprints showing where each player has been over the last few
 * seconds — the fastest way to teach movement patterns.
 */
export function GhostTrails() {
  const keyframes = usePlayStore((state) => state.keyframes);
  const players = usePlayStore((state) => state.players);
  const currentMs = useTimelineStore((state) => state.currentMs);
  const showGhosts = useEditorStore((state) => state.showGhosts);

  const trails = useMemo(() => {
    if (!showGhosts || keyframes.length === 0) return [];
    const start = Math.max(0, currentMs - TRAIL_WINDOW_MS);
    return players.map((player) => {
      const points: [number, number, number][] = [];
      for (let step = 0; step <= TRAIL_STEPS; step += 1) {
        const time = start + ((currentMs - start) * step) / TRAIL_STEPS;
        const states = interpolatePlayerStates(keyframes, time, players);
        const state = states.find((item) => item.playerId === player.playerId);
        if (state) {
          points.push([state.position.x, 0.025, state.position.z]);
        }
      }
      return { playerId: player.playerId, color: ROLE_COLORS[player.role], points };
    });
  }, [keyframes, players, currentMs, showGhosts]);

  return (
    <>
      {trails.map((trail) =>
        trail.points.length >= 2 ? (
          <Line
            key={trail.playerId}
            points={trail.points}
            color={trail.color}
            lineWidth={3}
            transparent
            opacity={0.4}
            dashed
            dashSize={0.22}
            gapSize={0.12}
          />
        ) : null,
      )}
    </>
  );
}

/** Subtle vertical hint line for the selected player. */
export function SelectionBeacon() {
  const selectedPlayerId = useEditorStore((store) => store.selectedPlayerId);
  const players = usePlayStore((state) => state.players);
  const player = players.find((item) => item.playerId === selectedPlayerId);

  const points = useMemo<[number, number, number][]>(
    () =>
      player
        ? [
            [player.position.x, 0.05, player.position.z],
            [player.position.x, 2.4, player.position.z],
          ]
        : [],
    [player],
  );

  if (!player) return null;

  return <Line points={points} color="#38bdf8" lineWidth={1.5} transparent opacity={0.7} />;
}
