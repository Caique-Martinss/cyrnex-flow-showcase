import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { BookingFormState, ExpenseFormState } from '../domain/forms';
import { createEmptyBookingForm, createEmptyExpenseForm } from '../domain/forms';
import type { BusinessSettings, Expense, PublicBookingResult } from '../domain/types';
import type { useBookingAvailability } from '../hooks/useBookingAvailability';
import type { ToastInput } from '../hooks/useToast';
import {
  createExpense,
  createPublicBooking,
  deleteExpense,
  getErrorMessage,
  sendSimulatedMessage
} from '../services';
import type { AppTab, ModalName } from './navigation';

type BookingAvailability = ReturnType<typeof useBookingAvailability>;

interface PeripheralActionsOptions {
  settings: BusinessSettings;
  expenseForm: ExpenseFormState;
  setExpenseForm: Dispatch<SetStateAction<ExpenseFormState>>;
  bookingForm: BookingFormState;
  setBookingForm: Dispatch<SetStateAction<BookingFormState>>;
  bookingResult: PublicBookingResult | null;
  setBookingResult: Dispatch<SetStateAction<PublicBookingResult | null>>;
  availability: BookingAvailability;
  selectedClientId: string;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  setModal: Dispatch<SetStateAction<ModalName>>;
  setActiveTab: Dispatch<SetStateAction<AppTab>>;
  setActionLoading: Dispatch<SetStateAction<boolean>>;
  refreshData: (showPageLoading?: boolean) => Promise<void>;
  showToast: (input: ToastInput) => void;
}

export function createPeripheralActions(options: PeripheralActionsOptions) {
  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    options.setActionLoading(true);
    try {
      await createExpense({
        description: options.expenseForm.description,
        category: options.expenseForm.category,
        amount: Number(options.expenseForm.amount),
        date: new Date(options.expenseForm.date).toISOString()
      });
      options.setExpenseForm(createEmptyExpenseForm());
      options.setModal(null);
      await options.refreshData(false);
      options.setActiveTab('finance-revenue');
      options.showToast('Despesa registrada com sucesso.');
    } catch (error) {
      options.showToast(getErrorMessage(error));
    } finally {
      options.setActionLoading(false);
    }
  }

  function removeExpense(expense: Expense) {
    options.showToast({
      message: `Excluir a despesa “${expense.description}”? Essa ação será registrada na auditoria.`,
      actionLabel: 'Confirmar exclusão',
      onAction: async () => {
        options.setActionLoading(true);
        try {
          await deleteExpense(expense.id);
          await options.refreshData(false);
          options.showToast('Despesa excluída.');
        } catch (error) {
          options.showToast(getErrorMessage(error));
        } finally {
          options.setActionLoading(false);
        }
      }
    });
  }

  async function submitPublicBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!options.availability.selectedSlot) {
      options.showToast('Escolha um horário disponível para continuar.');
      return;
    }
    options.setActionLoading(true);
    try {
      const result = await createPublicBooking({
        slug: options.settings.bookingSlug,
        name: options.bookingForm.name,
        phone: options.bookingForm.phone,
        email: options.bookingForm.email || undefined,
        serviceId: options.bookingForm.serviceId,
        professionalId: options.bookingForm.professionalId,
        date: options.availability.selectedSlot.start,
        bookingDate: options.bookingForm.date,
        notes: options.bookingForm.notes || undefined
      });
      options.setBookingResult(result);
      options.showToast('Horário reservado com sucesso.');
      await options.refreshData(false);
    } catch (error) {
      options.showToast(getErrorMessage(error));
    } finally {
      options.setActionLoading(false);
    }
  }

  function resetPublicBooking() {
    options.setBookingResult(null);
    options.setBookingForm(createEmptyBookingForm());
    options.availability.resetAvailability();
  }

  async function sendMessage() {
    if (!options.selectedClientId) {
      options.showToast('Escolha um cliente para enviar a mensagem.');
      return;
    }
    if (options.message.trim().length < 5) {
      options.showToast('Escreva uma mensagem antes de enviar.');
      return;
    }
    options.setActionLoading(true);
    try {
      await sendSimulatedMessage(options.selectedClientId, options.message.trim());
      options.setMessage('');
      options.showToast(
        'Mensagem simulada com sucesso. Integração real com WhatsApp ainda não está ativa.'
      );
    } catch (error) {
      options.showToast(getErrorMessage(error));
    } finally {
      options.setActionLoading(false);
    }
  }

  return {
    submitExpense,
    removeExpense,
    submitPublicBooking,
    resetPublicBooking,
    sendMessage
  };
}
