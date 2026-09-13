import { getStoredToken } from '../stores/authStore';
import { API_URL } from './trpc';

export interface UploadResult {
  url: string;
  key: string;
  provider: 'local' | 'r2';
}

/**
 * Uploads a rendered file to the backend, which stores it in `apps/backend/uploads`
 * or Cloudflare R2 when configured. Returns the public URL to share.
 */
export async function uploadRecordingFile(blob: Blob, filename: string): Promise<UploadResult> {
  const token = getStoredToken();
  if (!token) throw new Error('Sign in to upload recordings');

  const response = await fetch(`${API_URL}/api/upload?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: {
      'content-type': blob.type || 'application/octet-stream',
      authorization: `Bearer ${token}`,
    },
    body: blob,
  });

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }

  return (await response.json()) as UploadResult;
}
