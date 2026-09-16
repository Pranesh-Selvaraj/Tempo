import { DEMO_MODE } from './mode';

const DEFAULT_USER = 'master';
const DEFAULT_PASSWORD = 'tempo-preview';

function env(key: string): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

export const MASTER_USER = env('VITE_MASTER_USER') || DEFAULT_USER;
const PLAIN_PASSWORD = env('VITE_MASTER_PASSWORD');
const PASSWORD_HASH = env('VITE_MASTER_PASSWORD_SHA256').toLowerCase();

export const USING_DEFAULT_MASTER_PASSWORD = !PLAIN_PASSWORD && !PASSWORD_HASH;

if (DEMO_MODE && USING_DEFAULT_MASTER_PASSWORD && import.meta.env.DEV) {
  console.warn(
    `[tempo] Using the default master credentials (${DEFAULT_USER} / ${DEFAULT_PASSWORD}). ` +
      'Set VITE_MASTER_USER and VITE_MASTER_PASSWORD_SHA256 before deploying.',
  );
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function equalHex(a: string, b: string): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

/**
 * Client-side gate for the static preview. This is access control for a
 * private link, not real security: a static bundle can always be inspected.
 * Keep the password strong and change it before sharing the URL.
 */
export async function verifyMasterCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  if (username.trim().toLowerCase() !== MASTER_USER.toLowerCase()) return false;
  if (PASSWORD_HASH) return equalHex(await sha256Hex(password), PASSWORD_HASH);
  return password === (PLAIN_PASSWORD || DEFAULT_PASSWORD);
}
