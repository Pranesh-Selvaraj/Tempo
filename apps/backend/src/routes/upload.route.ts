import { Router, raw } from 'express';
import { TRPCError } from '@trpc/server';
import { bearerToken, verifyToken } from '../middleware/auth';
import { sanitizeFilename, storageProvider, storeRecording } from '../services/storage.service';

/**
 * Raw-body upload endpoint used by the browser after a render/recording
 * completes. No multipart parser needed: the body is the file itself.
 *
 *   POST /api/upload?filename=my-play.mp4
 *   Content-Type: video/mp4
 *   Authorization: Bearer <jwt>
 */
export const uploadRouter: Router = Router();

uploadRouter.get('/storage', (_req, res) => {
  res.json({ provider: storageProvider() });
});

uploadRouter.post(
  '/',
  raw({ type: () => true, limit: '2gb' }),
  async (req, res) => {
    try {
      const token = bearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({ error: 'Sign in to upload recordings' });
        return;
      }
      verifyToken(token);

      const body = req.body as unknown;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: 'Empty upload body' });
        return;
      }

      const filename = sanitizeFilename(String(req.query.filename ?? `recording-${Date.now()}.mp4`));
      const contentType = String(req.headers['content-type'] ?? 'application/octet-stream');
      const stored = await storeRecording(body, filename, contentType, req);
      res.json(stored);
    } catch (error) {
      if (error instanceof TRPCError) {
        res.status(401).json({ error: error.message });
        return;
      }
      console.error('[api] upload failed', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  },
);
