import { clearDemoDb, readDb, writeDb } from './db';
import { createSeedDb } from './seed';

/** Seed the browser database on first load (or after a version reset). */
export function ensureDemoDb(): void {
  if (!readDb()) writeDb(createSeedDb());
}

/**
 * Prepare the local database before React mounts. Access is handled by the
 * master gate; there are no accounts in the static preview.
 */
export function bootstrapDemo(): void {
  ensureDemoDb();
}

/** Wipe local data and restore a clean workspace. Caller reloads the page. */
export function resetDemoData(): void {
  clearDemoDb();
  writeDb(createSeedDb());
}
