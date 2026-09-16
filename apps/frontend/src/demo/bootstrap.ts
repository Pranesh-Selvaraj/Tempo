import { DEMO_TOKEN } from '../lib/mode';
import { useAuthStore } from '../stores/authStore';
import { DEMO_USER_ID, clearDemoDb, readDb, writeDb } from './db';
import { createSeedDb } from './seed';

/** Seed the browser database on first load (or after a version reset). */
export function ensureDemoDb(): void {
  if (!readDb()) writeDb(createSeedDb());
}

/**
 * Demo mode is single-user: make sure the demo coach exists and sign them in
 * so the library, editor and quick-play routes render without a login step.
 * Real logins still work against the local user table if someone signs out.
 */
export function bootstrapDemo(): void {
  ensureDemoDb();
  const db = readDb();
  const user = db?.users.find((row) => row.id === DEMO_USER_ID) ?? db?.users[0];
  const auth = useAuthStore.getState();
  if (!auth.token && user) {
    auth.setAuth(DEMO_TOKEN, {
      id: user.id,
      email: user.email,
      name: user.name,
      teamName: user.teamName,
      createdAt: new Date(user.createdAt),
    });
  }
}

/** Wipe local data and restore the seeded library. Caller reloads the page. */
export function resetDemoData(): void {
  clearDemoDb();
  writeDb(createSeedDb());
}
