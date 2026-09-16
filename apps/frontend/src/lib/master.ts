import { DEMO_MODE } from './mode';

const DEFAULT_USER = 'master';
const DEFAULT_PASSWORD = 'tempo-preview';

function env(key: string): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

export const MASTER_USER = env('VITE_MASTER_USER') || DEFAULT_USER;
const MASTER_PASSWORD = env('VITE_MASTER_PASSWORD');

export const USING_DEFAULT_MASTER_PASSWORD = !MASTER_PASSWORD;

if (DEMO_MODE && USING_DEFAULT_MASTER_PASSWORD && import.meta.env.DEV) {
  console.warn(
    `[tempo] Using the default master credentials (${DEFAULT_USER} / ${DEFAULT_PASSWORD}). ` +
      'Set VITE_MASTER_USER and VITE_MASTER_PASSWORD before deploying.',
  );
}

/**
 * Client-side gate for the static preview. This is access control for a
 * private link, not real security: a static bundle can always be inspected.
 * Keep the password strong and change it before sharing the URL.
 */
export function verifyMasterCredentials(username: string, password: string): boolean {
  if (username.trim().toLowerCase() !== MASTER_USER.toLowerCase()) return false;
  return password === (MASTER_PASSWORD || DEFAULT_PASSWORD);
}
