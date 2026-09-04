import type { Client } from '../../domain/types.js';
import type { AuthContext } from '../auth/auth.types.js';
import { getDateTextInTimeZone } from '../../utils/timezone.js';
import {
  isSupabaseRestError,
  requireProductionAccessToken,
  userSupabaseRest
} from '../../database/postgres/restClient.js';

interface ClientRow {
  id: string;
  full_name: string;
  phone_raw: string | null;
  email: string | null;
  created_at: string;
}

interface BusinessTimezoneRow {
  timezone: string;
}

interface CompletedAppointmentRow {
  client_id: string | null;
  starts_at: string;
  base_price: number | string;
}

export async function listProductionClients(auth: AuthContext): Promise<Client[]> {
  const token = requireProductionAccessToken(auth.accessToken);
  const [clients, completed, businesses] = await Promise.all([
    userSupabaseRest<ClientRow[]>(token, '/rest/v1/clients', {
      query: {
        select: 'id,full_name,phone_raw,email,created_at',
        business_id: `eq.${auth.businessId}`,
        status: 'neq.archived',
        order: 'full_name.asc'
      }
    }),
    userSupabaseRest<CompletedAppointmentRow[]>(token, '/rest/v1/appointments', {
      query: {
        select: 'client_id,starts_at,base_price',
        business_id: `eq.${auth.businessId}`,
        status: 'eq.completed'
      }
    }),
    userSupabaseRest<BusinessTimezoneRow[]>(token, '/rest/v1/businesses', {
      query: {
        select: 'timezone',
        id: `eq.${auth.businessId}`,
        limit: '1'
      }
    })
  ]);

  const stats = buildClientStats(completed, businesses[0]?.timezone ?? 'America/Sao_Paulo');
  return clients.map(row => mapClient(row, stats.get(row.id)));
}

export async function createProductionClient(
  auth: AuthContext,
  input: { name: string; phone: string; email: string | null }
): Promise<Client> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    const rows = await userSupabaseRest<ClientRow[]>(token, '/rest/v1/clients', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        business_id: auth.businessId,
        full_name: input.name,
        phone_raw: input.phone,
        email: input.email,
        origin: 'manual',
        created_by: auth.userId
      }
    });
    const row = rows[0];
    if (!row) throw Object.assign(new Error('Cliente não retornado pelo banco.'), { status: 500 });
    return mapClient(row);
  } catch (error) {
    if (isSupabaseRestError(error) && (error.status === 409 || error.code === '23505')) {
      throw Object.assign(new Error('Já existe um cliente cadastrado com esse telefone.'), { status: 409 });
    }
    throw error;
  }
}

export async function updateProductionClient(
  auth: AuthContext,
  clientId: string,
  input: { name: string; phone: string; email: string | null }
): Promise<Client> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    const rows = await userSupabaseRest<ClientRow[]>(token, '/rest/v1/clients', {
      method: 'PATCH',
      prefer: 'return=representation',
      query: {
        id: `eq.${clientId}`,
        business_id: `eq.${auth.businessId}`,
        status: 'neq.archived'
      },
      body: {
        full_name: input.name,
        phone_raw: input.phone,
        email: input.email
      }
    });
    const row = rows[0];
    if (!row) throw Object.assign(new Error('Cliente não encontrado.'), { status: 404 });
    return mapClient(row);
  } catch (error) {
    if (isSupabaseRestError(error) && (error.status === 409 || error.code === '23505')) {
      throw Object.assign(new Error('Já existe outro cliente cadastrado com esse telefone.'), { status: 409 });
    }
    throw error;
  }
}

function buildClientStats(
  rows: CompletedAppointmentRow[],
  timeZone: string
): Map<string, {
  appointments: number;
  totalSpend: number;
  lastVisit: string | null;
}> {
  const result = new Map<string, { appointments: number; totalSpend: number; lastVisit: string | null }>();
  for (const row of rows) {
    if (!row.client_id) continue;
    const current = result.get(row.client_id) ?? { appointments: 0, totalSpend: 0, lastVisit: null };
    const visit = getDateTextInTimeZone(new Date(row.starts_at), timeZone);
    current.appointments += 1;
    current.totalSpend = roundMoney(current.totalSpend + Number(row.base_price));
    if (!current.lastVisit || visit > current.lastVisit) current.lastVisit = visit;
    result.set(row.client_id, current);
  }
  return result;
}

function mapClient(
  row: ClientRow,
  stats?: { appointments: number; totalSpend: number; lastVisit: string | null }
): Client {
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone_raw ?? '',
    email: row.email,
    lastVisit: stats?.lastVisit ?? null,
    totalSpend: stats?.totalSpend ?? 0,
    appointments: stats?.appointments ?? 0,
    createdAt: row.created_at
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
