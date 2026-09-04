const managedBuckets = ['business-assets', 'payment-proofs'] as const;

interface StorageListEntry {
  id?: string | null;
  name?: string;
  metadata?: Record<string, unknown> | null;
}

export interface BusinessStorageCleanupResult {
  buckets: Record<string, { deletedObjects: number }>;
  totalDeletedObjects: number;
}

export async function deleteBusinessStorage(
  businessId: string
): Promise<BusinessStorageCleanupResult> {
  const buckets: Record<string, { deletedObjects: number }> = {};
  let totalDeletedObjects = 0;

  for (const bucket of managedBuckets) {
    const objectPaths = await listStorageObjectsRecursive(bucket, businessId);
    await deleteStorageObjects(bucket, objectPaths);
    buckets[bucket] = { deletedObjects: objectPaths.length };
    totalDeletedObjects += objectPaths.length;
  }

  return { buckets, totalDeletedObjects };
}

export async function checkPlatformStorageHealth(): Promise<{ latencyMs: number }> {
  const startedAt = performance.now();
  await listStoragePage('business-assets', '', 1, 0);
  return { latencyMs: Math.round(performance.now() - startedAt) };
}

async function listStorageObjectsRecursive(
  bucket: string,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  const queue = [prefix.replace(/^\/+|\/+$/g, '')];

  while (queue.length) {
    const currentPrefix = queue.shift()!;
    let offset = 0;
    const limit = 1000;

    while (true) {
      const entries = await listStoragePage(bucket, currentPrefix, limit, offset);
      if (!entries.length) break;

      for (const entry of entries) {
        const name = String(entry.name ?? '').trim();
        if (!name) continue;
        const fullPath = currentPrefix ? `${currentPrefix}/${name}` : name;
        // Supabase Storage represents folders in list results without a concrete object id.
        if (!entry.id && !entry.metadata) queue.push(fullPath);
        else paths.push(fullPath);
      }

      if (entries.length < limit) break;
      offset += limit;
    }
  }

  return paths;
}

async function listStoragePage(
  bucket: string,
  prefix: string,
  limit: number,
  offset: number
): Promise<StorageListEntry[]> {
  const secret = requiredEnv('SUPABASE_SECRET_KEY');
  const response = await fetch(`${supabaseUrl()}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: 'POST',
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prefix,
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' }
    })
  });
  if (!response.ok) throw await storageError(response, `Falha ao listar o bucket ${bucket}.`);
  const payload = await safeResponseJson(response);
  return Array.isArray(payload) ? payload as StorageListEntry[] : [];
}

async function deleteStorageObjects(bucket: string, paths: string[]): Promise<void> {
  if (!paths.length) return;
  const secret = requiredEnv('SUPABASE_SECRET_KEY');
  for (let index = 0; index < paths.length; index += 100) {
    const batch = paths.slice(index, index + 100);
    const response = await fetch(`${supabaseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}`, {
      method: 'DELETE',
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefixes: batch })
    });
    if (!response.ok) throw await storageError(response, `Falha ao limpar o bucket ${bucket}.`);
  }
}

async function storageError(response: Response, fallback: string): Promise<Error & { status: number }> {
  const payload = await safeResponseJson(response);
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  return Object.assign(
    new Error(String(record.message ?? record.error ?? fallback)),
    { status: response.status }
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
