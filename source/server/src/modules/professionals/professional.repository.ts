import type { DaySchedule, Professional, SchedulePeriod } from '../../domain/types.js';
import { requireProductionAccessToken, userSupabaseRest } from '../../database/postgres/restClient.js';
import type { AuthContext } from '../auth/auth.types.js';

interface ProfessionalRow {
  id: string;
  name: string;
  professional_name: string | null;
  onboarding_role: Professional['role'];
  phone: string | null;
  email: string | null;
  serves_clients: boolean;
  receives_commission: boolean;
  commission_percent: number | string;
  accepts_online_booking: boolean;
  public_visible: boolean;
  is_owner: boolean;
  active: boolean;
  uses_custom_schedule: boolean;
}

interface ProfessionalHourRow {
  id: string;
  professional_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
}

interface BusinessHourRow {
  id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
}

const professionalSelect = [
  'id,name,professional_name,onboarding_role,phone,email,serves_clients',
  'receives_commission,commission_percent,accepts_online_booking,public_visible',
  'is_owner,active,uses_custom_schedule'
].join(',');

export async function listProductionProfessionals(
  auth: AuthContext,
  options: { includeInactive?: boolean } = {}
): Promise<Professional[]> {
  const token = requireProductionAccessToken(auth.accessToken);
  const [professionals, hours, businessHours] = await Promise.all([
    userSupabaseRest<ProfessionalRow[]>(token, '/rest/v1/professionals', {
      query: {
        select: professionalSelect,
        business_id: `eq.${auth.businessId}`,
        ...(options.includeInactive ? {} : { active: 'eq.true' }),
        order: 'display_order.asc,name.asc'
      }
    }),
    userSupabaseRest<ProfessionalHourRow[]>(token, '/rest/v1/professional_hours', {
      query: {
        select: 'id,professional_id,weekday,starts_at,ends_at',
        business_id: `eq.${auth.businessId}`,
        order: 'professional_id.asc,weekday.asc,starts_at.asc'
      }
    }),
    userSupabaseRest<BusinessHourRow[]>(token, '/rest/v1/business_hours', {
      query: {
        select: 'id,weekday,opens_at,closes_at',
        business_id: `eq.${auth.businessId}`,
        order: 'weekday.asc,opens_at.asc'
      }
    })
  ]);

  const hoursByProfessional = groupProfessionalHours(hours);
  const businessSchedule = buildSchedule(groupByWeekday(businessHours));
  return professionals.map(row => ({
    id: row.id,
    name: row.name,
    professionalName: row.professional_name,
    role: row.onboarding_role,
    phone: row.phone,
    email: row.email,
    servesClients: row.serves_clients,
    receivesCommission: row.receives_commission,
    commissionPercent: Number(row.commission_percent),
    acceptsOnlineBooking: row.accepts_online_booking,
    publicVisible: row.public_visible,
    isOwner: row.is_owner,
    weeklySchedule: row.uses_custom_schedule
      ? buildCustomSchedule(hoursByProfessional.get(row.id) ?? new Map(), businessSchedule)
      : null,
    active: row.active
  }));
}

function groupProfessionalHours(rows: ProfessionalHourRow[]): Map<string, Map<number, SchedulePeriod[]>> {
  const result = new Map<string, Map<number, SchedulePeriod[]>>();
  for (const row of rows) {
    const weekdays = result.get(row.professional_id) ?? new Map<number, SchedulePeriod[]>();
    const periods = weekdays.get(row.weekday) ?? [];
    periods.push({ id: row.id, startsAt: trimTime(row.starts_at), endsAt: trimTime(row.ends_at) });
    weekdays.set(row.weekday, periods);
    result.set(row.professional_id, weekdays);
  }
  return result;
}

function groupByWeekday(rows: BusinessHourRow[]): Map<number, SchedulePeriod[]> {
  const result = new Map<number, SchedulePeriod[]>();
  for (const row of rows) {
    const periods = result.get(row.weekday) ?? [];
    periods.push({ id: row.id, startsAt: trimTime(row.opens_at), endsAt: trimTime(row.closes_at) });
    result.set(row.weekday, periods);
  }
  return result;
}

function buildSchedule(rows: Map<number, SchedulePeriod[]>): DaySchedule[] {
  return Array.from({ length: 7 }, (_, weekday) => dayFromPeriods(weekday, rows.get(weekday) ?? []));
}

function buildCustomSchedule(
  custom: Map<number, SchedulePeriod[]>,
  business: DaySchedule[]
): DaySchedule[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const periods = custom.get(weekday) ?? [];
    if (periods.length) return dayFromPeriods(weekday, periods);
    const fallback = business[weekday];
    return {
      ...fallback,
      enabled: false,
      periods: []
    };
  });
}

function dayFromPeriods(weekday: number, periods: SchedulePeriod[]): DaySchedule {
  const sorted = [...periods].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const opensAt = first?.startsAt ?? '09:00';
  const closesAt = last?.endsAt ?? '18:00';
  return {
    weekday,
    enabled: sorted.length > 0,
    opensAt,
    closesAt,
    breakEnabled: sorted.length > 1,
    breakStartsAt: sorted.length > 1 ? sorted[0].endsAt : null,
    breakEndsAt: sorted.length > 1 ? sorted[1].startsAt : null,
    periods: sorted
  };
}

function trimTime(value: string): string {
  return value.slice(0, 5);
}
