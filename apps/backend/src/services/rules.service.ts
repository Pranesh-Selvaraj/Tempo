import { asc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { Db } from '../db';
import { rules } from '../db/schema';

export async function listRules(db: Db, category?: string) {
  const query = db.select().from(rules);
  const rows = category
    ? await query.where(eq(rules.category, category)).orderBy(asc(rules.orderIndex))
    : await query.orderBy(asc(rules.category), asc(rules.orderIndex));
  return rows;
}

export async function searchRules(db: Db, term: string) {
  const pattern = `%${term}%`;
  const condition: SQL | undefined = or(ilike(rules.title, pattern), ilike(rules.content, pattern));
  return db
    .select()
    .from(rules)
    .where(condition)
    .orderBy(asc(rules.category), asc(rules.orderIndex))
    .limit(50);
}
