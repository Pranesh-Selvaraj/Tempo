import { z } from 'zod';
import { Vec3Schema } from './geometry';

export const AnnotationSchema = z.object({
  id: z.string().uuid(),
  playId: z.string().uuid(),
  text: z.string().min(1),
  position: Vec3Schema,
  visibleFromMs: z.number().int().min(0).nullable(),
  visibleToMs: z.number().int().min(0).nullable(),
  color: z.string(),
});
export type Annotation = z.infer<typeof AnnotationSchema>;

export const ANNOTATION_COLORS = ['#ffffff', '#facc15', '#4ade80', '#f87171', '#60a5fa', '#c084fc'];
