/**
 * Build-time switch between the full-stack app and the static, backend-less demo.
 *
 *   VITE_DEMO_MODE=1 pnpm --filter @tempo/frontend build
 *
 * When enabled the SPA never talks to an API: all reads/writes go through the
 * localStorage database in `src/demo`, and the user is auto-signed-in.
 * The full version is untouched when the flag is off.
 */
export const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === '1' || import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_STORAGE_KEY = 'tempo.demo.db.v1';
export const DEMO_TOKEN = 'demo-mode-token';
