import { randomUUID } from 'node:crypto';
import type { AuthContext } from '../../modules/auth/auth.types.js';
import { requireProductionAccessToken, userSupabaseRest } from './restClient.js';

const assetBucket = 'business-assets';
const maxDecodedBytes = 5 * 1024 * 1024;

export interface StoredAsset {
  id: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadDataUrlAsset(
  auth: AuthContext,
  dataUrl: string,
  folder: string
): Promise<StoredAsset> {
  const token = requireProductionAccessToken(auth.accessToken);
  const parsed = parseDataUrl(dataUrl);
  const extension = extensionForMime(parsed.mimeType);
  const assetId = randomUUID();
  const path = `${auth.businessId}/public/${folder}/${assetId}.${extension}`;

  await storageFetch(auth.accessToken, `/storage/v1/object/${assetBucket}/${path}`, {
    method: 'POST',
    body: parsed.bytes,
    contentType: parsed.mimeType
  });

  try {
    const rows = await userSupabaseRest<Array<{ id: string }>>(
      token,
      '/rest/v1/file_assets',
      {
        method: 'POST',
        prefer: 'return=representation',
        body: {
          id: assetId,
          business_id: auth.businessId,
          storage_bucket: assetBucket,
          storage_path: path,
          original_name: `${folder}.${extension}`,
          mime_type: parsed.mimeType,
          size_bytes: parsed.bytes.byteLength,
          uploaded_by: auth.userId
        }
      }
    );
    if (!rows[0]?.id) throw new Error('Metadados da mídia não foram salvos.');
  } catch (error) {
    await removeStorageObject(auth.accessToken, path).catch(() => undefined);
    throw error;
  }

  return {
    id: assetId,
    path,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.bytes.byteLength
  };
}

export async function createServerSignedAssetUrl(
  path: string,
  expiresIn = 3600
): Promise<string> {
  const secretKey = requiredEnv('SUPABASE_SECRET_KEY');
  return createSignedAssetUrlWithToken(secretKey, secretKey, path, expiresIn);
}

export async function createSignedAssetUrl(
  accessToken: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const publishableKey = requiredEnv('SUPABASE_PUBLISHABLE_KEY');
  return createSignedAssetUrlWithToken(publishableKey, accessToken, path, expiresIn);
}

async function createSignedAssetUrlWithToken(
  apiKey: string,
  accessToken: string,
  path: string,
  expiresIn: number
): Promise<string> {
  const response = await fetch(`${supabaseUrl()}/storage/v1/object/sign/${assetBucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiresIn })
  });
  const text = await response.text();
  const payload = text ? safeJson(text) : null;
  if (!response.ok) {
    const record = payload && typeof payload === 'object'
      ? payload as Record<string, unknown>
      : {};
    throw Object.assign(
      new Error(String(record.message ?? record.error ?? 'Falha ao assinar mídia pública.')),
      { status: response.status }
    );
  }
  const record = payload && typeof payload === 'object'
    ? payload as { signedURL?: string; signedUrl?: string }
    : {};
  const signed = record.signedURL ?? record.signedUrl;
  if (!signed) throw new Error('O Storage não retornou uma URL assinada.');
  return signed.startsWith('http') ? signed : `${supabaseUrl()}${signed}`;
}

export async function deleteStoredAsset(
  auth: AuthContext,
  asset: { id: string; path: string }
): Promise<void> {
  const token = requireProductionAccessToken(auth.accessToken);
  await removeStorageObject(auth.accessToken, asset.path);
  await userSupabaseRest<null>(token, '/rest/v1/file_assets', {
    method: 'DELETE',
    query: {
      id: `eq.${asset.id}`,
      business_id: `eq.${auth.businessId}`
    }
  });
}

async function removeStorageObject(
  accessToken: string | undefined,
  path: string
): Promise<void> {
  await storageFetch(accessToken, `/storage/v1/object/${assetBucket}`, {
    method: 'DELETE',
    json: { prefixes: [path] }
  });
}

async function storageFetch<T = unknown>(
  accessToken: string | undefined,
  path: string,
  options: {
    method: 'POST' | 'DELETE';
    body?: Buffer;
    json?: unknown;
    contentType?: string;
  }
): Promise<T> {
  const token = requireProductionAccessToken(accessToken);
  const publishableKey = requiredEnv('SUPABASE_PUBLISHABLE_KEY');
  const response = await fetch(`${supabaseUrl()}${path}`, {
    method: options.method,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
      ...(options.contentType ? { 'Content-Type': options.contentType } : {}),
      ...(options.body ? { 'x-upsert': 'false', 'cache-control': '3600' } : {}),
      ...(options.json !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(options.body ? { body: Uint8Array.from(options.body) } : {}),
    ...(options.json !== undefined ? { body: JSON.stringify(options.json) } : {})
  });
  const text = await response.text();
  const payload = text ? safeJson(text) : null;
  if (!response.ok) {
    const record = payload && typeof payload === 'object'
      ? payload as Record<string, unknown>
      : {};
    throw Object.assign(
      new Error(String(record.message ?? record.error ?? 'Falha no Storage.')),
      { status: response.status }
    );
  }
  return payload as T;
}

function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Buffer } {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw Object.assign(new Error('Arquivo de mídia inválido.'), { status: 400 });
  const mimeType = match[1].toLowerCase();
  if (!allowedMimeTypes.has(mimeType)) {
    throw Object.assign(new Error('Formato de mídia não permitido.'), { status: 400 });
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.byteLength > maxDecodedBytes) {
    throw Object.assign(new Error('A mídia precisa ter no máximo 5 MB.'), { status: 413 });
  }
  return { mimeType, bytes };
}

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm'
]);

function extensionForMime(mimeType: string): string {
  return ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm'
  } as Record<string, string>)[mimeType] ?? 'bin';
}

function supabaseUrl(): string {
  return requiredEnv('SUPABASE_URL').replace(/\/$/, '');
}

function requiredEnv(name: string): string {
  const value = (process.env[name] ?? '').trim();
  if (!value) throw new Error(`${name} não configurado para o ambiente Supabase.`);
  return value;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
