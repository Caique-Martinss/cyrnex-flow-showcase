import type { BusinessSettings, MemberRole } from '../domain/types';

export type AppTab =
  | 'overview'
  | 'agenda'
  | 'clients'
  | 'finance-revenue'
  | 'finance-expenses'
  | 'whatsapp'
  | 'waitlist'
  | 'reports'
  | 'booking'
  | 'settings';

export type ModalName =
  | 'client'
  | 'appointment'
  | 'expense'
  | 'complete'
  | 'scheduleBlock'
  | 'pastService'
  | 'reschedule'
  | null;

export interface NavigationItem {
  id: AppTab;
  label: string;
  disabled?: boolean;
  badge?: string;
  children?: Array<{
    id: AppTab;
    label: string;
  }>;
}

const baseNavigationItems: NavigationItem[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'clients', label: 'Clientes' }
];

export function getNavigationItems(settings: BusinessSettings, role: MemberRole): NavigationItem[] {
  const items = [...baseNavigationItems];

  const isAdmin = role === 'owner' || role === 'manager';

  if (isAdmin && isModuleEnabled(settings, 'finance')) {
    items.push({
      id: 'finance-revenue',
      label: 'Financeiro',
      children: [
        { id: 'finance-revenue', label: 'Faturamento' },
        { id: 'finance-expenses', label: 'Despesas' }
      ]
    });
  }

  if (isAdmin) {
    items.push(
      { id: 'whatsapp', label: 'WhatsApp', disabled: true, badge: 'Em desenvolvimento' },
      { id: 'waitlist', label: 'Lista de espera', disabled: true, badge: 'Em desenvolvimento' },
      { id: 'reports', label: 'Relatórios', disabled: true, badge: 'Em desenvolvimento' }
    );
  }

  if (settings.profile.publicPageEnabled) {
    items.push({ id: 'booking', label: 'Link do cliente' });
  }

  if (isAdmin) items.push({ id: 'settings', label: 'Configurações' });
  return items;
}

export function isModuleEnabled(
  settings: BusinessSettings,
  moduleKey: BusinessSettings['modules'][number]['key']
): boolean {
  return settings.modules.some(item => item.key === moduleKey && item.enabled);
}
