import { createHash, createHmac } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Request } from 'express';

const uploadsDir = path.resolve(__dirname, '../../uploads');

export function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '-');
  return (base.length > 0 ? base : `recording-${Date.now()}.mp4`).slice(0, 140);
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

function r2Config(): R2Config | null {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PUBLIC_URL,
  } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    publicUrl: (R2_PUBLIC_URL ?? `https://${R2_BUCKET}.r2.dev`).replace(/\/$/, ''),
  };
}

export function storageProvider(): 'local' | 'r2' {
  return r2Config() ? 'r2' : 'local';
}

export interface StoredFile {
  url: string;
  key: string;
  provider: 'local' | 'r2';
}

/** Stores a recording on local disk (MVP) or Cloudflare R2 when configured. */
export async function storeRecording(
  buffer: Buffer,
  filename: string,
  contentType: string,
  req: Request,
): Promise<StoredFile> {
  const config = r2Config();
  const key = `recordings/${filename}`;

  if (config) {
    await putR2Object(config, key, buffer, contentType);
    return { url: `${config.publicUrl}/${key}`, key, provider: 'r2' };
  }

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);
  const origin = process.env.PUBLIC_API_URL ?? `${req.protocol}://${req.get('host') ?? 'localhost:4000'}`;
  return { url: `${origin.replace(/\/$/, '')}/uploads/${filename}`, key: filename, provider: 'local' };
}

// ── Minimal S3-compatible (R2) PUT with AWS Signature V4 ────────────────────

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function signingKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, dateStamp), region), service), 'aws4_request');
}

async function putR2Object(
  config: R2Config,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const url = `https://${host}/${config.bucket}/${key}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    '',
  ].join('\n');
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    `/${config.bucket}/${key}`,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = hmac(signingKey(config.secretAccessKey, dateStamp, 'auto', 's3'), stringToSign).toString('hex');

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed (${response.status}): ${await response.text()}`);
  }
}
