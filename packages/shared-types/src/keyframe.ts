import { z } from 'zod';
import { PoseSchema, PlayerRoleSchema } from './court';
import { Vec3Schema, Vec3TupleSchema } from './geometry';

export const PlayerStateSchema = z.object({
  playerId: z.string().min(1),
  role: PlayerRoleSchema,
  position: Vec3Schema,
  rotationY: z.number(),
  pose: PoseSchema.default('idle'),
  animationTime: z.number().min(0).default(0),
});
export type PlayerState = z.infer<typeof PlayerStateSchema>;

export const BallStateSchema = Vec3Schema;
export type BallState = z.infer<typeof BallStateSchema>;

export const CameraStateSchema = z.object({
  position: Vec3TupleSchema,
  target: Vec3TupleSchema,
  fov: z.number().min(1).max(179),
});
export type CameraState = z.infer<typeof CameraStateSchema>;

export const KeyframeSchema = z.object({
  id: z.string().uuid(),
  playId: z.string().uuid(),
  timestampMs: z.number().int().min(0),
  playerStates: z.array(PlayerStateSchema),
  ballState: BallStateSchema.nullable(),
  cameraState: CameraStateSchema.nullable(),
  createdAt: z.date(),
});
export type Keyframe = z.infer<typeof KeyframeSchema>;

export const KeyframeUpsertInputSchema = z.object({
  playId: z.string().uuid(),
  timestampMs: z.number().int().min(0),
  playerStates: z.array(PlayerStateSchema).min(1),
  ballState: BallStateSchema.nullish(),
  cameraState: CameraStateSchema.nullish(),
});
export type KeyframeUpsertInput = z.infer<typeof KeyframeUpsertInputSchema>;
