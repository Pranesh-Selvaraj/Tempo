import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string;
}

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    // TODO: fail fast when a real secret is missing outside development.
    return 'tempo-dev-secret-do-not-use-in-production';
  }
  return secret;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies TokenPayload, jwtSecret(), { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, jwtSecret());
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session token' });
  }
  return { sub: decoded.sub };
}

export function bearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
