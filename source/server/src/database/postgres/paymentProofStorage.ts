import { randomUUID } from 'node:crypto';

const bucket = 'payment-proofs';
const maxDecodedBytes = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

export interface StoredPaymentProof {
  id: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadServerPaymentProof(input: {
  businessId: string;
  appointmentId: string;
  dataUrl: string;
}): Promise<StoredPaymentProof> {
  const parsed = parseDataUrl(input.dataUrl);
  const proofId = randomUUID();
  const extension = extensionForMime(parsed.mimeType);
  const path = `${input.businessId}/${input.appointmentId}/${proofId}.${extension}`;
  const secret = requiredEnv('SUPABASE_SECRET_KEY');
  const response = await fetch(`${supabaseUrl()}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': parsed.mimeType,
      'x-upsert': 'false',
      'cache-control': 'private, max-age=0, no-store'
    },
    body: Uint8Array.from(parsed.bytes)
  });
  if (!response.ok) throw await storageError(response, 'Não foi possível guardar o comprovante.');
  return { id: proofId, path, mimeType: parsed.mimeType, sizeBytes: parsed.bytes.byteLength };
}

export async function removeServerPaymentProof(path: string): Promise<void> {
  const secret = requiredEnv('SUPABASE_SECRET_KEY');
  const response = await fetch(`${supabaseUrl()}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefixes: [path] })
  });
  if (!response.ok) throw await storageError(response, 'Não foi possível remover o comprovante.');
}

export async function createServerPaymentProofSignedUrl(
  path: string,
  expiresIn = 300
): Promise<string> {
  const secret = requiredEnv('SUPABASE_SECRET_KEY');
  const response = await fetch(`${supabaseUrl()}/storage/v1/object/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiresIn })
  });
  const payload = await safeResponseJson(response);
  if (!response.ok) throw storagePayloadError(payload, response.status, 'Não foi possível abrir o comprovante.');
  const record = payload && typeof payload === 'object'
    ? payload as { signedURL?: string; signedUrl?: string }
    : {};
  const signed = record.signedURL ?? record.signedUrl;
  if (!signed) throw new Error('O Storage não retornou uma URL temporária para o comprovante.');
  return signed.startsWith('http') ? signed : `${supabaseUrl()}${signed}`;
}

function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Buffer } {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw Object.assign(new Error('Comprovante inválido.'), { status: 400 });
  const mimeType = match[1].toLowerCase();
  if (!allowedMimeTypes.has(mimeType)) {
    throw Object.assign(new Error('Envie o comprovante em JPG, PNG, WebP ou PDF.'), { status: 400 });
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.byteLength > maxDecodedBytes) {
    throw Object.assign(new Error('O comprovante precisa ter no máximo 5 MB.'), { status: 413 });
  }
  return { mimeType, bytes };
}

function extensionForMime(mimeType: string): string {
  return ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf'
  } as Record<string, string>)[mimeType] ?? 'bin';
}

async function storageError(response: Response, fallback: string): Promise<Error & { status: number }> {
  return storagePayloadError(await safeResponseJson(response), response.status, fallback);
}

function storagePayloadError(
  payload: unknown,
  status: number,
  fallback: string
): Error & { status: number } {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  return Object.assign(
    new Error(String(record.message ?? record.error ?? fallback)),
    { status }
  );
}

async function safeResponseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function supabaseUrl(): string {
  return requiredEnv('SUPABASE_URL').replace(/\/$/, '');
}

function requiredEnv(name: string): string {
  const value = (process.env[name] ?? '').trim();
  if (!value) throw new Error(`${name} não configurado para o ambiente Supabase.`);
  return value;
}
