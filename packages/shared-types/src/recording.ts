import { z } from 'zod';

export const RECORDING_FORMATS = ['webm', 'mp4', 'gif', 'glb'] as const;
export type RecordingFormat = (typeof RECORDING_FORMATS)[number];
export const RecordingFormatSchema = z.enum(RECORDING_FORMATS);

export const RECORDING_PRESETS = ['whatsapp', 'instagram', 'presentation', 'slowmo', 'gif', 'glb'] as const;
export type RecordingPresetId = (typeof RECORDING_PRESETS)[number];
export const RecordingPresetSchema = z.enum(RECORDING_PRESETS);

export const RecordingSchema = z.object({
  id: z.string().uuid(),
  playId: z.string().uuid(),
  userId: z.string().uuid(),
  format: RecordingFormatSchema,
  preset: RecordingPresetSchema,
  durationMs: z.number().int().min(0),
  fileSizeBytes: z.number().int().min(0),
  fileUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.date(),
});
export type Recording = z.infer<typeof RecordingSchema>;
