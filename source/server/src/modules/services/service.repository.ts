import type { Service, ServiceAddonDraft } from '../../domain/types.js';
import { requireProductionAccessToken, userSupabaseRest } from '../../database/postgres/restClient.js';
import type { AuthContext } from '../auth/auth.types.js';

interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  duration_minutes: number;
  buffer_after_minutes: number;
  base_price: number | string;
  price_type: Service['priceType'];
  public_price_visible: boolean;
  deposit_percent_override: number | string | null;
  online_booking_enabled: boolean;
  recommended_return_days: number | null;
  active: boolean;
}

interface ProfessionalServiceRow {
  service_id: string;
  professional_id: string;
  active: boolean;
}

interface ServiceAddonRow {
  id: string;
  service_id: string;
  name: string;
  price_delta: number | string;
  duration_delta_minutes: number;
  active: boolean;
}

const serviceSelect = [
  'id,name,category,description,duration_minutes,buffer_after_minutes,base_price',
  'price_type,public_price_visible,deposit_percent_override,online_booking_enabled',
  'recommended_return_days,active'
].join(',');

export async function listProductionServices(
  auth: AuthContext,
  options: { includeInactive?: boolean } = {}
): Promise<Service[]> {
  const token = requireProductionAccessToken(auth.accessToken);
  const [services, links, addons] = await Promise.all([
    userSupabaseRest<ServiceRow[]>(token, '/rest/v1/services', {
      query: {
        select: serviceSelect,
        business_id: `eq.${auth.businessId}`,
        ...(options.includeInactive ? {} : { active: 'eq.true' }),
        order: 'display_order.asc,name.asc'
      }
    }),
    userSupabaseRest<ProfessionalServiceRow[]>(token, '/rest/v1/professional_services', {
      query: {
        select: 'service_id,professional_id,active',
        business_id: `eq.${auth.businessId}`,
        active: 'eq.true'
      }
    }),
    userSupabaseRest<ServiceAddonRow[]>(token, '/rest/v1/service_addons', {
      query: {
        select: 'id,service_id,name,price_delta,duration_delta_minutes,active',
        business_id: `eq.${auth.businessId}`,
        order: 'display_order.asc,created_at.asc'
      }
    })
  ]);

  const professionalIds = groupProfessionalIds(links);
  const serviceAddons = groupAddons(addons);
  return services.map(row => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    durationMinutes: row.duration_minutes,
    bufferAfterMinutes: row.buffer_after_minutes,
    price: Number(row.base_price),
    priceType: row.price_type,
    publicPriceVisible: row.public_price_visible,
    depositPercent: row.deposit_percent_override === null ? null : Number(row.deposit_percent_override),
    onlineBookingEnabled: row.online_booking_enabled,
    recommendedReturnDays: row.recommended_return_days,
    professionalIds: professionalIds.get(row.id) ?? [],
    addons: serviceAddons.get(row.id) ?? [],
    active: row.active
  }));
}

function groupProfessionalIds(rows: ProfessionalServiceRow[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const values = grouped.get(row.service_id) ?? [];
    values.push(row.professional_id);
    grouped.set(row.service_id, values);
  }
  return grouped;
}

function groupAddons(rows: ServiceAddonRow[]): Map<string, ServiceAddonDraft[]> {
  const grouped = new Map<string, ServiceAddonDraft[]>();
  for (const row of rows) {
    const values = grouped.get(row.service_id) ?? [];
    values.push({
      id: row.id,
      name: row.name,
      priceDelta: Number(row.price_delta),
      durationDeltaMinutes: row.duration_delta_minutes,
      active: row.active
    });
    grouped.set(row.service_id, values);
  }
  return grouped;
}
