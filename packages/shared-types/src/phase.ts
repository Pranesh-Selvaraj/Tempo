import { z } from 'zod';

export const PhaseSchema = z.object({
  id: z.string().uuid(),
  playId: z.string().uuid(),
  name: z.string().min(1),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  coachingNote: z.string().nullable(),
});
export type Phase = z.infer<typeof PhaseSchema>;

export const PHASE_COLORS = ['#38bdf8', '#f59e0b', '#22c55e', '#ef4444', '#a855f7', '#14b8a6'];

export function phaseColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PHASE_COLORS[Math.abs(hash) % PHASE_COLORS.length]!;
}
