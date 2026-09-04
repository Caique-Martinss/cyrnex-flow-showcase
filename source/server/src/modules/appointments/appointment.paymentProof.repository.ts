import type { AuthContext } from '../auth/auth.types.js';
import { createServerPaymentProofSignedUrl } from '../../database/postgres/paymentProofStorage.js';
import { requireProductionAccessToken, userSupabaseRest } from '../../database/postgres/restClient.js';
import { getProductionAppointment } from './appointment.production.repository.js';

interface PaymentProofRow {
  id: string;
  amount_snapshot: number | string;
  storage_path: string;
  mime_type: string;
  size_bytes: number | string;
  status: 'submitted' | 'confirmed' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

export interface AppointmentPaymentProof {
  id: string;
  amount: number;
  mimeType: string;
  sizeBytes: number;
  status: 'submitted' | 'confirmed' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  signedUrl: string;
}

export async function loadProductionAppointmentPaymentProof(
  auth: AuthContext,
  appointmentId: string
): Promise<AppointmentPaymentProof | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  const rows = await userSupabaseRest<PaymentProofRow[]>(token, '/rest/v1/appointment_payment_proofs', {
    query: {
      select: 'id,amount_snapshot,storage_path,mime_type,size_bytes,status,submitted_at,reviewed_at,review_note',
      business_id: `eq.${auth.businessId}`,
      appointment_id: `eq.${appointmentId}`,
      order: 'submitted_at.desc',
      limit: '1'
    }
  });
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    amount: Number(row.amount_snapshot),
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    signedUrl: await createServerPaymentProofSignedUrl(row.storage_path, 900)
  };
}

export async function reviewProductionAppointmentPaymentProof(
  auth: AuthContext,
  appointmentId: string,
  proofId: string,
  action: 'confirm' | 'reject',
  note: string | null
) {
  const token = requireProductionAccessToken(auth.accessToken);
  await userSupabaseRest<string>(token, '/rest/v1/rpc/review_agenda_payment_proof', {
    method: 'POST',
    body: {
      p_business_id: auth.businessId,
      p_appointment_id: appointmentId,
      p_proof_id: proofId,
      p_action: action,
      p_note: note
    }
  });
  const [appointment, proof] = await Promise.all([
    getProductionAppointment(auth, appointmentId),
    loadProductionAppointmentPaymentProof(auth, appointmentId)
  ]);
  return { appointment, proof };
}
