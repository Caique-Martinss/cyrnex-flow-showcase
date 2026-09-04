import type { WaitlistEntry, WaitlistStatus } from '../../domain/types.js';
import {
  requireProductionAccessToken,
  userSupabaseRest
} from '../../database/postgres/restClient.js';
import type { AuthContext } from '../auth/auth.types.js';
import { translateAgendaError } from '../appointments/appointment.production.errors.js';

interface WaitlistRow {
  id: string;
  client_id: string;
  service_id: string;
  professional_id: string | null;
  desired_from: string;
  desired_to: string;
  notes: string | null;
  status: WaitlistStatus;
  created_at: string;
}

const waitlistSelect = [
  'id,client_id,service_id,professional_id,desired_from,desired_to',
  'notes,status,created_at'
].join(',');

export async function listProductionWaitlist(auth: AuthContext): Promise<WaitlistEntry[]> {
  const token = requireProductionAccessToken(auth.accessToken);
  const rows = await userSupabaseRest<WaitlistRow[]>(token, '/rest/v1/waiting_list_entries', {
    query: {
      select: waitlistSelect,
      business_id: `eq.${auth.businessId}`,
      order: 'desired_from.asc'
    }
  });
  return rows.map(mapWaitlistEntry);
}

export async function listProductionWaitlistMatches(
  auth: AuthContext,
  input: { startsAt: Date; serviceId: string; professionalId: string }
): Promise<WaitlistEntry[]> {
  const token = requireProductionAccessToken(auth.accessToken);
  const iso = input.startsAt.toISOString();
  const rows = await userSupabaseRest<WaitlistRow[]>(token, '/rest/v1/waiting_list_entries', {
    query: {
      select: waitlistSelect,
      business_id: `eq.${auth.businessId}`,
      status: 'eq.waiting',
      service_id: `eq.${input.serviceId}`,
      or: `(professional_id.is.null,professional_id.eq.${input.professionalId})`,
      desired_from: `lte.${iso}`,
      desired_to: `gte.${iso}`,
      order: 'desired_from.asc'
    }
  });
  return rows.map(mapWaitlistEntry);
}

export async function createProductionWaitlistEntry(
  auth: AuthContext,
  input: {
    clientId: string;
    serviceId: string;
    professionalId: string | null;
    desiredFrom: Date;
    desiredTo: Date;
    notes: string | null;
  }
): Promise<WaitlistEntry | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    const id = await userSupabaseRest<string>(token, '/rest/v1/rpc/create_waitlist_entry', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_client_id: input.clientId,
        p_service_id: input.serviceId,
        p_professional_id: input.professionalId,
        p_desired_from: input.desiredFrom.toISOString(),
        p_desired_to: input.desiredTo.toISOString(),
        p_notes: input.notes
      }
    });
    return await getProductionWaitlistEntry(auth, id);
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function setProductionWaitlistStatus(
  auth: AuthContext,
  id: string,
  status: WaitlistStatus
): Promise<WaitlistEntry | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    await userSupabaseRest<string>(token, '/rest/v1/rpc/set_waitlist_status', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_entry_id: id,
        p_status: status
      }
    });
    return await getProductionWaitlistEntry(auth, id);
  } catch (error) {
    throw translateAgendaError(error);
  }
}

async function getProductionWaitlistEntry(
  auth: AuthContext,
  id: string
): Promise<WaitlistEntry | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  const rows = await userSupabaseRest<WaitlistRow[]>(token, '/rest/v1/waiting_list_entries', {
    query: {
      select: waitlistSelect,
      business_id: `eq.${auth.businessId}`,
      id: `eq.${id}`,
      limit: '1'
    }
  });
  return rows[0] ? mapWaitlistEntry(rows[0]) : null;
}

function mapWaitlistEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    clientId: row.client_id,
    serviceId: row.service_id,
    professionalId: row.professional_id,
    desiredFrom: row.desired_from,
    desiredTo: row.desired_to,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at
  };
}
