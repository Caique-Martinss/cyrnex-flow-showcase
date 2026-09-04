import type {
  BusinessSettings,
  Professional,
  Service
} from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';

export const weekdayLabels = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb'
];

export function publicPrice(service: Service): string {
  if (!service.publicPriceVisible || service.priceType === 'consult') {
    return 'Sob consulta';
  }
  const value = currencyFormatter.format(service.price);
  return service.priceType === 'from' ? `A partir de ${value}` : value;
}

export function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toLocaleUpperCase('pt-BR') ?? '')
    .join('') || 'SC';
}

export function professionalRoleLabel(
  role: Professional['role']
): string {
  const labels: Record<Professional['role'], string> = {
    owner: 'Proprietário / profissional',
    barber: 'Barbeiro',
    manager: 'Gerente',
    receptionist: 'Recepção',
    assistant: 'Assistente',
    other: 'Profissional'
  };
  return labels[role];
}

export function businessStatus(settings: BusinessSettings): string {
  const weekday = new Date().getDay();
  const day = settings.businessHours.weeklySchedule.find(
    item => item.weekday === weekday
  );
  if (!day?.enabled) return 'Fechado hoje';
  const lastPeriod = day.periods[day.periods.length - 1];
  return `Aberto hoje • ${lastPeriod?.endsAt ?? day.closesAt}`;
}
