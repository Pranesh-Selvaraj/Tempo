import {
  activeTrajectory,
  clamp,
  interpolateBallState,
  nearestTrajectory,
  trajectoryProgress,
  type Vec3,
} from '@tempo/shared-types';
import { curveFor } from './curves';
import type { Keyframe, Trajectory } from './trpc';

/**
 * Deterministic ball position at a moment in time: active authored trajectory
 * first, then keyframed ball state, then parked at the nearest trajectory end.
 */
export function ballPositionAt(
  trajectories: Trajectory[],
  keyframes: Keyframe[],
  currentMs: number,
): Vec3 | null {
  const visible = trajectories.filter((trajectory) => trajectory.visible);

  const active = activeTrajectory(visible, currentMs);
  if (active) {
    const curve = curveFor(active.controlPoints);
    const point = curve.getPointAt(clamp(trajectoryProgress(active, currentMs) ?? 0, 0, 1));
    return { x: point.x, y: point.y, z: point.z };
  }

  const keyframeBall = interpolateBallState(keyframes, currentMs);
  if (keyframeBall) return keyframeBall;

  const nearest = nearestTrajectory(visible, currentMs);
  if (nearest) {
    const curve = curveFor(nearest.controlPoints);
    const point = curve.getPointAt(currentMs < nearest.startMs ? 0 : 1);
    return { x: point.x, y: point.y, z: point.z };
  }

  return null;
}
