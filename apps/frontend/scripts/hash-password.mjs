#!/usr/bin/env node
/**
 * Prints the SHA-256 hex hash for a master password so it can be set as
 * VITE_MASTER_PASSWORD_SHA256 without storing the plaintext.
 *
 *   pnpm --filter @tempo/frontend hash-password "my strong password"
 */
import { createHash } from 'node:crypto';

const password = process.argv.slice(2).join(' ');
if (!password) {
  console.error('Usage: pnpm --filter @tempo/frontend hash-password <password>');
  process.exit(1);
}
console.log(createHash('sha256').update(password).digest('hex'));
