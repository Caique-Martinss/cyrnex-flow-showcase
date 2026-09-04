import {
  isSupabaseRestError,
  requireProductionAccessToken,
  userSupabaseRest
} from '../../database/postgres/restClient.js';
import type { BusinessSettings, Professional, Service } from '../../domain/types.js';
import type { AuthContext } from '../auth/auth.types.js';
import { listProductionProfessionals } from '../professionals/professional.repository.js';
import { listProductionServices } from '../services/service.repository.js';
import { loadProductionSettings } from '../settings/settings.repository.js';
import type { OnboardingState, SaveOnboardingInput } from './onboarding.types.js';
import {
  cleanupFailedMediaUploads,
  cleanupReplacedMediaAssets,
  prepareProductionMedia
} from './onboarding.media.repository.js';

export async function loadProductionOnboardingState(
  auth: AuthContext
): Promise<OnboardingState> {
  const [settings, services, professionals] = await Promise.all([
    loadProductionSettings(auth),
    listProductionServices(auth, { includeInactive: true }),
    listProductionProfessionals(auth, { includeInactive: true })
  ]);
  return { settings, services, professionals };
}

export async function saveProductionOnboardingState(
  auth: AuthContext,
  input: SaveOnboardingInput,
  settings: BusinessSettings,
  services: Service[],
  professionals: Professional[],
  completed: boolean
): Promise<OnboardingState> {
  const token = requireProductionAccessToken(auth.accessToken);
  const media = await prepareProductionMedia(auth, settings.profile);
  const payload: SaveOnboardingInput = {
    currentStep: input.currentStep,
    settings: {
      ...settings,
      profile: {
        ...settings.profile,
        logoDataUrl: null,
        spaceMedia: [],
        portfolioMedia: []
      }
    },
    services,
    professionals
  };

  try {
    await userSupabaseRest<null>(
      token,
      '/rest/v1/rpc/save_business_configuration_with_media',
      {
        method: 'POST',
        body: {
          p_business_id: auth.businessId,
          p_payload: payload,
          p_completed: completed,
          p_logo_asset_id: media.logoAssetId,
          p_media: media.items
        }
      }
    );
  } catch (error) {
    await cleanupFailedMediaUploads(auth, media);
    if (isSupabaseRestError(error)) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Esse endereço público já está em uso.'), { status: 409 });
      }
      if (error.code === '23514') {
        throw Object.assign(new Error(error.message), { status: 409 });
      }
      if (error.status === 403 || error.code === '42501') {
        throw Object.assign(new Error('Sem permissão para alterar esta barbearia.'), { status: 403 });
      }
    }
    throw error;
  }

  await cleanupReplacedMediaAssets(auth, media);
  return loadProductionOnboardingState(auth);
}

export async function isProductionBusinessSlugAvailable(
  auth: AuthContext,
  slug: string
): Promise<boolean> {
  const token = requireProductionAccessToken(auth.accessToken);
  return userSupabaseRest<boolean>(token, '/rest/v1/rpc/is_business_slug_available', {
    method: 'POST',
    body: {
      p_business_id: auth.businessId,
      p_slug: slug
    }
  });
}
