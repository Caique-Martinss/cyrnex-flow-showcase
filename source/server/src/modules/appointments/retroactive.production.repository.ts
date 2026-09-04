import type {
  PaymentMethod,
  RetroactiveProofType,
  RetroactiveServiceRequest
} from '../../domain/types.js';
import {
  requireProductionAccessToken,
  userSupabaseRest
} from '../../database/postgres/restClient.js';
import type { AuthContext } from '../auth/auth.types.js';
import { getProductionAppointment } from './appointment.production.repository.js';
import { translateAgendaError } from './appointment.production.errors.js';

interface RetroactiveRow {
  id: string;
  client_id: string;
  service_id: string;
  professional_id: string;
  starts_at: string;
  price: number | string;
  payment_method: PaymentMethod;
  notes: string | null;
  reason: string;
  proof_type: RetroactiveProofType;
  proof_reference: string;
  proof_description: string;
  evidence_confirmed: boolean;
  status: RetroactiveServiceRequest['status'];
  requested_by: string;
  requested_by_name: string;
  requested_by_role: RetroactiveServiceRequest['requestedByRole'];
  requested_at: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_appointment_id: string | null;
  conflict_appointment_id: string | null;
  conflict_confirmed: boolean;
  conflict_justification: string | null;
}

const retroactiveSelect = [
  'id,client_id,service_id,professional_id,starts_at,price,payment_method,notes,reason',
  'proof_type,proof_reference,proof_description,evidence_confirmed,status,requested_by',
  'requested_by_name,requested_by_role,requested_at,reviewed_by,reviewed_by_name',
  'reviewed_at,review_note,created_appointment_id,conflict_appointment_id',
  'conflict_confirmed,conflict_justification'
].join(',');

export async function listProductionRetroactiveRequests(
  auth: AuthContext
): Promise<RetroactiveServiceRequest[]> {
  const token = requireProductionAccessToken(auth.accessToken);
  const rows = await userSupabaseRest<RetroactiveRow[]>(
    token,
    '/rest/v1/retroactive_service_requests',
    {
      query: {
        select: retroactiveSelect,
        business_id: `eq.${auth.businessId}`,
        order: 'requested_at.desc'
      }
    }
  );
  return rows.map(mapRetroactiveRequest);
}

export async function createProductionRetroactiveRequest(
  auth: AuthContext,
  input: {
    clientId: string;
    serviceId: string;
    professionalId: string;
    startsAt: Date;
    price: number;
    paymentMethod: PaymentMethod;
    notes: string | null;
    reason: string;
    proofType: RetroactiveProofType;
    proofReference: string;
    proofDescription: string;
  }
): Promise<RetroactiveServiceRequest | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    const id = await userSupabaseRest<string>(token, '/rest/v1/rpc/create_retroactive_request', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_client_id: input.clientId,
        p_service_id: input.serviceId,
        p_professional_id: input.professionalId,
        p_starts_at: input.startsAt.toISOString(),
        p_price: input.price,
        p_payment_method: input.paymentMethod,
        p_notes: input.notes,
        p_reason: input.reason,
        p_proof_type: input.proofType,
        p_proof_reference: input.proofReference,
        p_proof_description: input.proofDescription
      }
    });
    return await getProductionRetroactiveRequest(auth, id);
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function approveProductionRetroactiveRequest(
  auth: AuthContext,
  id: string,
  input: {
    evidenceConfirmed: boolean;
    confirmConflict: boolean;
    conflictJustification: string;
    reviewNote: string | null;
  }
) {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    const result = await userSupabaseRest<{ requestId: string; appointmentId: string }>(
      token,
      '/rest/v1/rpc/approve_retroactive_request',
      {
        method: 'POST',
        body: {
          p_business_id: auth.businessId,
          p_request_id: id,
          p_evidence_confirmed: input.evidenceConfirmed,
          p_confirm_conflict: input.confirmConflict,
          p_conflict_justification: input.conflictJustification || null,
          p_review_note: input.reviewNote
        }
      }
    );
    const [request, appointment] = await Promise.all([
      getProductionRetroactiveRequest(auth, result.requestId),
      getProductionAppointment(auth, result.appointmentId)
    ]);
    return { request, appointment };
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function rejectProductionRetroactiveRequest(
  auth: AuthContext,
  id: string,
  reviewNote: string
): Promise<RetroactiveServiceRequest | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    await userSupabaseRest<string>(token, '/rest/v1/rpc/reject_retroactive_request', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_request_id: id,
        p_review_note: reviewNote
      }
    });
    return await getProductionRetroactiveRequest(auth, id);
  } catch (error) {
    throw translateAgendaError(error);
  }
}

async function getProductionRetroactiveRequest(
  auth: AuthContext,
  id: string
): Promise<RetroactiveServiceRequest | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  const rows = await userSupabaseRest<RetroactiveRow[]>(
    token,
    '/rest/v1/retroactive_service_requests',
    {
      query: {
        select: retroactiveSelect,
        business_id: `eq.${auth.businessId}`,
        id: `eq.${id}`,
        limit: '1'
      }
    }
  );
  return rows[0] ? mapRetroactiveRequest(rows[0]) : null;
}

function mapRetroactiveRequest(row: RetroactiveRow): RetroactiveServiceRequest {
  return {
    id: row.id,
    clientId: row.client_id,
    serviceId: row.service_id,
    professionalId: row.professional_id,
    startsAt: row.starts_at,
    price: Number(row.price),
    paymentMethod: row.payment_method,
    notes: row.notes,
    reason: row.reason,
    proofType: row.proof_type,
    proofReference: row.proof_reference,
    proofDescription: row.proof_description,
    evidenceConfirmed: row.evidence_confirmed,
    status: row.status,
    requestedByUserId: row.requested_by,
    requestedByName: row.requested_by_name,
    requestedByRole: row.requested_by_role,
    requestedAt: row.requested_at,
    reviewedByUserId: row.reviewed_by,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAppointmentId: row.created_appointment_id,
    conflictAppointmentId: row.conflict_appointment_id,
    conflictConfirmed: row.conflict_confirmed,
    conflictJustification: row.conflict_justification
  };
}
