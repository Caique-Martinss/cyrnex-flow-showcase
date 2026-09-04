import type {
  BusinessHours,
  DaySchedule,
  ScheduleBlock,
  ScheduleBlockType,
  SchedulePeriod
} from '../../domain/types.js';
import {
  requireProductionAccessToken,
  userSupabaseRest
} from '../../database/postgres/restClient.js';
import type { AuthContext } from '../auth/auth.types.js';
import { translateAgendaError } from '../appointments/appointment.production.errors.js';
import type { AvailabilityResult } from './availability.service.js';

interface AvailabilityRpcResult {
  date: string;
  closed: boolean;
  slots: AvailabilityResult['slots'];
}

interface HourRow {
  id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
}

interface SettingsRow {
  booking_slot_interval_minutes: number;
}

interface ScheduleBlockRow {
  id: string;
  professional_id: string | null;
  starts_at: string;
  ends_at: string;
  block_type: ScheduleBlockType;
  reason: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export async function loadProductionAvailability(
  auth: AuthContext,
  input: {
    serviceId: string;
    professionalId: string;
    date: string;
    ignoredAppointmentId?: string;
  }
): Promise<AvailabilityResult> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    const [result, businessHours] = await Promise.all([
      userSupabaseRest<AvailabilityRpcResult>(
        token,
        '/rest/v1/rpc/get_agenda_availability',
        {
          method: 'POST',
          body: {
            p_business_id: auth.businessId,
            p_service_id: input.serviceId,
            p_professional_id: input.professionalId,
            p_date: input.date,
            p_ignored_appointment_id: input.ignoredAppointmentId ?? null
          }
        }
      ),
      loadProductionBusinessHours(auth)
    ]);
    return { ...result, businessHours };
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function listProductionScheduleBlocks(
  auth: AuthContext
): Promise<ScheduleBlock[]> {
  const token = requireProductionAccessToken(auth.accessToken);
  const rows = await userSupabaseRest<ScheduleBlockRow[]>(
    token,
    '/rest/v1/schedule_blocks',
    {
      query: {
        select: [
          'id,professional_id,starts_at,ends_at,block_type,reason',
          'created_by,created_by_name,created_at'
        ].join(','),
        business_id: `eq.${auth.businessId}`,
        order: 'starts_at.asc'
      }
    }
  );
  return rows.map(mapScheduleBlock);
}

export async function createProductionScheduleBlock(
  auth: AuthContext,
  input: {
    professionalId: string | null;
    startsAt: Date;
    endsAt: Date;
    blockType: ScheduleBlockType;
    reason: string;
  }
): Promise<ScheduleBlock | null> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    const id = await userSupabaseRest<string>(token, '/rest/v1/rpc/create_schedule_block', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_professional_id: input.professionalId,
        p_starts_at: input.startsAt.toISOString(),
        p_ends_at: input.endsAt.toISOString(),
        p_block_type: input.blockType,
        p_reason: input.reason
      }
    });
    const rows = await userSupabaseRest<ScheduleBlockRow[]>(
      token,
      '/rest/v1/schedule_blocks',
      {
        query: {
          select: [
            'id,professional_id,starts_at,ends_at,block_type,reason',
            'created_by,created_by_name,created_at'
          ].join(','),
          business_id: `eq.${auth.businessId}`,
          id: `eq.${id}`,
          limit: '1'
        }
      }
    );
    return rows[0] ? mapScheduleBlock(rows[0]) : null;
  } catch (error) {
    throw translateAgendaError(error);
  }
}

export async function deleteProductionScheduleBlock(
  auth: AuthContext,
  id: string
): Promise<void> {
  const token = requireProductionAccessToken(auth.accessToken);
  try {
    await userSupabaseRest<null>(token, '/rest/v1/rpc/delete_schedule_block', {
      method: 'POST',
      body: {
        p_business_id: auth.businessId,
        p_block_id: id
      }
    });
  } catch (error) {
    throw translateAgendaError(error);
  }
}

async function loadProductionBusinessHours(auth: AuthContext): Promise<BusinessHours> {
  const token = requireProductionAccessToken(auth.accessToken);
  const filter = { business_id: `eq.${auth.businessId}` };
  const [settingsRows, hours] = await Promise.all([
    userSupabaseRest<SettingsRow[]>(token, '/rest/v1/business_settings', {
      query: {
        select: 'booking_slot_interval_minutes',
        ...filter,
        limit: '1'
      }
    }),
    userSupabaseRest<HourRow[]>(token, '/rest/v1/business_hours', {
      query: {
        select: 'id,weekday,opens_at,closes_at',
        ...filter,
        order: 'weekday.asc,opens_at.asc'
      }
    })
  ]);
  const weeklySchedule = buildWeeklySchedule(hours);
  const enabled = weeklySchedule.filter(day => day.enabled);
  return {
    open: enabled[0]?.opensAt ?? '09:00',
    close: enabled[enabled.length - 1]?.closesAt ?? '18:00',
    slotIntervalMinutes: settingsRows[0]?.booking_slot_interval_minutes ?? 15,
    closedWeekdays: weeklySchedule.filter(day => !day.enabled).map(day => day.weekday),
    weeklySchedule
  };
}

function buildWeeklySchedule(rows: HourRow[]): DaySchedule[] {
  const grouped = new Map<number, SchedulePeriod[]>();
  for (const row of rows) {
    const periods = grouped.get(row.weekday) ?? [];
    periods.push({
      id: row.id,
      startsAt: row.opens_at.slice(0, 5),
      endsAt: row.closes_at.slice(0, 5)
    });
    grouped.set(row.weekday, periods);
  }
  return Array.from({ length: 7 }, (_, weekday) => {
    const periods = [...(grouped.get(weekday) ?? [])]
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      weekday,
      enabled: periods.length > 0,
      opensAt: periods[0]?.startsAt ?? '09:00',
      closesAt: periods[periods.length - 1]?.endsAt ?? '18:00',
      breakEnabled: periods.length > 1,
      breakStartsAt: periods.length > 1 ? periods[0].endsAt : null,
      breakEndsAt: periods.length > 1 ? periods[1].startsAt : null,
      periods
    };
  });
}

function mapScheduleBlock(row: ScheduleBlockRow): ScheduleBlock {
  return {
    id: row.id,
    professionalId: row.professional_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    blockType: row.block_type,
    reason: row.reason ?? '',
    createdByUserId: row.created_by ?? '',
    createdByName: row.created_by_name ?? 'Usuário',
    createdAt: row.created_at
  };
}
