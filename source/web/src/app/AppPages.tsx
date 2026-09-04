import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { AppTab } from './navigation';
import type { AgendaNavigationRequest } from '../domain/agenda.types';
import type { BookingFormState } from '../domain/forms';
import type {
  Appointment,
  AppointmentStatus,
  AuthSession,
  AvailabilitySlot,
  BusinessSettings,
  Client,
  DashboardData,
  Expense,
  Professional,
  PublicBookingResult,
  RetroactiveServiceRequest,
  ScheduleBlock,
  Service,
  WaitlistEntry,
  WaitlistStatus
} from '../domain/types';
import { AgendaPage } from '../features/agenda/AgendaPage';
import { PublicBookingPage } from '../features/booking/PublicBookingPage';
import { ClientsPage } from '../features/clients/ClientsPage';
import { FinancePage } from '../features/finance/FinancePage';
import { OverviewPage } from '../features/overview/OverviewPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { WhatsAppPage } from '../features/whatsapp/WhatsAppPage';

interface AppPagesProps {
  activeTab: AppTab;
  settings: BusinessSettings;
  dashboard: DashboardData | null;
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  clients: Client[];
  filteredClients: Client[];
  services: Service[];
  professionals: Professional[];
  expenses: Expense[];
  scheduleBlocks: ScheduleBlock[];
  retroactiveRequests: RetroactiveServiceRequest[];
  waitlistEntries: WaitlistEntry[];
  search: string;
  message: string;
  selectedClientId: string;
  actionLoading: boolean;
  bookingForm: BookingFormState;
  setBookingForm: Dispatch<SetStateAction<BookingFormState>>;
  bookingResult: PublicBookingResult | null;
  bookingConfirmed: boolean;
  selectedBookingService: Service | undefined;
  bookingDateOptions: Date[];
  minimumBookingDate: string;
  maximumBookingDate: string;
  availabilitySlots: AvailabilitySlot[];
  availabilityLoading: boolean;
  availabilityClosed: boolean;
  availabilityError: string;
  selectedBookingSlot: AvailabilitySlot | null;
  onNavigate: (tab: AppTab) => void;
  onNewAppointmentAt: (date?: string, professionalId?: string) => void;
  onNewBlockAt: (date?: string, professionalId?: string) => void;
  onRegisterPastService: () => void;
  onOpenWhatsApp: (clientId: string) => void;
  onOpenModal: (modal: 'client' | 'appointment' | 'expense') => void;
  onEditClient: (client: Client) => void;
  onSearchChange: (value: string) => void;
  onOpenAppointment: (appointmentId: string) => void;
  agendaNavigationRequest: AgendaNavigationRequest | null;
  onAgendaNavigationConsumed: () => void;
  onChangeStatus: (
    appointment: Appointment,
    status: AppointmentStatus,
    options?: { confirmEarlyStart?: boolean; reason?: string }
  ) => void;
  onToggleRecurrence: (appointment: Appointment, action: 'pause' | 'resume') => void;
  onReschedule: (appointment: Appointment) => void;
  onDeleteBlock: (block: ScheduleBlock) => void;
  onApproveRetroactive: (
    item: RetroactiveServiceRequest,
    options?: { confirmConflict?: boolean; conflictJustification?: string }
  ) => void;
  onRejectRetroactive: (item: RetroactiveServiceRequest, reason: string) => void;
  onCreateWaitlist: (input: {
    clientId: string;
    serviceId: string;
    professionalId?: string;
    desiredFrom: string;
    desiredTo: string;
    notes?: string;
  }) => void;
  onWaitlistStatusChange: (entry: WaitlistEntry, status: WaitlistStatus) => void;
  onDeleteExpense: (expense: Expense) => void;
  onClientChange: (clientId: string) => void;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onSelectBookingSlot: (slot: AvailabilitySlot | null) => void;
  onSubmitBooking: (event: FormEvent<HTMLFormElement>) => void;
  onOpenBookingConfirmation: () => void;
  onResetBooking: () => void;
  onEditConfiguration: () => void;
  onRefreshData: () => Promise<void> | void;
  session: AuthSession;
  accountSubmitting: boolean;
  accountError: string;
  onAddBusiness: (businessName: string) => Promise<boolean>;
  onSwitchBusiness: (businessId: string) => Promise<boolean>;
}

export function AppPages(props: AppPagesProps) {
  if (props.activeTab === 'overview') {
    return (
      <OverviewPage
        settings={props.settings}
        dashboard={props.dashboard}
        appointments={props.appointments}
        clients={props.clients}
        expenses={props.expenses}
        services={props.services}
        professionals={props.professionals}
        session={props.session}
        onNavigate={props.onNavigate}
        onNewAppointmentAt={props.onNewAppointmentAt}
        onNewClient={() => props.onOpenModal('client')}
        onNewExpense={() => props.onOpenModal('expense')}
        onOpenWhatsApp={props.onOpenWhatsApp}
        onOpenAppointment={props.onOpenAppointment}
        onChangeStatus={props.onChangeStatus}
      />
    );
  }

  if (props.activeTab === 'agenda') {
    return (
      <AgendaPage
        settings={props.settings}
        appointments={props.appointments}
        clients={props.clients}
        services={props.services}
        professionals={props.professionals}
        scheduleBlocks={props.scheduleBlocks}
        retroactiveRequests={props.retroactiveRequests}
        waitlistEntries={props.waitlistEntries}
        role={props.session.role}
        currentUserId={props.session.user.id}
        actionLoading={props.actionLoading}
        onNewAppointmentAt={props.onNewAppointmentAt}
        onNewBlockAt={props.onNewBlockAt}
        onRegisterPastService={props.onRegisterPastService}
        onOpenWhatsApp={props.onOpenWhatsApp}
        onChangeStatus={props.onChangeStatus}
        onToggleRecurrence={props.onToggleRecurrence}
        onReschedule={props.onReschedule}
        onDeleteBlock={props.onDeleteBlock}
        onApproveRetroactive={props.onApproveRetroactive}
        onRejectRetroactive={props.onRejectRetroactive}
        onCreateWaitlist={props.onCreateWaitlist}
        onWaitlistStatusChange={props.onWaitlistStatusChange}
        onRefreshData={props.onRefreshData}
        navigationRequest={props.agendaNavigationRequest}
        onNavigationConsumed={props.onAgendaNavigationConsumed}
      />
    );
  }

  if (props.activeTab === 'clients') {
    return (
      <ClientsPage
        clients={props.clients}
        appointments={props.appointments}
        search={props.search}
        onSearchChange={props.onSearchChange}
        onNewClient={() => props.onOpenModal('client')}
        onEditClient={props.onEditClient}
        onOpenAppointment={props.onOpenAppointment}
      />
    );
  }

  if (
    (props.activeTab === 'finance-revenue' || props.activeTab === 'finance-expenses')
    && (props.session.role === 'owner' || props.session.role === 'manager')
  ) {
    return (
      <FinancePage
        view={props.activeTab === 'finance-expenses' ? 'expenses' : 'revenue'}
        timeZone={props.settings.timezone}
        appointments={props.appointments}
        expenses={props.expenses}
        actionLoading={props.actionLoading}
        onNewExpense={() => props.onOpenModal('expense')}
        onDeleteExpense={props.onDeleteExpense}
        onOpenAppointment={props.onOpenAppointment}
      />
    );
  }

  if (props.activeTab === 'whatsapp') {
    return (
      <WhatsAppPage
        clients={props.clients}
        selectedClientId={props.selectedClientId}
        message={props.message}
        actionLoading={props.actionLoading}
        onClientChange={props.onClientChange}
        onMessageChange={props.onMessageChange}
        onSend={props.onSendMessage}
      />
    );
  }

  if (props.activeTab === 'settings' && (props.session.role === 'owner' || props.session.role === 'manager')) {
    return (
      <SettingsPage
        settings={props.settings}
        services={props.services}
        professionals={props.professionals}
        session={props.session}
        accountSubmitting={props.accountSubmitting}
        accountError={props.accountError}
        onEdit={props.onEditConfiguration}
        onAddBusiness={props.onAddBusiness}
        onSwitchBusiness={props.onSwitchBusiness}
      />
    );
  }

  return (
    <PublicBookingPage
      settings={props.settings}
      services={props.services.filter(service => (
        service.active && service.onlineBookingEnabled
      ))}
      professionals={props.professionals.filter(professional => (
        professional.active &&
        professional.servesClients &&
        professional.acceptsOnlineBooking &&
        professional.publicVisible
      ))}
      bookingForm={props.bookingForm}
      setBookingForm={props.setBookingForm}
      bookingResult={props.bookingResult}
      bookingConfirmed={props.bookingConfirmed}
      selectedBookingService={props.selectedBookingService}
      bookingDateOptions={props.bookingDateOptions}
      minimumBookingDate={props.minimumBookingDate}
      maximumBookingDate={props.maximumBookingDate}
      availabilitySlots={props.availabilitySlots}
      availabilityLoading={props.availabilityLoading}
      availabilityClosed={props.availabilityClosed}
      availabilityError={props.availabilityError}
      selectedBookingSlot={props.selectedBookingSlot}
      actionLoading={props.actionLoading}
      allowDepositSimulation={false}
      onSelectBookingSlot={props.onSelectBookingSlot}
      onSubmit={props.onSubmitBooking}
      onOpenConfirmation={props.onOpenBookingConfirmation}
      onReset={props.onResetBooking}
    />
  );
}
