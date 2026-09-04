import { useEffect, useMemo, useState } from 'react';
import type {
  Appointment,
  AppointmentStatus,
  BusinessSettings,
  Client,
  MemberRole,
  Professional,
  RetroactiveServiceRequest,
  ScheduleBlock,
  Service,
  WaitlistEntry,
  WaitlistStatus
} from '../../domain/types';
import type { AgendaNavigationRequest } from '../../domain/agenda.types';
import { getDateTextInTimeZone } from '../../utils/businessTime';
import { appointmentStatusLabels } from '../../app/constants';
import { AgendaDayView } from './AgendaDayView';
import { AgendaMonthView } from './AgendaMonthView';
import { AgendaToolbar } from './AgendaToolbar';
import { AgendaWeekView } from './AgendaWeekView';
import { AppointmentInspector } from './AppointmentInspector';
import { DaySummary } from './DaySummary';
import { NextAvailabilityPanel } from './NextAvailabilityPanel';
import { RetroactiveApprovalPanel } from './RetroactiveApprovalPanel';
import { WaitlistPanel } from './WaitlistPanel';
import { addDaysText, type AgendaView, fromDateText, getMaximumBookingDate, toDateText } from './agenda.helpers';

interface AgendaPageProps {
  settings: BusinessSettings;
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  professionals: Professional[];
  scheduleBlocks: ScheduleBlock[];
  retroactiveRequests: RetroactiveServiceRequest[];
  waitlistEntries: WaitlistEntry[];
  role: MemberRole;
  currentUserId: string;
  actionLoading: boolean;
  onNewAppointmentAt: (date?: string, professionalId?: string) => void;
  onNewBlockAt: (date?: string, professionalId?: string) => void;
  onRegisterPastService: () => void;
  onOpenWhatsApp: (clientId: string) => void;
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
  onRefreshData: () => Promise<void> | void;
  navigationRequest: AgendaNavigationRequest | null;
  onNavigationConsumed: () => void;
}

export function AgendaPage(props: AgendaPageProps) {
  const [view, setView] = useState<AgendaView>('day');
  const [selectedDate, setSelectedDate] = useState(getDateTextInTimeZone(new Date(), props.settings.timezone));
  const [professionalId, setProfessionalId] = useState('all');
  const [status, setStatus] = useState<AppointmentStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('agenda-focus-mode') === 'true');
  const activeProfessionals = props.professionals.filter(item => item.active && item.servesClients);
  const visibleProfessionals = professionalId === 'all'
    ? activeProfessionals
    : activeProfessionals.filter(item => item.id === professionalId);
  const visibleAppointmentIds = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    return new Set(props.appointments.filter(item => {
      if (professionalId !== 'all' && item.professionalId !== professionalId) return false;
      if (status !== 'all' && item.status !== status) return false;
      if (!query) return true;
      const text = [item.client?.name, item.client?.phone, item.serviceName, item.professionalName, item.notes]
        .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      return text.includes(query);
    }).map(item => item.id));
  }, [props.appointments, professionalId, status, search]);
  const whatsappEnabled = props.settings.modules.some(item => item.key === 'whatsapp' && item.enabled);
  const filterLabel = [
    status !== 'all' ? appointmentStatusLabels[status] : '',
    search.trim() ? `Busca: ${search.trim()}` : ''
  ].filter(Boolean).join(' • ');

  useEffect(() => {
    if (!selectedAppointment) return;
    const fresh = props.appointments.find(item => item.id === selectedAppointment.id);
    if (!fresh) {
      setSelectedAppointment(null);
      return;
    }
    if (fresh.date !== selectedAppointment.date) {
      setView('day');
      setSelectedDate(getDateTextInTimeZone(new Date(fresh.date), props.settings.timezone));
    }
    if (fresh !== selectedAppointment) setSelectedAppointment(fresh);
  }, [props.appointments, selectedAppointment, props.settings.timezone]);


  useEffect(() => {
    if (!props.navigationRequest) return;
    const target = props.appointments.find(
      item => item.id === props.navigationRequest?.appointmentId
    );
    if (!target) {
      props.onNavigationConsumed();
      return;
    }

    setView('day');
    setSelectedDate(getDateTextInTimeZone(new Date(target.date), props.settings.timezone));
    setProfessionalId('all');
    setStatus('all');
    setSearch('');
    setSelectedAppointment(target);
    props.onNavigationConsumed();
  }, [
    props.navigationRequest,
    props.appointments,
    props.settings.timezone,
    props.onNavigationConsumed
  ]);

  function movePeriod(direction: -1 | 1) {
    if (view === 'day') setSelectedDate(current => addDaysText(current, direction));
    else if (view === 'week') setSelectedDate(current => addDaysText(current, direction * 7));
    else setSelectedDate(current => moveMonth(current, direction));
    setSelectedAppointment(null);
  }

  function selectDay(dateText: string) {
    setSelectedDate(dateText);
    setView('day');
    setSelectedAppointment(null);
  }

  function clearFilters() {
    setStatus('all');
    setSearch('');
  }

  return (
    <section className="page-section agenda-page">
      <div className="page-title-row agenda-page-title">
        <div>
          <span className="eyebrow">Operação</span>
          <h2>Agenda</h2>
          <p>Organize o dia, encontre vagas e proteja cada alteração importante.</p>
        </div>
        <div className="agenda-primary-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={props.onRegisterPastService}
          >
            Registrar atendimento passado
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => props.onNewBlockAt()}
          >
            Bloquear horário
          </button>
          <button type="button" onClick={() => props.onNewAppointmentAt()}>+ Novo agendamento</button>
        </div>
      </div>

      <div className="agenda-rule-banner">
        <div>
          <span>Antecedência mínima</span>
          <strong>{formatNotice(props.settings.bookingRules.minBookingNoticeMinutes)}</strong>
        </div>
        <div>
          <span>Limite de agendamento</span>
          <strong>
            até {getMaximumBookingDate(props.settings).split('-').reverse().join('/')}
          </strong>
        </div>
        <div>
          <span>Grade da agenda</span>
          <strong>
            {props.settings.businessHours.slotIntervalMinutes} em{' '}
            {props.settings.businessHours.slotIntervalMinutes} min
          </strong>
        </div>
        <div className="agenda-rule-ok">
          <strong>✓ Motor único de disponibilidade</strong>
          <span>Agenda, página pública e busca de vagas consultam as mesmas regras.</span>
        </div>
      </div>

      <RetroactiveApprovalPanel
        requests={props.retroactiveRequests}
        appointments={props.appointments}
        clients={props.clients}
        services={props.services}
        professionals={props.professionals}
        role={props.role}
        currentUserId={props.currentUserId}
        actionLoading={props.actionLoading}
        timeZone={props.settings.timezone}
        onApprove={props.onApproveRetroactive}
        onReject={props.onRejectRetroactive}
      />

      <AgendaToolbar
        view={view}
        selectedDate={selectedDate}
        professionalId={professionalId}
        status={status}
        search={search}
        professionals={activeProfessionals}
        onViewChange={setView}
        onPrevious={() => movePeriod(-1)}
        onNext={() => movePeriod(1)}
        onToday={() => {
          setSelectedDate(getDateTextInTimeZone(new Date(), props.settings.timezone));
          setSelectedAppointment(null);
        }}
        onProfessionalChange={setProfessionalId}
        onStatusChange={setStatus}
        onSearchChange={setSearch}
      />

      <DaySummary
        settings={props.settings}
        dateText={selectedDate}
        appointments={props.appointments}
        professionals={visibleProfessionals}
        blocks={props.scheduleBlocks}
        services={props.services}
        focusMode={focusMode}
        onToggleFocus={() => {
          setFocusMode(current => {
            const next = !current;
            localStorage.setItem('agenda-focus-mode', String(next));
            return next;
          });
        }}
      />

      <div className={`agenda-workspace ${selectedAppointment ? 'with-inspector' : ''}`}>
        <article className="panel agenda-main-panel">
          {view === 'day' ? (
            <AgendaDayView
              settings={props.settings}
              dateText={selectedDate}
              professionals={visibleProfessionals}
              appointments={props.appointments}
              blocks={props.scheduleBlocks}
              services={props.services}
              visibleAppointmentIds={visibleAppointmentIds}
              filterLabel={filterLabel}
              focusMode={focusMode}
              onClearFilters={clearFilters}
              onNewAppointmentAt={props.onNewAppointmentAt}
              onNewBlockAt={props.onNewBlockAt}
              onOpenAppointment={setSelectedAppointment}
              onDeleteBlock={props.onDeleteBlock}
            />
          ) : view === 'week' ? (
            <AgendaWeekView
              settings={props.settings}
              selectedDate={selectedDate}
              appointments={props.appointments.filter(item => visibleAppointmentIds.has(item.id))}
              professionals={visibleProfessionals}
              onSelectDay={selectDay}
            />
          ) : (
            <AgendaMonthView
              settings={props.settings}
              selectedDate={selectedDate}
              appointments={props.appointments.filter(item => visibleAppointmentIds.has(item.id))}
              onSelectDay={selectDay}
            />
          )}
        </article>

        {selectedAppointment ? (
          <AppointmentInspector
            appointment={selectedAppointment}
            appointments={props.appointments}
            waitlistEntries={props.settings.bookingRules.allowWaitlist ? props.waitlistEntries : []}
            clients={props.clients}
            whatsappEnabled={whatsappEnabled}
            actionLoading={props.actionLoading}
            timeZone={props.settings.timezone}
            onClose={() => setSelectedAppointment(null)}
            onWhatsApp={() => props.onOpenWhatsApp(selectedAppointment.clientId)}
            onWhatsAppClient={props.onOpenWhatsApp}
            onReschedule={() => props.onReschedule(selectedAppointment)}
            onChangeStatus={props.onChangeStatus}
            onToggleRecurrence={props.onToggleRecurrence}
            onPaymentReviewed={props.onRefreshData}
          />
        ) : null}
      </div>

      <NextAvailabilityPanel
        settings={props.settings}
        services={props.services}
        professionals={activeProfessionals}
        onNewAppointmentAt={props.onNewAppointmentAt}
      />

      <WaitlistPanel
        settings={props.settings}
        entries={props.settings.bookingRules.allowWaitlist ? props.waitlistEntries : []}
        clients={props.clients}
        services={props.services}
        professionals={activeProfessionals}
        actionLoading={props.actionLoading}
        onCreate={props.onCreateWaitlist}
        onStatusChange={props.onWaitlistStatusChange}
        onOpenWhatsApp={props.onOpenWhatsApp}
      />
    </section>
  );
}

function moveMonth(dateText: string, delta: number): string {
  const current = fromDateText(dateText);
  const next = new Date(current.getFullYear(), current.getMonth() + delta, Math.min(current.getDate(), 28), 12);
  return toDateText(next);
}

function formatNotice(minutes: number): string {
  if (minutes <= 0) return 'Sem mínimo';
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 1440 === 0) return `${minutes / 1440} dia(s)`;
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return `${minutes} min`;
}
