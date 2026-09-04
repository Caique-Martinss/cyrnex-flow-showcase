import { useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { ErrorState, LoadingState } from '../components/ui/PageState';
import type { AuthSession, OnboardingState } from '../domain/types';
import { AuthPage } from '../features/auth/AuthPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { PlatformAdminApp } from '../features/platform-admin/PlatformAdminApp';
import { SubscriptionBlockedPage } from '../features/subscription/SubscriptionBlockedPage';
import { SubscriptionNotice } from '../features/subscription/SubscriptionNotice';
import { PublicAppointmentApp } from '../features/public-page/PublicAppointmentApp';
import { PublicCustomerApp } from '../features/public-page/PublicCustomerApp';
import { useAuthSession } from '../hooks/useAuthSession';
import { useBusinessSubscription } from '../hooks/useBusinessSubscription';
import { AppModals } from './AppModals';
import { AppPages } from './AppPages';
import { useAppController } from './useAppController';

export default function App() {
  if (platformAdminFromLocation()) return <PlatformAdminApp />;
  const appointmentAccess = publicAppointmentFromLocation();
  if (appointmentAccess) {
    return <PublicAppointmentApp {...appointmentAccess} />;
  }
  const publicSlug = publicSlugFromLocation();
  if (publicSlug) return <PublicCustomerApp slug={publicSlug} />;
  return <PrivateApp />;
}

function PrivateApp() {
  const auth = useAuthSession();

  if (auth.loading) {
    return <LoadingState />;
  }

  if (!auth.session) {
    return (
      <AuthPage
        submitting={auth.submitting}
        error={auth.error}
        onLogin={auth.signIn}
        onRegister={auth.signUp}
        onClearError={() => auth.setError('')}
      />
    );
  }

  return (
    <BusinessSubscriptionGate
      key={auth.session.business.id}
      session={auth.session}
      accountSubmitting={auth.submitting}
      accountError={auth.error}
      onAddBusiness={auth.addBusiness}
      onSwitchBusiness={auth.changeBusiness}
      onLogout={() => void auth.signOut()}
    />
  );
}

function BusinessSubscriptionGate(props: AuthenticatedAppProps) {
  const access = useBusinessSubscription(props.session.business.id);
  if (access.loading) return <LoadingState />;
  if (access.error || !access.subscription) {
    return <ErrorState message={access.error || 'Não foi possível validar a assinatura.'} onRetry={access.refresh} />;
  }
  if (!access.subscription.allowed) {
    return (
      <SubscriptionBlockedPage
        session={props.session}
        subscription={access.subscription}
        onSwitchBusiness={props.onSwitchBusiness}
        onLogout={props.onLogout}
      />
    );
  }
  return (
    <>
      <SubscriptionNotice subscription={access.subscription} />
      <AuthenticatedApp {...props} />
    </>
  );
}

interface AuthenticatedAppProps {
  session: AuthSession;
  accountSubmitting: boolean;
  accountError: string;
  onAddBusiness: (businessName: string) => Promise<boolean>;
  onSwitchBusiness: (businessId: string) => Promise<boolean>;
  onLogout: () => void;
}

function AuthenticatedApp({
  session,
  accountSubmitting,
  accountError,
  onAddBusiness,
  onSwitchBusiness,
  onLogout
}: AuthenticatedAppProps) {
  const controller = useAppController(session.role, session.user.id);
  const { data } = controller;
  const publicPageConfigurationRequested = requestedPublicPageConfiguration();

  useEffect(() => {
    if (!publicPageConfigurationRequested) return;
    if (session.role !== 'owner' && session.role !== 'manager') return;
    controller.setConfigurationOpen(true);
  }, [publicPageConfigurationRequested, session.role, controller.setConfigurationOpen]);

  if (data.loading) {
    return <LoadingState />;
  }

  if (data.pageError) {
    return (
      <ErrorState
        message={data.pageError}
        onRetry={() => void data.refreshData()}
      />
    );
  }

  const onboardingState: OnboardingState = {
    settings: data.settings,
    services: data.services,
    professionals: data.professionals
  };

  if (
    (data.settings.onboarding.status !== 'completed' || controller.configurationOpen) &&
    (session.role === 'owner' || session.role === 'manager')
  ) {
    return (
      <OnboardingPage
        initialState={onboardingState}
        mode={data.settings.onboarding.status === 'completed' ? 'edit' : 'initial'}
        initialStep={publicPageConfigurationRequested ? 8 : undefined}
        onCancel={data.settings.onboarding.status === 'completed'
          ? () => {
              controller.setConfigurationOpen(false);
              clearPublicPageConfigurationRequest();
              void data.refreshData(false);
            }
          : undefined}
        onComplete={state => {
          data.applyOnboardingState(state);
          controller.setConfigurationOpen(false);
          controller.setActiveTab('overview');
          clearPublicPageConfigurationRequest();
          void data.refreshData(false);
        }}
        theme={controller.theme}
        onThemeChange={controller.setTheme}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        settings={data.settings}
        session={session}
        activeTab={controller.activeTab}
        upcomingAppointments={data.dashboard?.upcomingAppointments ?? 0}
        onNavigate={controller.setActiveTab}
        onSwitchBusiness={onSwitchBusiness}
        onLogout={onLogout}
      />

      <main className="main-content">
        <Topbar
          settings={data.settings}
          theme={controller.theme}
          liveSyncing={data.liveSyncing}
          syncError={data.syncError}
          lastSyncedAt={data.lastSyncedAt}
          onThemeChange={controller.setTheme}
          onOpenPublicPage={() => openPublicPage(data.settings.bookingSlug)}
          onNewAppointment={() => controller.openAppointmentAt()}
          onRefresh={() => void data.refreshLiveData()}
        />

        <div className="management-workspace">
          <AppPages
          activeTab={controller.activeTab}
          settings={data.settings}
          dashboard={data.dashboard}
          appointments={data.appointments}
          upcomingAppointments={controller.upcomingAppointments}
          clients={data.clients}
          filteredClients={controller.filteredClients}
          services={data.services}
          professionals={data.professionals}
          expenses={data.expenses}
          scheduleBlocks={data.scheduleBlocks}
          retroactiveRequests={data.retroactiveRequests}
          waitlistEntries={data.waitlistEntries}
          search={controller.search}
          message={controller.message}
          selectedClientId={controller.selectedClientId}
          actionLoading={controller.actionLoading}
          bookingForm={controller.bookingForm}
          setBookingForm={controller.setBookingForm}
          bookingResult={controller.bookingResult}
          bookingConfirmed={controller.bookingConfirmed}
          selectedBookingService={controller.selectedBookingService}
          bookingDateOptions={controller.bookingDateOptions}
          minimumBookingDate={controller.minimumBookingDate}
          maximumBookingDate={controller.maximumBookingDate}
          availabilitySlots={controller.availability.slots}
          availabilityLoading={controller.availability.loading}
          availabilityClosed={controller.availability.closed}
          availabilityError={controller.availability.error}
          selectedBookingSlot={controller.availability.selectedSlot}
          onNavigate={controller.setActiveTab}
          onNewAppointmentAt={controller.openAppointmentAt}
          onNewBlockAt={controller.openScheduleBlockAt}
          onRegisterPastService={controller.openPastService}
          onReschedule={controller.openReschedule}
          onDeleteBlock={block => void controller.removeScheduleBlockById(block.id)}
          onApproveRetroactive={(item, options) => void controller.approveRetroactive(item.id, options)}
          onRejectRetroactive={(item, reason) => {
            void controller.rejectRetroactive(item.id, reason);
          }}
          onCreateWaitlist={input => void controller.addWaitlistEntry(input)}
          onWaitlistStatusChange={(entry, status) => void controller.changeWaitlistStatus(entry.id, status)}
          onOpenWhatsApp={controller.openWhatsAppForClient}
          onOpenModal={modal => modal === 'client' ? controller.openNewClient() : controller.setModal(modal)}
          onEditClient={controller.openClientEdit}
          onSearchChange={controller.setSearch}
          onOpenAppointment={controller.openAppointmentInAgenda}
          agendaNavigationRequest={controller.agendaNavigationRequest}
          onAgendaNavigationConsumed={controller.consumeAgendaNavigationRequest}
          onChangeStatus={(appointment, status, options) => {
            void controller.requestStatusChange(appointment, status, options);
          }}
          onToggleRecurrence={(appointment, action) => {
            void controller.toggleRecurrence(appointment, action);
          }}
          onDeleteExpense={expense => void controller.removeExpense(expense)}
          onClientChange={controller.setSelectedClientId}
          onMessageChange={controller.setMessage}
          onSendMessage={() => void controller.sendMessage()}
          onSelectBookingSlot={controller.availability.setSelectedSlot}
          onSubmitBooking={controller.submitPublicBooking}
          onOpenBookingConfirmation={() => controller.setPaymentConfirmationOpen(true)}
          onResetBooking={controller.resetPublicBooking}
          onEditConfiguration={() => controller.setConfigurationOpen(true)}
          onRefreshData={() => data.refreshData(false)}
          session={session}
          accountSubmitting={accountSubmitting}
          accountError={accountError}
          onAddBusiness={onAddBusiness}
          onSwitchBusiness={onSwitchBusiness}
          />
        </div>
      </main>

      <AppModals
        modal={controller.modal}
        settings={data.settings}
        clientForm={controller.clientForm}
        setClientForm={controller.setClientForm}
        appointmentForm={controller.appointmentForm}
        setAppointmentForm={controller.setAppointmentForm}
        expenseForm={controller.expenseForm}
        setExpenseForm={controller.setExpenseForm}
        scheduleBlockForm={controller.scheduleBlockForm}
        setScheduleBlockForm={controller.setScheduleBlockForm}
        pastServiceForm={controller.pastServiceForm}
        setPastServiceForm={controller.setPastServiceForm}
        completionForm={controller.completionForm}
        setCompletionForm={controller.setCompletionForm}
        clients={data.clients}
        services={data.services}
        professionals={data.professionals}
        selectedAdminService={controller.selectedAdminService}
        selectedAppointment={controller.selectedAppointment}
        role={session.role}
        actionLoading={controller.actionLoading}
        editingClient={Boolean(controller.editingClientId)}
        bookingResult={controller.bookingResult}
        paymentConfirmationOpen={controller.paymentConfirmationOpen}
        onSubmitClient={controller.submitClient}
        onSubmitAppointment={controller.submitAppointment}
        onSubmitExpense={controller.submitExpense}
        onSubmitScheduleBlock={controller.submitScheduleBlock}
        onSubmitPastService={controller.submitPastService}
        onSubmitReschedule={controller.submitReschedule}
        onSubmitCompletion={controller.submitCompletion}
        onCloseModal={() => controller.setModal(null)}
        onCloseCompletion={controller.closeCompletionModal}
        onClosePaymentConfirmation={() => controller.setPaymentConfirmationOpen(false)}
      />

      {controller.toast ? (
        <div className="toast" role="status">
          <span>{controller.toast.message}</span>
          {controller.toast.actionLabel && controller.toast.onAction ? (
            <button type="button" onClick={() => void controller.runToastAction()}>
              {controller.toast.actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


function publicAppointmentFromLocation(): { slug: string; token: string } | null {
  const match = /^\/b\/([^/?#]+)\/agendamento\/([^/?#]+)\/?$/.exec(
    window.location.pathname
  );
  if (!match) return null;
  try {
    const slug = decodeURIComponent(match[1]).trim().toLowerCase();
    const token = decodeURIComponent(match[2]).trim();
    return slug && token ? { slug, token } : null;
  } catch {
    return null;
  }
}

function publicSlugFromLocation(): string | null {
  const match = /^\/b\/([^/?#]+)\/?$/.exec(window.location.pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

function openPublicPage(slug: string) {
  const url = new URL(`/b/${encodeURIComponent(slug)}`, window.location.origin);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}


function requestedPublicPageConfiguration(): boolean {
  return new URLSearchParams(window.location.search).get('configure') === 'public-page';
}

function clearPublicPageConfigurationRequest() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('configure')) return;
  url.searchParams.delete('configure');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function platformAdminFromLocation(): boolean {
  return window.location.pathname === '/admin'
    || window.location.pathname.startsWith('/admin/');
}
