import type { AppTab } from '../../app/navigation';
import type { Appointment, DashboardData } from '../../domain/types';
import type { OverviewSnapshot } from './overview.helpers';

export interface OverviewAttentionItem {
  label: string;
  action: () => void;
}

export function buildOperationalAttentionItems(input: {
  appointments: Appointment[];
  snapshot: OverviewSnapshot;
  dashboard: DashboardData | null;
  returnsEnabled: boolean;
  whatsappEnabled: boolean;
  now: Date;
  onNavigate: (tab: AppTab) => void;
  onOpenAppointment: (appointmentId: string) => void;
}): OverviewAttentionItem[] {
  const submittedProofs = input.appointments.filter(item => (
    item.depositStatus === 'pending' && item.paymentProofStatus === 'submitted'
  ));
  const pendingDepositsToday = input.snapshot.todayScheduled.filter(item => (
    item.depositStatus === 'pending' && item.paymentProofStatus !== 'submitted'
  ));
  const overdueOperational = input.snapshot.todayScheduled.filter(item => (
    ['scheduled', 'confirmed', 'arrived'].includes(item.status)
    && new Date(item.date).getTime() + item.durationMinutes * 60_000 < input.now.getTime()
  ));

  return [
    submittedProofs.length ? {
      label: `${submittedProofs.length} comprovante(s) aguardando sua confirmação`,
      action: () => input.onOpenAppointment(submittedProofs[0].id)
    } : null,
    pendingDepositsToday.length ? {
      label: `${pendingDepositsToday.length} cliente(s) ainda sem sinal confirmado hoje`,
      action: () => input.onOpenAppointment(pendingDepositsToday[0].id)
    } : null,
    overdueOperational.length ? {
      label: `${overdueOperational.length} atendimento(s) com status para atualizar`,
      action: () => input.onOpenAppointment(overdueOperational[0].id)
    } : null,
    input.snapshot.todayCancelled.length ? {
      label: `${input.snapshot.todayCancelled.length} cancelamento(s) hoje`,
      action: () => input.onOpenAppointment(input.snapshot.todayCancelled[0].id)
    } : null,
    input.returnsEnabled && (input.dashboard?.missingCustomers ?? 0) > 0 ? {
      label: `${input.dashboard?.missingCustomers ?? 0} cliente(s) na hora de retornar`,
      action: () => input.whatsappEnabled
        ? input.onNavigate('whatsapp')
        : input.onNavigate('clients')
    } : null
  ].filter(Boolean) as OverviewAttentionItem[];
}
