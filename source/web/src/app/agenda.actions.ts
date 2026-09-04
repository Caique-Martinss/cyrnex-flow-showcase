import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type {
  Appointment,
  BusinessSettings,
  Professional,
  RetroactiveServiceRequest,
  ScheduleBlock
} from '../domain/types';
import type {
  AppointmentFormState,
  PastServiceFormState,
  ScheduleBlockFormState
} from '../domain/forms';
import {
  createEmptyAppointmentForm,
  createEmptyPastServiceForm,
  createEmptyScheduleBlockForm
} from '../domain/forms';
import type { ModalName } from './navigation';
import type { ToastInput } from '../hooks/useToast';
import { businessDateTimeInputToUtc, formatDateTimeInputInTimeZone } from '../utils/businessTime';
import {
  approveRetroactiveRequest,
  createRetroactiveRequest,
  createScheduleBlock,
  deleteScheduleBlock,
  getErrorMessage,
  rejectRetroactiveRequest,
  rescheduleAppointment
} from '../services';

interface AgendaActionData {
  settings: BusinessSettings;
  professionals: Professional[];
  scheduleBlocks: ScheduleBlock[];
  retroactiveRequests: RetroactiveServiceRequest[];
  refreshData: (showPageLoading?: boolean) => Promise<void>;
}

interface AgendaActionsInput {
  data: AgendaActionData;
  appointmentForm: AppointmentFormState;
  scheduleBlockForm: ScheduleBlockFormState;
  pastServiceForm: PastServiceFormState;
  selectedAppointment: Appointment | null;
  setAppointmentForm: Dispatch<SetStateAction<AppointmentFormState>>;
  setScheduleBlockForm: Dispatch<SetStateAction<ScheduleBlockFormState>>;
  setPastServiceForm: Dispatch<SetStateAction<PastServiceFormState>>;
  setSelectedAppointment: Dispatch<SetStateAction<Appointment | null>>;
  setModal: Dispatch<SetStateAction<ModalName>>;
  setActionLoading: Dispatch<SetStateAction<boolean>>;
  showToast: (message: ToastInput) => void;
}

export function createAgendaActions(input: AgendaActionsInput) {
  async function submitScheduleBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    input.setActionLoading(true);
    try {
      const block = await createScheduleBlock({
        professionalId: input.scheduleBlockForm.professionalId || null,
        startsAt: toUtc(input.scheduleBlockForm.startsAt, input.data.settings.timezone),
        endsAt: toUtc(input.scheduleBlockForm.endsAt, input.data.settings.timezone),
        blockType: input.scheduleBlockForm.blockType,
        reason: input.scheduleBlockForm.reason
      });
      input.setScheduleBlockForm(createEmptyScheduleBlockForm());
      input.setModal(null);
      await input.data.refreshData(false);
      input.showToast({
        message: 'Horário bloqueado e protegido contra novos agendamentos.',
        actionLabel: 'Desfazer',
        onAction: async () => {
          try {
            await deleteScheduleBlock(block.id);
            await input.data.refreshData(false);
            input.showToast('Bloqueio desfeito. O horário voltou à disponibilidade normal.');
          } catch (error) {
            input.showToast(getErrorMessage(error));
          }
        }
      });
    } catch (error) {
      input.showToast(getErrorMessage(error));
    } finally {
      input.setActionLoading(false);
    }
  }

  async function submitPastService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    input.setActionLoading(true);
    try {
      await createRetroactiveRequest({
        clientId: input.pastServiceForm.clientId,
        serviceId: input.pastServiceForm.serviceId,
        professionalId: input.pastServiceForm.professionalId,
        startsAt: toUtc(input.pastServiceForm.startsAt, input.data.settings.timezone),
        price: Number(input.pastServiceForm.price),
        paymentMethod: input.pastServiceForm.paymentMethod,
        notes: input.pastServiceForm.notes,
        reason: input.pastServiceForm.reason,
        proofType: input.pastServiceForm.proofType,
        proofReference: input.pastServiceForm.proofReference,
        proofDescription: input.pastServiceForm.proofDescription
      });
      input.setPastServiceForm(createEmptyPastServiceForm());
      input.setModal(null);
      await input.data.refreshData(false);
      input.showToast('Lançamento enviado para aprovação. Nada foi faturado ainda.');
    } catch (error) {
      input.showToast(getErrorMessage(error));
    } finally {
      input.setActionLoading(false);
    }
  }

  async function removeScheduleBlockById(id: string) {
    const block = input.data.scheduleBlocks.find(item => item.id === id);
    if (!block) return;
    input.showToast({
      message: `Remover o bloqueio “${block.reason}”? O período poderá voltar a ficar disponível.`,
      actionLabel: 'Confirmar remoção',
      onAction: async () => {
        input.setActionLoading(true);
        try {
          await deleteScheduleBlock(id);
          await input.data.refreshData(false);
          input.showToast('Bloqueio removido.');
        } catch (error) {
          input.showToast(getErrorMessage(error));
        } finally {
          input.setActionLoading(false);
        }
      }
    });
  }

  async function submitReschedule(
    date: string,
    scope: 'this' | 'future' | 'all' = 'this'
  ) {
    if (!input.selectedAppointment) return;
    input.setActionLoading(true);
    try {
      await rescheduleAppointment(
        input.selectedAppointment.id,
        toUtc(date, input.data.settings.timezone),
        scope
      );
      input.setSelectedAppointment(null);
      input.setModal(null);
      await input.data.refreshData(false);
      input.showToast('Atendimento reagendado com sucesso.');
    } catch (error) {
      input.showToast(getErrorMessage(error));
    } finally {
      input.setActionLoading(false);
    }
  }

  async function approveRetroactive(
    itemId: string,
    options: { confirmConflict?: boolean; conflictJustification?: string } = {}
  ) {
    input.setActionLoading(true);
    try {
      await approveRetroactiveRequest(itemId, options);
      await input.data.refreshData(false);
      input.showToast('Atendimento passado aprovado, auditado e lançado no histórico.');
    } catch (error) {
      input.showToast(getErrorMessage(error));
    } finally {
      input.setActionLoading(false);
    }
  }

  async function rejectRetroactive(itemId: string, reason: string) {
    if (reason.trim().length < 3) {
      input.showToast('Explique o motivo da rejeição antes de continuar.');
      return;
    }
    input.setActionLoading(true);
    try {
      await rejectRetroactiveRequest(itemId, reason.trim());
      await input.data.refreshData(false);
      input.showToast('Lançamento rejeitado e registrado na auditoria.');
    } catch (error) {
      input.showToast(getErrorMessage(error));
    } finally {
      input.setActionLoading(false);
    }
  }

  function openAppointmentAt(date = '', professionalId = '') {
    const activeProfessionals = input.data.professionals.filter(
      item => item.active && item.servesClients
    );
    const soloProfessional = input.data.settings.operationMode === 'solo'
      ? activeProfessionals[0]
      : undefined;
    input.setAppointmentForm({
      ...createEmptyAppointmentForm(),
      professionalId: professionalId || soloProfessional?.id || '',
      date
    });
    input.setModal('appointment');
  }

  function openScheduleBlockAt(date = '', professionalId = '') {
    const start = date
      ? businessDateTimeInputToUtc(date, input.data.settings.timezone) ?? new Date(date)
      : null;
    const end = start ? new Date(start.getTime() + 60 * 60_000) : null;
    const activeProfessionals = input.data.professionals.filter(
      item => item.active && item.servesClients
    );
    const soloProfessional = input.data.settings.operationMode === 'solo'
      ? activeProfessionals[0]
      : undefined;
    input.setScheduleBlockForm({
      ...createEmptyScheduleBlockForm(),
      professionalId: professionalId || soloProfessional?.id || '',
      startsAt: start ? formatDateTimeInputInTimeZone(start, input.data.settings.timezone) : '',
      endsAt: end ? formatDateTimeInputInTimeZone(end, input.data.settings.timezone) : ''
    });
    input.setModal('scheduleBlock');
  }

  function openPastService() {
    const activeProfessionals = input.data.professionals.filter(
      item => item.active && item.servesClients
    );
    const defaultProfessional = input.data.settings.operationMode === 'solo'
      ? activeProfessionals[0]?.id ?? ''
      : '';
    const defaultPaymentMethod = input.data.settings.paymentMethods.find(
      item => item.active
    )?.method ?? 'pix';
    input.setPastServiceForm({
      ...createEmptyPastServiceForm(),
      professionalId: defaultProfessional,
      paymentMethod: defaultPaymentMethod
    });
    input.setModal('pastService');
  }

  function openReschedule(appointment: Appointment) {
    input.setSelectedAppointment(appointment);
    input.setModal('reschedule');
  }

  return {
    submitScheduleBlock,
    submitPastService,
    removeScheduleBlockById,
    submitReschedule,
    approveRetroactive,
    rejectRetroactive,
    openAppointmentAt,
    openScheduleBlockAt,
    openPastService,
    openReschedule
  };
}

function toUtc(value: string, timeZone: string): string {
  const date = businessDateTimeInputToUtc(value, timeZone);
  if (!date) throw new Error('Data ou horário inválido.');
  return date.toISOString();
}
