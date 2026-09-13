import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { db, type Db } from './db';
import { bearerToken, verifyToken } from './middleware/auth';

export interface Context {
  db: Db;
  userId: string | null;
}

export async function createContext({ req }: CreateExpressContextOptions): Promise<Context> {
  let userId: string | null = null;
  const token = bearerToken(req.headers.authorization);
  if (token) {
    try {
      userId = verifyToken(token).sub;
    } catch {
      userId = null;
    }
  }
  return { db, userId };
}
