import type { BusinessSettings, Professional, Service } from '../domain/types';
import { api } from './http';


export interface PublicStaffContext {
  staff: true;
  role: 'owner' | 'manager' | 'professional' | 'receptionist';
  canConfigure: boolean;
  businessId: string;
  businessName: string;
}

interface PublicStaffContextResponse {
  staff: boolean;
  role?: PublicStaffContext['role'];
  canConfigure?: boolean;
  businessId?: string;
  businessName?: string;
}

export interface PublicPagePayload {
  settings: BusinessSettings;
  services: Service[];
  professionals: Professional[];
}

export async function loadPublicPage(slug: string): Promise<PublicPagePayload> {
  const response = await api.get<PublicPagePayload>('/public/page', {
    params: { slug }
  });
  return response.data;
}


export async function loadPublicStaffContext(
  slug: string
): Promise<PublicStaffContext | null> {
  const response = await api.get<PublicStaffContextResponse>('/public/staff-context', {
    params: { slug }
  });
  const data = response.data;
  if (!data.staff || !data.role || !data.businessId || !data.businessName) return null;
  return {
    staff: true,
    role: data.role,
    canConfigure: Boolean(data.canConfigure),
    businessId: data.businessId,
    businessName: data.businessName
  };
}
