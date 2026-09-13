import { z } from 'zod';

export const TRAJECTORY_TYPES = ['serve', 'pass', 'set', 'attack', 'block', 'dig'] as const;
export type TrajectoryType = (typeof TRAJECTORY_TYPES)[number];
export const TrajectoryTypeSchema = z.enum(TRAJECTORY_TYPES);

export const TRAJECTORY_LABELS: Record<TrajectoryType, string> = {
  serve: 'Serve',
  pass: 'Pass',
  set: 'Set',
  attack: 'Attack',
  block: 'Block',
  dig: 'Dig',
};

export const TRAJECTORY_COLORS: Record<TrajectoryType, string> = {
  serve: '#f59e0b',
  pass: '#3b82f6',
  set: '#22c55e',
  attack: '#ef4444',
  block: '#a855f7',
  dig: '#14b8a6',
};

/** Sensible default flight times (ms) per action type when authoring a new trajectory. */
export const DEFAULT_TRAJECTORY_DURATION_MS: Record<TrajectoryType, number> = {
  serve: 1100,
  pass: 1200,
  set: 900,
  attack: 700,
  block: 450,
  dig: 1000,
};

export const TrajectorySchema = z.object({
  id: z.string().uuid(),
  playId: z.string().uuid(),
  type: TrajectoryTypeSchema,
  controlPoints: z.array(z.object({ x: z.number(), y: z.number(), z: z.number() })).min(2),
  startMs: z.number().int().min(0),
  durationMs: z.number().int().min(1),
  color: z.string().nullable(),
  visible: z.boolean(),
});
export type Trajectory = z.infer<typeof TrajectorySchema>;
