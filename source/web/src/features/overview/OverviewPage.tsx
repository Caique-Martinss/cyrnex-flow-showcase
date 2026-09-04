import type { CSSProperties } from 'react';
import { appointmentStatusLabels } from '../../app/constants';
import { isModuleEnabled, type AppTab } from '../../app/navigation';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Appointment, AppointmentStatus, AuthSession, BusinessSettings, Client, DashboardData,
  Expense, Professional, Service } from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';
import { ActivityPanel, capitalize, comparisonNote, FinanceLine, FirstDayPanel, OverviewMetric,
  TeamTodayPanel } from './OverviewUi';
import { buildOverviewSnapshot, formatCountdown, formatLongDate, formatTime, getGreeting, getMinutesUntil,
  isBusinessOpen, toLocalDateTimeInput } from './overview.helpers';
import { buildOperationalAttentionItems } from './overview.operations';
interface OverviewPageProps {
  settings: BusinessSettings;
  dashboard: DashboardData | null;
  appointments: Appointment[];
  clients: Client[];
  expenses: Expense[];
  services: Service[];
  professionals: Professional[];
  session: AuthSession;
  onNavigate: (tab: AppTab) => void;
  onNewAppointmentAt: (date?: string) => void;
  onNewClient: () => void;
  onNewExpense: () => void;
  onOpenWhatsApp: (clientId: string) => void;
  onOpenAppointment: (appointmentId: string) => void;
  onChangeStatus: (appointment: Appointment, status: AppointmentStatus) => void;
}
export function OverviewPage({
  settings,
  dashboard,
  appointments,
  clients,
  expenses,
  services,
  professionals,
  session,
  onNavigate,
  onNewAppointmentAt,
  onNewClient,
  onNewExpense,
  onOpenWhatsApp,
  onOpenAppointment,
  onChangeStatus
}: OverviewPageProps) {
  const now = new Date();
  const snapshot = buildOverviewSnapshot(
    settings,
    appointments,
    expenses,
    services,
    now
  );
  const financeEnabled = isModuleEnabled(settings, 'finance');
  const whatsappEnabled = isModuleEnabled(settings, 'whatsapp');
  const returnsEnabled = isModuleEnabled(settings, 'customer_returns');
  const canSeeFinance = session.role === 'owner' || session.role === 'manager';
  const showFinance = financeEnabled && canSeeFinance;
  const open = isBusinessOpen(settings, now);
  const focusAppointment = snapshot.currentAppointment ?? snapshot.nextAppointment;
  const isInProgress = Boolean(snapshot.currentAppointment);
  const next = snapshot.nextAppointment;
  const focusMinutes = focusAppointment ? getMinutesUntil(focusAppointment.date, now) : null;
  const maxMovement = Math.max(1, ...snapshot.movement.map(item => item.count));
  const attentionItems = buildOperationalAttentionItems({
    appointments,
    snapshot,
    dashboard,
    returnsEnabled,
    whatsappEnabled,
    now,
    onNavigate,
    onOpenAppointment
  });
  return (
    <section className="page-section overview-page">
      <header className="overview-hero">
        <div>
          <span className="eyebrow">{settings.businessName}</span>
          <h2>{getGreeting(now, settings.timezone)}, {session.user.displayName.split(' ')[0]} 👋</h2>
          <p>{capitalize(formatLongDate(now, settings.timezone))}</p>
          <div className="overview-status-row">
            <span className={`business-status ${open ? 'open' : 'closed'}`}>
              {open ? '● Aberto agora' : 'Fechado agora'}
            </span>
            {focusAppointment ? (
              <span>
                {isInProgress
                  ? 'Atendimento em andamento'
                  : `Próximo atendimento ${formatCountdown(focusMinutes ?? 0).toLocaleLowerCase('pt-BR')}`}
              </span>
            ) : (
              <span>Nenhum atendimento futuro hoje</span>
            )}
          </div>
        </div>
        <div className="overview-quick-actions">
          <button onClick={() => onNewAppointmentAt()}>+ Novo agendamento</button>
          <button className="secondary-button" onClick={onNewClient}>+ Novo cliente</button>
          {showFinance ? (
            <button className="secondary-button" onClick={onNewExpense}>Registrar despesa</button>
          ) : null}
        </div>
      </header>
      <div className="overview-metrics">
        <OverviewMetric
          label="Agendamentos hoje"
          value={String(snapshot.todayScheduled.length + snapshot.todayCompleted.length)}
          note={comparisonNote(
            snapshot.todayScheduled.length + snapshot.todayCompleted.length,
            snapshot.previousWeekCount,
            'mesmo dia da semana anterior'
          )}
        />
        {showFinance ? (
          <>
            <OverviewMetric
              label="Faturamento previsto"
              value={currencyFormatter.format(snapshot.expectedRevenue)}
              note="Agendados + concluídos de hoje"
            />
            <OverviewMetric
              label="Já recebido"
              value={currencyFormatter.format(snapshot.receivedRevenue)}
              note="Sinais Pix confirmados + valor recebido na conclusão"
            />
          </>
        ) : (
          <>
            <OverviewMetric
              label="Clientes hoje"
              value={String(new Set(snapshot.todayAppointments.map(item => item.clientId)).size)}
              note="Pessoas com atendimento no dia"
            />
            <OverviewMetric
              label="Próximo horário"
              value={next ? formatTime(next.date, settings.timezone) : '—'}
              note={next ? formatCountdown(getMinutesUntil(next.date, now)) : 'Nenhum atendimento futuro hoje'}
            />
          </>
        )}
        <OverviewMetric
          label="Horários livres"
          value={String(snapshot.freeStarts.length)}
          note={`${snapshot.occupancyPercent}% da agenda ocupada`}
        />
      </div>
      <div className="overview-primary-grid">
        <article className="panel next-appointment-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Agora</span>
              <h2>{isInProgress ? 'Atendimento atual' : 'Próximo atendimento'}</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate('agenda')}>
              Ver agenda
            </button>
          </div>
          {focusAppointment ? (
            <div className="next-appointment-card">
              <div className="next-time-block">
                <span>{isInProgress ? 'Em andamento' : formatCountdown(focusMinutes ?? 0)}</span>
                <strong>{formatTime(focusAppointment.date, settings.timezone)}</strong>
                <small>{focusAppointment.durationMinutes} min</small>
              </div>
              <div className="next-client-copy">
                <span className={`status ${focusAppointment.status}`}>
                  {focusAppointment.status === 'in_service'
                    ? 'Em atendimento'
                    : focusAppointment.status === 'arrived'
                      ? 'Cliente chegou'
                      : focusAppointment.status === 'confirmed'
                        ? 'Confirmado'
                        : 'Agendado'}
                </span>
                <h3>{focusAppointment.client?.name ?? 'Cliente removido'}</h3>
                <p>{focusAppointment.serviceName} • {focusAppointment.professionalName}</p>
                {showFinance ? (
                  <strong>{currencyFormatter.format(focusAppointment.price)}</strong>
                ) : null}
                <div className="next-client-actions">
                  <button onClick={() => onOpenAppointment(focusAppointment.id)}>Abrir na agenda</button>
                  {whatsappEnabled && focusAppointment.client ? (
                    <button
                      className="secondary-button"
                      onClick={() => onOpenWhatsApp(focusAppointment.clientId)}
                    >
                      WhatsApp
                    </button>
                  ) : null}
                  {focusAppointment.status === 'scheduled' ? (
                    <button
                      className="secondary-button"
                      onClick={() => onChangeStatus(focusAppointment, 'confirmed')}
                    >Confirmar atendimento</button>
                  ) : focusAppointment.status === 'confirmed' ? (
                    <button
                      className="secondary-button"
                      onClick={() => onChangeStatus(focusAppointment, 'arrived')}
                    >Registrar chegada</button>
                  ) : focusAppointment.status === 'arrived' ? (
                    <button
                      className="secondary-button"
                      onClick={() => onOpenAppointment(focusAppointment.id)}
                    >Abrir para iniciar</button>
                  ) : focusAppointment.status === 'in_service' ? (
                    <button
                      className="secondary-button"
                      onClick={() => onChangeStatus(focusAppointment, 'completed')}
                    >✓ Concluir</button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Seu próximo horário ainda está livre"
              text="Crie um agendamento ou compartilhe a página pública com seus clientes."
            />
          )}
        </article>
        <article className="panel occupancy-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Hoje</span>
              <h2>Ocupação da agenda</h2>
            </div>
          </div>
          <div className="occupancy-content">
            <div
              className="occupancy-ring"
              style={{ '--occupancy': `${snapshot.occupancyPercent * 3.6}deg` } as CSSProperties}
            >
              <div>
                <strong>{snapshot.occupancyPercent}%</strong>
                <span>ocupada</span>
              </div>
            </div>
            <div className="occupancy-copy">
              <strong>{snapshot.todayScheduled.length + snapshot.todayCompleted.length} atendimento(s)</strong>
              <span>{snapshot.freeStarts.length} horário(s) livre(s)</span>
              <span>{snapshot.todayCancelled.length} cancelamento(s)</span>
            </div>
          </div>
        </article>
      </div>
      <div className="overview-secondary-grid">
        <article className="panel day-timeline-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Agenda rápida</span>
              <h2>Seu dia</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate('agenda')}>
              Abrir agenda completa
            </button>
          </div>
          {snapshot.timeline.length ? (
            <div className="day-timeline">
              {snapshot.timeline.map(item => item.kind === 'free' ? (
                <button
                  key={item.id}
                  className="timeline-item free"
                  onClick={() => onNewAppointmentAt(toLocalDateTimeInput(item.startsAt, settings.timezone))}
                >
                  <span className="timeline-time">
                    {formatTime(item.startsAt, settings.timezone)}–{formatTime(item.endsAt, settings.timezone)}
                  </span>
                  <span className="timeline-dot" />
                  <span className="timeline-copy">
                    <strong>+ Horário livre</strong>
                    <small>Clique para criar um agendamento</small>
                  </span>
                </button>
              ) : (
                <button
                  key={item.id}
                  className="timeline-item appointment"
                  onClick={() => item.appointment && onOpenAppointment(item.appointment.id)}
                >
                  <span className="timeline-time">{formatTime(item.startsAt, settings.timezone)}</span>
                  <span className="timeline-dot" />
                  <span className="timeline-copy">
                    <strong>{item.appointment?.client?.name ?? 'Cliente removido'}</strong>
                    <small>{item.appointment?.serviceName} • {item.appointment?.professionalName}</small>
                  </span>
                  <span className={`status ${item.appointment?.status ?? 'scheduled'}`}>
                    {item.appointment ? appointmentStatusLabels[item.appointment.status] : ''}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem expediente configurado para hoje"
              text="A agenda rápida aparecerá nos seus dias normais de atendimento."
            />
          )}
        </article>
        <div className="overview-side-stack">
          <article className="panel attention-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Alertas</span>
                <h2>Precisa da sua atenção</h2>
              </div>
            </div>
            {attentionItems.length ? (
              <div className="attention-list">
                {attentionItems.map(item => (
                  <button key={item.label} onClick={item.action}>
                    <span>!</span>
                    <strong>{item.label}</strong>
                    <em>Resolver →</em>
                  </button>
                ))}
              </div>
            ) : (
              <div className="all-clear-card">
                <strong>✓ Tudo em ordem</strong>
                <span>Nenhuma pendência importante neste momento.</span>
              </div>
            )}
          </article>
          <article className="panel free-times-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Disponibilidade</span>
                <h2>Horários livres</h2>
              </div>
            </div>
            {snapshot.freeStarts.length ? (
              <div className="free-time-chips">
                {snapshot.freeStarts.slice(0, 8).map(item => (
                  <button
                    key={item.toISOString()}
                    onClick={() => onNewAppointmentAt(toLocalDateTimeInput(item, settings.timezone))}
                  >
                    {formatTime(item, settings.timezone)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted-copy">Nenhum bloco livre detectado hoje.</p>
            )}
          </article>
        </div>
      </div>
      <div className="overview-lower-grid">
        {showFinance ? (
          <article className="panel finance-today-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Financeiro</span>
                <h2>Resumo de hoje</h2>
              </div>
              <button className="text-button" onClick={() => onNavigate('finance-revenue')}>
                Ver financeiro
              </button>
            </div>
            <div className="finance-today-list">
              <FinanceLine label="Receita recebida" value={snapshot.receivedRevenue} />
              <FinanceLine label="Despesas" value={snapshot.todayExpenses} negative />
              <FinanceLine label="Taxas de cartão" value={snapshot.todayCardFees} negative />
              <FinanceLine label="Comissões" value={snapshot.todayCommissions} negative />
              <FinanceLine label="Resultado até agora" value={snapshot.todayNet} strong />
            </div>
          </article>
        ) : null}
        <article className="panel movement-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Movimento</span>
              <h2>Horários mais ocupados hoje</h2>
            </div>
          </div>
          {snapshot.movement.some(item => item.count > 0) ? (
            <div className="movement-chart" aria-label="Atendimentos por hora">
              {snapshot.movement.map(item => (
                <div className="movement-bar" key={item.hour} title={`${item.label}: ${item.count}`}>
                  <span
                    style={{ height: `${Math.max(8, (item.count / maxMovement) * 100)}%` }}
                  />
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="O movimento aparecerá aqui"
              text="Assim que houver atendimentos hoje, você verá rapidamente os horários mais cheios."
            />
          )}
        </article>
      </div>
      {settings.operationMode === 'team' && session.role !== 'professional' ? (
        <TeamTodayPanel
          professionals={professionals}
          appointments={snapshot.todayAppointments}
          showFinance={showFinance}
        />
      ) : null}
      <article className="panel daily-summary-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Resumo inteligente</span>
            <h2>Seu dia em uma frase</h2>
          </div>
        </div>
        <p>
          Hoje você tem{' '}
          <strong>
            {snapshot.todayScheduled.length + snapshot.todayCompleted.length} atendimento(s)
          </strong>,
          {' '}<strong>{snapshot.freeStarts.length} horário(s) livre(s)</strong>
          {showFinance ? (
            <>
              {' '}e faturamento previsto de{' '}
              <strong>{currencyFormatter.format(snapshot.expectedRevenue)}</strong>
            </>
          ) : null}.
          {focusAppointment
            ? (
              <>
                {' '}{isInProgress ? 'O atendimento atual é de' : 'O próximo cliente é'}{' '}
                <strong>{focusAppointment.client?.name ?? 'um cliente'}</strong> às{' '}
                <strong>{formatTime(focusAppointment.date, settings.timezone)}</strong>.
              </>
            )
            : ' Não há outro cliente agendado para hoje.'}
        </p>
      </article>
      <ActivityPanel
        appointments={snapshot.todayAppointments}
        expenses={expenses}
        now={now}
        timeZone={settings.timezone}
      />
      {clients.length === 0 && appointments.length === 0 ? (
        <FirstDayPanel
          onNewClient={onNewClient}
          onNewAppointment={() => onNewAppointmentAt()}
        />
      ) : null}
    </section>
  );
}
