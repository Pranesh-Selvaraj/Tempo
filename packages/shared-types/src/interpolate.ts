import type { CameraKeyframe } from './camera';
import type { BallState, Keyframe, PlayerState } from './keyframe';
import { lerpAngleDeg, lerp, applyEasing } from './math';
import { lerpTuple, lerpVec3, type Vec3 } from './geometry';
import type { Trajectory } from './trajectory';

function playerMap(states: PlayerState[]): Map<string, PlayerState> {
  return new Map(states.map((state) => [state.playerId, state]));
}

/**
 * Pure interpolation of a play at a given time. Playback state must always be a
 * deterministic function of (keyframes, currentMs) so recordings and share links
 * are reproducible.
 */
export function interpolatePlayerStates(
  keyframes: Keyframe[],
  currentMs: number,
  fallback: PlayerState[],
): PlayerState[] {
  if (keyframes.length === 0) return fallback;

  const sorted = [...keyframes].sort((a, b) => a.timestampMs - b.timestampMs);
  const before = [...sorted].reverse().find((k) => k.timestampMs <= currentMs);
  const after = sorted.find((k) => k.timestampMs > currentMs);

  if (!before) return sorted[0]!.playerStates;
  if (!after) return before.playerStates;

  const span = after.timestampMs - before.timestampMs;
  const raw = span <= 0 ? 0 : (currentMs - before.timestampMs) / span;
  const t = raw * raw * (3 - 2 * raw);
  const beforeMap = playerMap(before.playerStates);
  const afterMap = playerMap(after.playerStates);

  const result: PlayerState[] = [];
  for (const [playerId, state] of beforeMap) {
    const next = afterMap.get(playerId);
    if (!next) {
      result.push(state);
      continue;
    }
    result.push({
      ...state,
      position: lerpVec3(state.position, next.position, t),
      rotationY: lerpAngleDeg(state.rotationY, next.rotationY, t),
      animationTime: lerp(state.animationTime, next.animationTime, t),
      pose: state.pose,
    });
  }
  return result.length > 0 ? result : before.playerStates;
}

export function interpolateBallState(keyframes: Keyframe[], currentMs: number): BallState | null {
  const withBall = keyframes
    .filter((k): k is Keyframe & { ballState: BallState } => k.ballState !== null)
    .sort((a, b) => a.timestampMs - b.timestampMs);
  if (withBall.length === 0) return null;

  const before = [...withBall].reverse().find((k) => k.timestampMs <= currentMs);
  const after = withBall.find((k) => k.timestampMs > currentMs);
  if (!before) return withBall[0]!.ballState;
  if (!after) return before.ballState;

  const span = after.timestampMs - before.timestampMs;
  const t = span <= 0 ? 0 : (currentMs - before.timestampMs) / span;
  return lerpVec3(before.ballState, after.ballState, t);
}

export interface CameraSample {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export function interpolateCameraPath(
  keyframes: CameraKeyframe[],
  currentMs: number,
): CameraSample | null {
  if (keyframes.length === 0) return null;
  const sorted = [...keyframes].sort((a, b) => a.timestampMs - b.timestampMs);
  const before = [...sorted].reverse().find((k) => k.timestampMs <= currentMs);
  const after = sorted.find((k) => k.timestampMs > currentMs);
  if (!before) {
    const first = sorted[0]!;
    return { position: first.position, target: first.target, fov: first.fov };
  }
  if (!after) {
    return { position: before.position, target: before.target, fov: before.fov };
  }

  const span = after.timestampMs - before.timestampMs;
  const raw = span <= 0 ? 0 : (currentMs - before.timestampMs) / span;
  const t = applyEasing(before.easing, raw);
  return {
    position: lerpTuple(before.position, after.position, t),
    target: lerpTuple(before.target, after.target, t),
    fov: lerp(before.fov, after.fov, t),
  };
}

export function trajectoryEndMs(trajectory: Pick<Trajectory, 'startMs' | 'durationMs'>): number {
  return trajectory.startMs + trajectory.durationMs;
}

/** Progress (0..1) of a trajectory at a point in time, or null when inactive. */
export function trajectoryProgress(
  trajectory: Pick<Trajectory, 'startMs' | 'durationMs'>,
  currentMs: number,
): number | null {
  const end = trajectoryEndMs(trajectory);
  if (currentMs < trajectory.startMs || currentMs > end) return null;
  const span = trajectory.durationMs;
  return span <= 0 ? 1 : (currentMs - trajectory.startMs) / span;
}

export function activeTrajectory(trajectories: Trajectory[], currentMs: number): Trajectory | null {
  const active = trajectories
    .filter((t) => trajectoryProgress(t, currentMs) !== null)
    .sort((a, b) => a.startMs - b.startMs);
  return active.length > 0 ? active[active.length - 1]! : null;
}

/** Nearest trajectory to the playhead — used to park the ball between actions. */
export function nearestTrajectory(trajectories: Trajectory[], currentMs: number): Trajectory | null {
  if (trajectories.length === 0) return null;
  let best = trajectories[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const trajectory of trajectories) {
    const end = trajectoryEndMs(trajectory);
    const distance =
      currentMs < trajectory.startMs
        ? trajectory.startMs - currentMs
        : currentMs > end
          ? currentMs - end
          : 0;
    if (distance < bestDistance) {
      best = trajectory;
      bestDistance = distance;
    }
  }
  return best;
}

/** Total duration of a play in ms, derived from its authored content. */
export function computePlayDuration(args: {
  keyframes: { timestampMs: number }[];
  trajectories: Pick<Trajectory, 'startMs' | 'durationMs'>[];
  phases: { startMs: number; endMs: number }[];
}): number {
  const candidates = [3000];
  for (const k of args.keyframes) candidates.push(k.timestampMs);
  for (const t of args.trajectories) candidates.push(t.startMs + t.durationMs);
  for (const p of args.phases) candidates.push(p.endMs);
  return Math.max(...candidates) + 1000;
}

export function roundVec3To(v: Vec3, decimals = 3): Vec3 {
  const f = 10 ** decimals;
  return { x: Math.round(v.x * f) / f, y: Math.round(v.y * f) / f, z: Math.round(v.z * f) / f };
}
