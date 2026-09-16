import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { SEED_RULES } from '@tempo/shared-types';
import { createDbHandle } from './index';
import { rules } from './schema';

async function main(): Promise<void> {
  const handle = createDbHandle();
  const existing = await handle.db.select().from(rules);
  const byTitle = new Map(existing.map((rule) => [`${rule.category}::${rule.title}`, rule]));

  let inserted = 0;
  let updated = 0;
  for (const rule of SEED_RULES) {
    const found = byTitle.get(`${rule.category}::${rule.title}`);
    if (found) {
      await handle.db
        .update(rules)
        .set({ content: rule.content, orderIndex: rule.orderIndex, diagramUrl: rule.diagramUrl ?? null })
        .where(eq(rules.id, found.id));
      updated += 1;
    } else {
      await handle.db.insert(rules).values({ ...rule, diagramUrl: rule.diagramUrl ?? null });
      inserted += 1;
    }
  }

  console.log(`[db] rules seeded: ${inserted} inserted, ${updated} updated (${SEED_RULES.length} total)`);
  await handle.close();
}

main().catch((error: unknown) => {
  console.error('[db] seed failed', error);
  process.exit(1);
});
