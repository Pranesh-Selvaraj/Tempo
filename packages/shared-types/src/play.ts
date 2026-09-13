import { z } from 'zod';
import { FormationSchema } from './formation';

export const PLAY_CATEGORIES = [
  'serve_receive',
  'attack',
  'defense',
  'transition',
  'block',
  'serve',
] as const;
export type PlayCategory = (typeof PLAY_CATEGORIES)[number];
export const PlayCategorySchema = z.enum(PLAY_CATEGORIES);

export const PLAY_CATEGORY_LABELS: Record<PlayCategory, string> = {
  serve_receive: 'Serve Receive',
  attack: 'Attack',
  defense: 'Defense',
  transition: 'Transition',
  block: 'Block',
  serve: 'Serve',
};

export const COURT_TYPES = ['indoor', 'beach'] as const;
export type CourtType = (typeof COURT_TYPES)[number];
export const CourtTypeSchema = z.enum(COURT_TYPES);

export const PlaySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(120),
  category: PlayCategorySchema,
  rotation: z.number().int().min(1).max(6),
  formation: FormationSchema,
  libero: z.boolean(),
  courtType: CourtTypeSchema,
  netHeight: z.number().min(1).max(3),
  description: z.string().nullable(),
  coachingNotes: z.string().nullable(),
  isPublic: z.boolean(),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Play = z.infer<typeof PlaySchema>;

export const PlayCreateInputSchema = z.object({
  name: z.string().min(1).max(120),
  category: PlayCategorySchema.default('serve_receive'),
  rotation: z.number().int().min(1).max(6).default(1),
  formation: FormationSchema.default('5-1'),
  libero: z.boolean().default(true),
  courtType: CourtTypeSchema.default('indoor'),
  netHeight: z.number().min(1).max(3).default(2.43),
  description: z.string().max(2000).nullish(),
  coachingNotes: z.string().max(5000).nullish(),
  isPublic: z.boolean().default(false),
});
export type PlayCreateInput = z.infer<typeof PlayCreateInputSchema>;

export const PlayUpdateInputSchema = PlayCreateInputSchema.partial().extend({
  id: z.string().uuid(),
  thumbnailUrl: z.string().nullish(),
});
export type PlayUpdateInput = z.infer<typeof PlayUpdateInputSchema>;

export const PlayListInputSchema = z
  .object({
    category: PlayCategorySchema.optional(),
    rotation: z.number().int().min(1).max(6).optional(),
  })
  .default({});
export type PlayListInput = z.infer<typeof PlayListInputSchema>;

export const PlayIdInputSchema = z.object({ id: z.string().uuid() });
