import type { PublicBookingResult } from '../../domain/types.js';
import { serverSupabaseRest } from '../../database/postgres/restClient.js';
import { createServerSignedAssetUrl } from '../../database/postgres/storageClient.js';
import type { PublicAvailabilityResult } from './availability.service.js';
import { createPublicBookingAccess } from './publicBooking.access.js';
import {
  buildPublicSettings,
  buildWeeklySchedule,
  groupAddons,
  groupProfessionalHours,
  groupProfessionalIds,
  mapBookingResult,
  mapProfessional,
  mapService
} from './publicBooking.production.mappers.js';
import type {
  AddonRow,
  AssetRow,
  BookingRpcResult,
  BusinessRow,
  HourRow,
  MediaRow,
  ProfessionalHourRow,
  ProfessionalRow,
  ProfessionalServiceRow,
  ProfileRow,
  PublicPagePayload,
  ServiceRow,
  SettingsRow
} from './publicBooking.production.types.js';

export async function loadProductionPublicPage(slug: string): Promise<PublicPagePayload> {
  const businesses = await serverSupabaseRest<BusinessRow[]>('/rest/v1/businesses', {
    query: {
      select: [
        'id,name,slug,timezone,operation_mode,onboarding_status',
        'onboarding_step,onboarding_completed_at'
      ].join(','),
      slug: `eq.${slug}`,
      status: 'eq.active',
      onboarding_status: 'eq.completed',
      limit: '1'
    }
  });
  const business = businesses[0];
  if (!business) throw publicError('Página não encontrada.', 404);

  const filter = { business_id: `eq.${business.id}` };
  const data = await loadPublicBusinessData(filter);
  const settings = data.settingsRows[0];
  const profile = data.profiles[0];
  if (!settings || !profile || !profile.publish_on_complete) {
    throw publicError('Esta página ainda não está publicada.', 404);
  }

  const assetIds = [...new Set([
    ...(profile.logo_asset_id ? [profile.logo_asset_id] : []),
    ...data.media.flatMap(item => item.asset_id ? [item.asset_id] : [])
  ])];
  const assets = await loadAssets(filter, assetIds);
  const signedMedia = await signAssets(assets);
  const weeklySchedule = buildWeeklySchedule(data.hours);
  const professionalIds = groupProfessionalIds(data.links);
  const allProfessionalIds = data.professionals.map(item => item.id);
  for (const service of data.services) {
    if (!professionalIds.has(service.id)) professionalIds.set(service.id, allProfessionalIds);
  }
  const addonsByService = groupAddons(data.addons);
  const hoursByProfessional = groupProfessionalHours(data.proHours);

  return {
    settings: buildPublicSettings(
      business,
      settings,
      profile,
      weeklySchedule,
      data.media,
      signedMedia
    ),
    services: data.services.map(row => mapService(row, professionalIds, addonsByService)),
    professionals: data.professionals.map(row => (
      mapProfessional(row, hoursByProfessional, weeklySchedule)
    ))
  };
}

export async function loadProductionPublicAvailability(input: {
  slug: string;
  serviceId: string;
  professionalId: string;
  date: string;
}): Promise<PublicAvailabilityResult> {
  try {
    return await serverSupabaseRest<PublicAvailabilityResult>(
      '/rest/v1/rpc/get_public_booking_availability',
      {
        method: 'POST',
        body: {
          p_slug: input.slug,
          p_service_id: input.serviceId,
          p_professional_id: input.professionalId,
          p_date: input.date
        }
      }
    );
  } catch (error) {
    throw translatePublicDatabaseError(error);
  }
}

export async function createProductionPublicBooking(input: {
  slug: string;
  name: string;
  phone: string;
  email: string | null;
  serviceId: string;
  professionalId: string;
  startsAt: string;
  notes: string | null;
}): Promise<PublicBookingResult> {
  try {
    const access = createPublicBookingAccess();
    const result = await serverSupabaseRest<BookingRpcResult>(
      '/rest/v1/rpc/create_public_booking_with_access',
      {
        method: 'POST',
        body: {
          p_slug: input.slug,
          p_name: input.name,
          p_phone: input.phone,
          p_email: input.email,
          p_service_id: input.serviceId,
          p_professional_id: input.professionalId,
          p_starts_at: input.startsAt,
          p_notes: input.notes,
          p_access_token_hash: access.tokenHash
        }
      }
    );
    return mapBookingResult(result, access.token);
  } catch (error) {
    throw translatePublicDatabaseError(error);
  }
}

async function loadPublicBusinessData(filter: Record<string, string>) {
  const [settingsRows, profiles, hours, services, professionals, links, proHours, addons, media] =
    await Promise.all([
      serverSupabaseRest<SettingsRow[]>('/rest/v1/business_settings', {
        query: { select: '*', ...filter, limit: '1' }
      }),
      serverSupabaseRest<ProfileRow[]>('/rest/v1/business_public_profiles', {
        query: { select: '*', ...filter, public_page_enabled: 'eq.true', limit: '1' }
      }),
      serverSupabaseRest<HourRow[]>('/rest/v1/business_hours', {
        query: { select: 'id,weekday,opens_at,closes_at', ...filter, order: 'weekday.asc,opens_at.asc' }
      }),
      loadServices(filter),
      loadProfessionals(filter),
      serverSupabaseRest<ProfessionalServiceRow[]>('/rest/v1/professional_services', {
        query: { select: 'service_id,professional_id,active', ...filter, active: 'eq.true' }
      }),
      serverSupabaseRest<ProfessionalHourRow[]>('/rest/v1/professional_hours', {
        query: {
          select: 'id,professional_id,weekday,starts_at,ends_at',
          ...filter,
          order: 'professional_id.asc,weekday.asc,starts_at.asc'
        }
      }),
      serverSupabaseRest<AddonRow[]>('/rest/v1/service_addons', {
        query: {
          select: 'id,service_id,name,price_delta,duration_delta_minutes,active',
          ...filter,
          active: 'eq.true',
          order: 'display_order.asc,created_at.asc'
        }
      }),
      serverSupabaseRest<MediaRow[]>('/rest/v1/business_public_media', {
        query: {
          select: [
            'id,media_kind,media_type,asset_id,service_id,title,description',
            'category,public_visible,display_order'
          ].join(','),
          ...filter,
          public_visible: 'eq.true',
          order: 'media_kind.asc,display_order.asc,created_at.asc'
        }
      })
    ]);
  return { settingsRows, profiles, hours, services, professionals, links, proHours, addons, media };
}

function loadServices(filter: Record<string, string>): Promise<ServiceRow[]> {
  return serverSupabaseRest<ServiceRow[]>('/rest/v1/services', {
    query: {
      select: [
        'id,name,category,description,duration_minutes,buffer_after_minutes,base_price',
        'price_type,public_price_visible,deposit_percent_override,online_booking_enabled',
        'recommended_return_days,active'
      ].join(','),
      ...filter,
      active: 'eq.true',
      online_booking_enabled: 'eq.true',
      order: 'display_order.asc,name.asc'
    }
  });
}

function loadProfessionals(filter: Record<string, string>): Promise<ProfessionalRow[]> {
  return serverSupabaseRest<ProfessionalRow[]>('/rest/v1/professionals', {
    query: {
      select: [
        'id,name,professional_name,onboarding_role,serves_clients,accepts_online_booking',
        'public_visible,is_owner,active,uses_custom_schedule'
      ].join(','),
      ...filter,
      active: 'eq.true',
      serves_clients: 'eq.true',
      accepts_online_booking: 'eq.true',
      public_visible: 'eq.true',
      order: 'display_order.asc,name.asc'
    }
  });
}

async function loadAssets(
  filter: Record<string, string>,
  assetIds: string[]
): Promise<AssetRow[]> {
  if (!assetIds.length) return [];
  return serverSupabaseRest<AssetRow[]>('/rest/v1/file_assets', {
    query: {
      select: 'id,storage_path',
      ...filter,
      id: `in.(${assetIds.join(',')})`
    }
  });
}

async function signAssets(rows: AssetRow[]): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  await Promise.all(rows.map(async row => {
    signed.set(row.id, await createServerSignedAssetUrl(row.storage_path, 3600));
  }));
  return signed;
}

function translatePublicDatabaseError(error: unknown): Error {
  if (!(error instanceof Error)) return publicError('Falha no agendamento.', 500);
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  if (code === '23P01' || code === 'P0003') return publicError(error.message, 409);
  if (code === 'P0002') return publicError(error.message, 404);
  if (code === '23503' || code === '23514' || code === '22023' || code === '22P02') {
    return publicError(error.message, 400);
  }
  return error;
}

function publicError(message: string, status: number): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
