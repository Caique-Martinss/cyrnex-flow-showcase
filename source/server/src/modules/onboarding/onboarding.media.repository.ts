import type { BusinessMediaItem, BusinessProfile } from '../../domain/types.js';
import {
  createSignedAssetUrl,
  deleteStoredAsset,
  uploadDataUrlAsset
} from '../../database/postgres/storageClient.js';
import {
  requireProductionAccessToken,
  userSupabaseRest
} from '../../database/postgres/restClient.js';
import type { AuthContext } from '../auth/auth.types.js';

interface PublicProfileAssetRow {
  logo_asset_id: string | null;
}

interface PublicMediaRow {
  id: string;
  media_kind: 'space' | 'portfolio';
  media_type: 'image' | 'video';
  asset_id: string | null;
  service_id: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  public_visible: boolean;
  display_order: number;
}

interface FileAssetRow {
  id: string;
  storage_path: string;
  mime_type: string | null;
}

export interface PreparedMediaItem {
  id: string;
  mediaKind: 'space' | 'portfolio';
  mediaType: 'image' | 'video';
  assetId: string | null;
  serviceId: string | null;
  title: string;
  description: string;
  category: string;
  publicVisible: boolean;
  displayOrder: number;
}

export interface MediaPreparation {
  logoAssetId: string | null;
  items: PreparedMediaItem[];
  newlyUploaded: Array<{ id: string; path: string }>;
  previousAssets: Array<{ id: string; path: string }>;
}

export async function loadProductionMedia(
  auth: AuthContext
): Promise<Pick<BusinessProfile, 'logoDataUrl' | 'spaceMedia' | 'portfolioMedia'>> {
  const state = await loadAssetState(auth);
  const signed = new Map<string, string>();
  await Promise.all([...state.assets.values()].map(async asset => {
    signed.set(asset.id, await createSignedAssetUrl(requireProductionAccessToken(auth.accessToken), asset.path));
  }));

  return {
    logoDataUrl: state.logoAssetId ? signed.get(state.logoAssetId) ?? null : null,
    spaceMedia: state.media
      .filter(item => item.media_kind === 'space')
      .map(item => mapMediaItem(item, signed)),
    portfolioMedia: state.media
      .filter(item => item.media_kind === 'portfolio')
      .map(item => mapMediaItem(item, signed))
  };
}

export async function prepareProductionMedia(
  auth: AuthContext,
  profile: BusinessProfile
): Promise<MediaPreparation> {
  const current = await loadAssetState(auth);
  const newlyUploaded: Array<{ id: string; path: string }> = [];
  const currentByMediaId = new Map(current.media.map(item => [item.id, item]));

  const logoAssetId = await resolveAsset(
    auth,
    profile.logoDataUrl,
    current.logoAssetId,
    'logo',
    newlyUploaded
  );
  const items: PreparedMediaItem[] = [];

  for (const [mediaKind, values] of [
    ['space', profile.spaceMedia] as const,
    ['portfolio', profile.portfolioMedia] as const
  ]) {
    for (let index = 0; index < values.length; index += 1) {
      const item = values[index];
      const previous = currentByMediaId.get(item.id);
      const assetId = await resolveAsset(
        auth,
        item.dataUrl,
        previous?.asset_id ?? null,
        mediaKind,
        newlyUploaded
      );
      items.push({
        id: item.id,
        mediaKind,
        mediaType: item.mediaType,
        assetId,
        serviceId: item.serviceId,
        title: item.title,
        description: item.description,
        category: item.category,
        publicVisible: item.publicVisible,
        displayOrder: index
      });
    }
  }

  return {
    logoAssetId,
    items,
    newlyUploaded,
    previousAssets: [...current.assets.values()].map(asset => ({ id: asset.id, path: asset.path }))
  };
}

export async function cleanupFailedMediaUploads(
  auth: AuthContext,
  preparation: MediaPreparation
): Promise<void> {
  await Promise.allSettled(
    preparation.newlyUploaded.map(asset => deleteStoredAsset(auth, asset))
  );
}

export async function cleanupReplacedMediaAssets(
  auth: AuthContext,
  preparation: MediaPreparation
): Promise<void> {
  const retained = new Set<string>([
    ...(preparation.logoAssetId ? [preparation.logoAssetId] : []),
    ...preparation.items.flatMap(item => item.assetId ? [item.assetId] : [])
  ]);
  const removable = preparation.previousAssets.filter(asset => !retained.has(asset.id));
  for (const asset of removable) {
    if (await assetIsReferenced(auth, asset.id)) continue;
    await deleteStoredAsset(auth, asset).catch(() => undefined);
  }
}

async function resolveAsset(
  auth: AuthContext,
  dataUrl: string | null,
  previousAssetId: string | null,
  folder: string,
  newlyUploaded: Array<{ id: string; path: string }>
): Promise<string | null> {
  if (!dataUrl) return null;
  if (!dataUrl.startsWith('data:')) return previousAssetId;
  const uploaded = await uploadDataUrlAsset(auth, dataUrl, folder);
  newlyUploaded.push({ id: uploaded.id, path: uploaded.path });
  return uploaded.id;
}

async function loadAssetState(auth: AuthContext): Promise<{
  logoAssetId: string | null;
  media: PublicMediaRow[];
  assets: Map<string, { id: string; path: string; mimeType: string | null }>;
}> {
  const token = requireProductionAccessToken(auth.accessToken);
  const [profiles, media] = await Promise.all([
    userSupabaseRest<PublicProfileAssetRow[]>(token, '/rest/v1/business_public_profiles', {
      query: {
        select: 'logo_asset_id',
        business_id: `eq.${auth.businessId}`,
        limit: '1'
      }
    }),
    userSupabaseRest<PublicMediaRow[]>(token, '/rest/v1/business_public_media', {
      query: {
        select: [
          'id,media_kind,media_type,asset_id,service_id,title,description',
          'category,public_visible,display_order'
        ].join(','),
        business_id: `eq.${auth.businessId}`,
        order: 'media_kind.asc,display_order.asc,created_at.asc'
      }
    })
  ]);

  const logoAssetId = profiles[0]?.logo_asset_id ?? null;
  const referencedIds = [...new Set([
    ...(logoAssetId ? [logoAssetId] : []),
    ...media.flatMap(item => item.asset_id ? [item.asset_id] : [])
  ])];
  const assets = referencedIds.length
    ? await userSupabaseRest<FileAssetRow[]>(token, '/rest/v1/file_assets', {
      query: {
        select: 'id,storage_path,mime_type',
        business_id: `eq.${auth.businessId}`,
        id: `in.(${referencedIds.join(',')})`
      }
    })
    : [];

  return {
    logoAssetId,
    media,
    assets: new Map(assets.map(asset => [
      asset.id,
      { id: asset.id, path: asset.storage_path, mimeType: asset.mime_type }
    ]))
  };
}

function mapMediaItem(
  row: PublicMediaRow,
  signed: Map<string, string>
): BusinessMediaItem {
  return {
    id: row.id,
    mediaType: row.media_type,
    dataUrl: row.asset_id ? signed.get(row.asset_id) ?? null : null,
    title: row.title ?? '',
    description: row.description ?? '',
    category: row.category ?? '',
    serviceId: row.service_id,
    publicVisible: row.public_visible
  };
}

async function assetIsReferenced(auth: AuthContext, assetId: string): Promise<boolean> {
  const token = requireProductionAccessToken(auth.accessToken);
  const [logos, media] = await Promise.all([
    userSupabaseRest<Array<{ business_id: string }>>(token, '/rest/v1/business_public_profiles', {
      query: {
        select: 'business_id',
        business_id: `eq.${auth.businessId}`,
        logo_asset_id: `eq.${assetId}`,
        limit: '1'
      }
    }),
    userSupabaseRest<Array<{ id: string }>>(token, '/rest/v1/business_public_media', {
      query: {
        select: 'id',
        business_id: `eq.${auth.businessId}`,
        asset_id: `eq.${assetId}`,
        limit: '1'
      }
    })
  ]);
  return logos.length > 0 || media.length > 0;
}
