import 'dotenv/config';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './context';
import { appRouter } from './routers/_app';
import { uploadRouter } from './routes/upload.route';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const allowedOrigins = [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:4173'];

/**
 * ffmpeg.wasm requires SharedArrayBuffer, which requires these headers on the
 * document that loads it (the Vite server sets them too — see vite.config.ts).
 */
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '25mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'tempo-api', date: new Date().toISOString() });
});

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/api/upload', uploadRouter);

app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api] unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[api] Tempo API listening on http://localhost:${PORT}`);
  console.log(`[api] tRPC endpoint: http://localhost:${PORT}/api/trpc`);
});
