import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { appointmentStatusLabels } from './constants';
import { createAgendaActions } from './agenda.actions';
import { createPeripheralActions } from './peripheral.actions';
import type { AppTab, ModalName } from './navigation';
import type { AgendaNavigationRequest } from '../domain/agenda.types';
import type {
  Appointment,
  AppointmentStatus,
  PublicBookingResult,
  MemberRole
} from '../domain/types';
import {
  createEmptyAppointmentForm,
  createEmptyBookingForm,
  createEmptyClientForm,
  createEmptyCompletionForm,
  createEmptyExpenseForm,
  createEmptyPastServiceForm,
  createEmptyScheduleBlockForm
} from '../domain/forms';
import { useBarbershopData } from '../hooks/useBarbershopData';
import { useBookingAvailability } from '../hooks/useBookingAvailability';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import {
  createAppointment,
  createClient,
  updateClient,
  getErrorMessage,
  updateAppointmentStatus,
  updateRecurrenceState,
  createWaitlistEntry,
  updateWaitlistStatus
} from '../services';
import { getUpcomingBookingDates } from '../utils/dates';
import { addDaysToDateText, businessDateTimeInputToUtc, getDateTextInTimeZone } from '../utils/businessTime';

export function useAppController(role: MemberRole, themeScope = 'default') {
  const data = useBarbershopData(role);
  const { theme, setTheme, toggleTheme } = useTheme(themeScope);
  const { toast, showToast, runToastAction } = useToast();
  const [activeTab, setActiveTab] = useState<AppTab>(
    role === 'owner' || role === 'manager' ? 'overview' : 'agenda'
  );
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [modal, setModal] = useState<ModalName>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [agendaNavigationRequest, setAgendaNavigationRequest] =
    useState<AgendaNavigationRequest | null>(null);
  const [bookingResult, setBookingResult] =
    useState<PublicBookingResult | null>(null);
  const [paymentConfirmationOpen, setPaymentConfirmationOpen] =
    useState(false);
  const [clientForm, setClientForm] = useState(createEmptyClientForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [appointmentForm, setAppointmentForm] = useState(
    createEmptyAppointmentForm
  );
  const [expenseForm, setExpenseForm] = useState(createEmptyExpenseForm);
  const [scheduleBlockForm, setScheduleBlockForm] = useState(
    createEmptyScheduleBlockForm
  );
  const [pastServiceForm, setPastServiceForm] = useState(
    createEmptyPastServiceForm
  );
  const [completionForm, setCompletionForm] = useState(
    createEmptyCompletionForm
  );
  const [bookingForm, setBookingForm] = useState(createEmptyBookingForm);
  const availability = useBookingAvailability(
    bookingForm,
    data.settings.bookingSlug
  );
  useEffect(() => {
    const activeProfessionals = data.professionals.filter(item => item.active);
    const soloProfessional = data.settings.operationMode === 'solo'
      ? activeProfessionals[0]
      : undefined;
    if (!soloProfessional) return;
    setAppointmentForm(current => (
      current.professionalId
        ? current
        : { ...current, professionalId: soloProfessional.id }
    ));
    setBookingForm(current => (
      current.professionalId
        ? current
        : { ...current, professionalId: soloProfessional.id }
    ));
  }, [data.professionals, data.settings.operationMode]);
  const filteredClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return data.clients;
    return data.clients.filter(client => (
      client.name.toLocaleLowerCase('pt-BR').includes(query) ||
      client.phone.includes(query) ||
      client.email?.toLocaleLowerCase('pt-BR').includes(query)
    ));
  }, [data.clients, search]);
  const upcomingAppointments = useMemo(
    () => data.appointments
      .filter(appointment => ['scheduled', 'confirmed', 'arrived', 'in_service'].includes(appointment.status))
      .slice(0, 5),
    [data.appointments]
  );
  const selectedAdminService = data.services.find(
    service => service.id === appointmentForm.serviceId
  );
  const selectedBookingService = data.services.find(
    service => service.id === bookingForm.serviceId
  );
  const bookingDateOptions = useMemo(
    () => getUpcomingBookingDates(
      Math.min(7, data.settings.bookingRules.maxBookingDaysAhead + 1)
    ),
    [data.settings.bookingRules.maxBookingDaysAhead]
  );
  const minimumBookingDate = getDateTextInTimeZone(new Date(), data.settings.timezone);
  const maximumBookingDate = useMemo(() => (
    addDaysToDateText(
      getDateTextInTimeZone(new Date(), data.settings.timezone),
      data.settings.bookingRules.maxBookingDaysAhead
    )
  ), [data.settings.bookingRules.maxBookingDaysAhead, data.settings.timezone]);
  const bookingConfirmed = bookingResult
    ? bookingResult.appointment.depositStatus === 'paid' ||
      bookingResult.appointment.depositStatus === 'waived'
    : false;
  async function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading(true);
    try {
      if (editingClientId) {
        await updateClient(editingClientId, clientForm);
      } else {
        await createClient(clientForm);
      }
      setClientForm(createEmptyClientForm());
      setEditingClientId(null);
      setModal(null);
      await data.refreshData(false);
      setActiveTab('clients');
      showToast(editingClientId ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }
  async function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading(true);
    try {
      await createAppointment({
        clientId: appointmentForm.clientId,
        serviceId: appointmentForm.serviceId,
        professionalId: appointmentForm.professionalId,
        date: (
          businessDateTimeInputToUtc(appointmentForm.date, data.settings.timezone)
          ?? new Date(appointmentForm.date)
        ).toISOString(),
        notes: appointmentForm.notes,
        isFitIn: appointmentForm.mode === 'fit_in',
        conflictConfirmed: appointmentForm.conflictConfirmed,
        fitInReason: appointmentForm.fitInReason,
        recurrence: appointmentForm.recurrenceEnabled ? {
          frequency: appointmentForm.recurrenceFrequency,
          count: Number(appointmentForm.recurrenceCount),
          intervalWeeks: Number(appointmentForm.recurrenceIntervalWeeks),
          weekdays: appointmentForm.recurrenceWeekdays,
          serviceIds: appointmentForm.recurrenceServiceIds.length
            ? appointmentForm.recurrenceServiceIds
            : [appointmentForm.serviceId]
        } : undefined
      });
      setAppointmentForm(createEmptyAppointmentForm());
      setModal(null);
      await data.refreshData(false);
      setActiveTab('agenda');
      showToast('Agendamento criado. O sinal ficou aguardando pagamento.');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }
  async function requestStatusChange(
    appointment: Appointment,
    status: AppointmentStatus,
    options: { confirmEarlyStart?: boolean; reason?: string } = {}
  ) {
    if (status === 'completed') {
      setSelectedAppointment(appointment);
      const defaultPaymentMethod = data.settings.paymentMethods.find(
        item => item.active
      )?.method ?? 'pix';
      setCompletionForm({
        serviceId: appointment.serviceId,
        price: String(appointment.price),
        paymentMethod: appointment.paymentMethod ?? defaultPaymentMethod,
        cardFee: String(appointment.cardFee || 0),
        notes: appointment.notes ?? ''
      });
      setModal('complete');
      return;
    }
    setActionLoading(true);
    try {
      await updateAppointmentStatus(appointment.id, status, options);
      await data.refreshData(false);
      showToast(
        `Atendimento marcado como ${
          appointmentStatusLabels[status].toLocaleLowerCase('pt-BR')
        }.`
      );
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }
  async function submitCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAppointment) return;
    setActionLoading(true);
    try {
      await updateAppointmentStatus(selectedAppointment.id, 'completed', {
        serviceId: completionForm.serviceId,
        price: Number(completionForm.price),
        paymentMethod: completionForm.paymentMethod,
        cardFee: Number(completionForm.cardFee),
        notes: completionForm.notes
      });
      setSelectedAppointment(null);
      setModal(null);
      await data.refreshData(false);
      showToast('Atendimento concluído e lançado no faturamento.');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }
  async function toggleRecurrence(appointment: Appointment, action: 'pause' | 'resume') {
    setActionLoading(true);
    try {
      await updateRecurrenceState(appointment.id, action);
      await data.refreshData(false);
      showToast(action === 'pause' ? 'Recorrência pausada.' : 'Recorrência retomada.');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }


  async function addWaitlistEntry(input: {
    clientId: string;
    serviceId: string;
    professionalId?: string;
    desiredFrom: string;
    desiredTo: string;
    notes?: string;
  }) {
    setActionLoading(true);
    try {
      await createWaitlistEntry(input);
      await data.refreshData(false);
      showToast('Cliente adicionado à lista de espera.');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }

  async function changeWaitlistStatus(id: string, status: import('../domain/types').WaitlistStatus) {
    setActionLoading(true);
    try {
      await updateWaitlistStatus(id, status);
      await data.refreshData(false);
      showToast(status === 'contacted' ? 'Contato registrado na lista de espera.' : 'Lista de espera atualizada.');
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }

  function closeCompletionModal() {
    setModal(null);
    setSelectedAppointment(null);
  }
  const peripheralActions = createPeripheralActions({
    settings: data.settings,
    expenseForm,
    setExpenseForm,
    bookingForm,
    setBookingForm,
    bookingResult,
    setBookingResult,
    availability,
    selectedClientId,
    message,
    setMessage,
    setModal,
    setActiveTab,
    setActionLoading,
    refreshData: data.refreshData,
    showToast
  });

  const agendaActions = createAgendaActions({
    data,
    appointmentForm,
    scheduleBlockForm,
    pastServiceForm,
    selectedAppointment,
    setAppointmentForm,
    setScheduleBlockForm,
    setPastServiceForm,
    setSelectedAppointment,
    setModal,
    setActionLoading,
    showToast
  });
  function openAppointmentInAgenda(appointmentId: string) {
    setAgendaNavigationRequest({ appointmentId, nonce: Date.now() });
    setActiveTab('agenda');
  }

  function consumeAgendaNavigationRequest() {
    setAgendaNavigationRequest(null);
  }

  function openNewClient() {
    setEditingClientId(null);
    setClientForm(createEmptyClientForm());
    setModal('client');
  }

  function openClientEdit(client: import('../domain/types').Client) {
    setEditingClientId(client.id);
    setClientForm({ name: client.name, phone: client.phone, email: client.email ?? '' });
    setModal('client');
  }

  function openWhatsAppForClient(clientId: string) {
    const client = data.clients.find(item => item.id === clientId);
    const digits = client?.phone.replace(/\D/g, '') ?? '';
    if (digits.length < 10) {
      showToast('Este cliente não possui um telefone válido para WhatsApp.');
      return;
    }
    const phone = digits.startsWith('55') ? digits : `55${digits}`;
    window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
  }
  return {
    configurationOpen,
    setConfigurationOpen,
    data,
    theme,
    setTheme,
    toggleTheme,
    toast,
    runToastAction,
    activeTab,
    setActiveTab,
    modal,
    setModal,
    actionLoading,
    search,
    setSearch,
    message,
    setMessage,
    selectedClientId,
    setSelectedClientId,
    selectedAppointment,
    agendaNavigationRequest,
    consumeAgendaNavigationRequest,
    openAppointmentInAgenda,
    bookingResult,
    paymentConfirmationOpen,
    setPaymentConfirmationOpen,
    clientForm,
    setClientForm,
    editingClientId,
    appointmentForm,
    setAppointmentForm,
    expenseForm,
    setExpenseForm,
    scheduleBlockForm,
    setScheduleBlockForm,
    pastServiceForm,
    setPastServiceForm,
    completionForm,
    setCompletionForm,
    bookingForm,
    setBookingForm,
    availability,
    filteredClients,
    upcomingAppointments,
    selectedAdminService,
    selectedBookingService,
    bookingDateOptions,
    minimumBookingDate,
    maximumBookingDate,
    bookingConfirmed,
    submitClient,
    openNewClient,
    openClientEdit,
    submitAppointment,
    requestStatusChange,
    submitCompletion,
    toggleRecurrence,
    addWaitlistEntry,
    changeWaitlistStatus,
    submitExpense: peripheralActions.submitExpense,
    submitScheduleBlock: agendaActions.submitScheduleBlock,
    submitPastService: agendaActions.submitPastService,
    removeExpense: peripheralActions.removeExpense,
    removeScheduleBlockById: agendaActions.removeScheduleBlockById,
    submitReschedule: agendaActions.submitReschedule,
    approveRetroactive: agendaActions.approveRetroactive,
    rejectRetroactive: agendaActions.rejectRetroactive,
    submitPublicBooking: peripheralActions.submitPublicBooking,
    resetPublicBooking: peripheralActions.resetPublicBooking,
    sendMessage: peripheralActions.sendMessage,
    closeCompletionModal,
    openAppointmentAt: agendaActions.openAppointmentAt,
    openScheduleBlockAt: agendaActions.openScheduleBlockAt,
    openPastService: agendaActions.openPastService,
    openReschedule: agendaActions.openReschedule,
    openWhatsAppForClient
  };
}
