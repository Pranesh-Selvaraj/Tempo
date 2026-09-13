import { z } from 'zod';

export const RuleSchema = z.object({
  id: z.string().uuid(),
  category: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  diagramUrl: z.string().nullable(),
  orderIndex: z.number().int(),
});
export type Rule = z.infer<typeof RuleSchema>;

export const RULE_CATEGORIES = [
  'Scoring',
  'Positions & Rotations',
  'Faults',
  'Contact Rules',
  'Net Rules',
  'Serve Rules',
  'Libero Rules',
] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];
