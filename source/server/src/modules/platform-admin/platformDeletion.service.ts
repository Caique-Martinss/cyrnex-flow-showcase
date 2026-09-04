import { deleteBusinessStorage } from '../../database/postgres/platformStorageAdmin.js';
import { serverSupabaseRest } from '../../database/postgres/restClient.js';
import { getPlatformBusinessDetails } from './platformAdmin.repository.js';
import { writePlatformSystemLog } from './platformSystemLog.js';

interface DeleteReceipt {
  deleted: boolean;
  businessId: string;
  businessName: string;
  businessSlug: string;
  receiptId: string;
  deletedAt: string;
}

interface StorageCleanupOutcome {
  status: 'complete' | 'incomplete';
  buckets: Record<string, { deletedObjects: number }>;
  totalDeletedObjects: number;
  error?: string;
}

export async function hardDeletePlatformBusiness(input: {
  actorUserId: string;
  businessId: string;
  reason: string;
  confirmation: string;
}): Promise<DeleteReceipt & { storageCleanup: StorageCleanupOutcome }> {
  const reason = input.reason.trim();
  if (reason.length < 5) {
    throw Object.assign(new Error('Informe o motivo da exclusão com pelo menos 5 caracteres.'), { status: 400 });
  }

  const details = await getPlatformBusinessDetails(input.businessId);
  const expected = `EXCLUIR ${details.business.slug}`;
  if (input.confirmation.trim().toLocaleUpperCase('pt-BR') !== expected.toLocaleUpperCase('pt-BR')) {
    throw Object.assign(new Error(`Digite exatamente “${expected}” para confirmar.`), { status: 400 });
  }

  await writePlatformSystemLog({
    severity: 'warn',
    category: 'tenant_deletion',
    source: 'platform_admin',
    message: 'Exclusão definitiva de empresa iniciada.',
    businessId: input.businessId,
    metadata: {
      businessName: details.business.name,
      businessSlug: details.business.slug,
      actorUserId: input.actorUserId
    }
  });

  // Database deletion happens first and atomically. This also proves that the reviewed RPC/migration
  // exists before any object is touched in Storage. If the transaction fails, no tenant file is removed.
  const receipt = await serverSupabaseRest<DeleteReceipt>('/rest/v1/rpc/platform_hard_delete_business', {
    method: 'POST',
    body: {
      p_business_id: input.businessId,
      p_actor_user_id: input.actorUserId,
      p_reason: reason,
      p_confirmation: input.confirmation.trim(),
      p_storage_cleanup: {}
    }
  });

  let storageCleanup: StorageCleanupOutcome;
  try {
    const result = await retryStorageCleanup(input.businessId, 3);
    storageCleanup = { status: 'complete', ...result };
    await updateDeletionReceipt(receipt.receiptId, storageCleanup);
    await writePlatformSystemLog({
      severity: 'info',
      category: 'tenant_deletion',
      source: 'storage',
      message: 'Arquivos da empresa excluída foram removidos do Storage.',
      metadata: {
        businessId: input.businessId,
        businessName: details.business.name,
        receiptId: receipt.receiptId,
        totalDeletedObjects: result.totalDeletedObjects
      }
    });
  } catch (error) {
    storageCleanup = {
      status: 'incomplete',
      buckets: {},
      totalDeletedObjects: 0,
      error: error instanceof Error ? error.message : String(error)
    };
    await updateDeletionReceipt(receipt.receiptId, storageCleanup).catch(() => undefined);
    await writePlatformSystemLog({
      severity: 'critical',
      category: 'tenant_deletion',
      source: 'storage',
      message: 'Empresa removida do banco, mas a limpeza do Storage ficou incompleta.',
      metadata: {
        businessId: input.businessId,
        businessName: details.business.name,
        receiptId: receipt.receiptId,
        error: storageCleanup.error
      }
    });
  }

  return { ...receipt, storageCleanup };
}

async function retryStorageCleanup(businessId: string, attempts: number) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await deleteBusinessStorage(businessId);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(250 * attempt);
    }
  }
  throw lastError;
}

async function updateDeletionReceipt(receiptId: string, cleanup: StorageCleanupOutcome): Promise<void> {
  await serverSupabaseRest('/rest/v1/platform_deletion_receipts', {
    method: 'PATCH',
    query: { id: `eq.${receiptId}` },
    body: { storage_cleanup: cleanup }
  });
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
