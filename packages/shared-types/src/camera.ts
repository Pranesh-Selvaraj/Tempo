import { z } from 'zod';
import { EASINGS } from './math';
import { Vec3TupleSchema } from './geometry';

export const EasingSchema = z.enum(EASINGS);

export const CameraKeyframeSchema = z.object({
  timestampMs: z.number().int().min(0),
  position: Vec3TupleSchema,
  target: Vec3TupleSchema,
  fov: z.number().min(1).max(179),
  easing: EasingSchema.default('easeInOut'),
});
export type CameraKeyframe = z.infer<typeof CameraKeyframeSchema>;

export const CameraPathSchema = z.object({
  id: z.string().uuid(),
  playId: z.string().uuid(),
  name: z.string().min(1),
  keyframes: z.array(CameraKeyframeSchema),
  isDefault: z.boolean(),
});
export type CameraPath = z.infer<typeof CameraPathSchema>;

/** Static (non-animated) camera presets available from the view dropdown. */
export const CAMERA_PRESETS = ['coach', 'top', 'attacker', 'setter', 'sideline'] as const;
export type CameraPresetId = (typeof CAMERA_PRESETS)[number];

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const CAMERA_PRESETS_MAP: Record<CameraPresetId, CameraPreset> = {
  coach: {
    id: 'coach',
    label: 'Coaching View',
    position: [12, 8, 12],
    target: [0, 1.5, 0],
    fov: 50,
  },
  top: {
    id: 'top',
    label: 'Top Down',
    position: [0.01, 22, 0.01],
    target: [0, 0, 0],
    fov: 40,
  },
  attacker: {
    id: 'attacker',
    label: 'Attacker POV',
    position: [7.2, 2.1, 2.6],
    target: [-1, 1.6, -0.4],
    fov: 60,
  },
  setter: {
    id: 'setter',
    label: 'Setter POV',
    position: [2.8, 2.0, -1.2],
    target: [-2, 1.2, 1.5],
    fov: 65,
  },
  sideline: {
    id: 'sideline',
    label: 'Sideline',
    position: [0, 6, 15],
    target: [0, 1.2, 0],
    fov: 40,
  },
};
