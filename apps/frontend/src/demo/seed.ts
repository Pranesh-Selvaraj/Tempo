import { SEED_RULES } from '@tempo/shared-types';
import { newId, type DemoDb } from './db';

/**
 * A clean workspace for the private preview: no plays, no accounts, no
 * recordings — just the built-in rules reference. Users start from zero.
 */
export function createSeedDb(): DemoDb {
  return {
    version: 2,
    users: [],
    plays: [],
    keyframes: [],
    trajectories: [],
    cameraPaths: [],
    phases: [],
    annotations: [],
    recordings: [],
    rules: SEED_RULES.map((rule) => ({
      id: newId(),
      category: rule.category,
      title: rule.title,
      content: rule.content,
      diagramUrl: rule.diagramUrl ?? null,
      orderIndex: rule.orderIndex,
    })),
  };
}
