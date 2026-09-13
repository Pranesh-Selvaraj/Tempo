import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * ffmpeg.wasm needs SharedArrayBuffer. These headers are required on the
 * document origin AND on the API (the Express app sets them too).
 */
const coepHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Consume the shared package straight from TS source. The backend uses
      // the compiled CJS output; the browser gets fresh ESM with no rebuild.
      '@tempo/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@tempo/shared-types'],
  },
  server: {
    port: 5173,
    headers: coepHeaders,
  },
  preview: {
    port: 4173,
    headers: coepHeaders,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
});
