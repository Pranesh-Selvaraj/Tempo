import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { Pool } from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;
export type DriverKind = 'postgres' | 'pglite';

export interface DbHandle {
  db: Db;
  kind: DriverKind;
  close: () => Promise<void>;
}

const DEFAULT_URL = 'postgresql://postgres:password@localhost:5432/rotation_db';

/**
 * The app runs on PostgreSQL 16 (Docker Compose / production) or on an embedded
 * PGlite database for zero-dependency local development. Use a
 * `pglite://<dir>` DATABASE_URL to opt into the embedded engine.
 */
export function createDbHandle(url: string = process.env.DATABASE_URL ?? DEFAULT_URL): DbHandle {
  if (url.startsWith('pglite://')) {
    const dataDir = url.replace('pglite://', '') || './.pglite';
    const client = new PGlite(dataDir);
    const pgliteDb = drizzlePglite(client, { schema });
    return {
      // PGlite and node-postgres share the same query builder surface; we expose
      // one type so services do not have to fork on driver.
      db: pgliteDb as unknown as Db,
      kind: 'pglite',
      close: async () => {
        await client.close();
      },
    };
  }

  const pool = new Pool({ connectionString: url });
  const pgDb = drizzlePg(pool, { schema });
  return {
    db: pgDb,
    kind: 'postgres',
    close: async () => {
      await pool.end();
    },
  };
}

const handle = createDbHandle();

export const db = handle.db;
export const dbKind = handle.kind;
export const closeDb = handle.close;
