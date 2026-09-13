import 'dotenv/config';
import path from 'node:path';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { createDbHandle } from './index';
import * as schema from './schema';

async function main(): Promise<void> {
  const handle = createDbHandle();
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  if (handle.kind === 'pglite') {
    await migratePglite(handle.db as unknown as PgliteDatabase<typeof schema>, { migrationsFolder });
  } else {
    await migratePg(handle.db as unknown as NodePgDatabase<typeof schema>, { migrationsFolder });
  }
  console.log(`[db] migrations applied (${handle.kind})`);
  await handle.close();
}

main().catch((error: unknown) => {
  console.error('[db] migration failed', error);
  process.exit(1);
});
