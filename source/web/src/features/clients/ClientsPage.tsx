import { useMemo, useState } from 'react';
import { appointmentStatusLabels } from '../../app/constants';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Appointment, Client } from '../../domain/types';
import {
  currencyFormatter,
  dateOnlyFormatter,
  getInitials
} from '../../utils/formatters';

type ClientFilter = 'all' | 'new' | 'recurring';

interface ClientsPageProps {
  clients: Client[];
  appointments: Appointment[];
  search: string;
  onSearchChange: (value: string) => void;
  onNewClient: () => void;
  onEditClient: (client: Client) => void;
  onOpenAppointment: (appointmentId: string) => void;
}

export function ClientsPage({
  clients,
  appointments,
  search,
  onSearchChange,
  onNewClient,
  onEditClient,
  onOpenAppointment
}: ClientsPageProps) {
  const [filter, setFilter] = useState<ClientFilter>('all');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const visibleClients = useMemo(
    () => filterClients(clients, search, filter),
    [clients, filter, search]
  );
  const stats = useMemo(() => buildClientStats(clients), [clients]);

  return (
    <section className="page-section clients-premium-page">
      <header className="management-hero">
        <div className="management-hero-copy">
          <span className="eyebrow">Relacionamento</span>
          <h2>Clientes</h2>
          <p>
            Sua base organizada para encontrar pessoas rápido e entender quem já
            construiu histórico com a barbearia.
          </p>
        </div>
        <button onClick={onNewClient}>+ Novo cliente</button>
      </header>

      <div className="client-insight-grid">
        <ClientInsight
          label="Base de clientes"
          value={String(stats.total)}
          note="Cadastros ativos na operação"
        />
        <ClientInsight
          label="Novos este mês"
          value={String(stats.newThisMonth)}
          note="Entraram na base no mês atual"
          accent
        />
        <ClientInsight
          label="Clientes recorrentes"
          value={String(stats.recurring)}
          note="Já possuem 2 ou mais atendimentos"
        />
      </div>

      <article className="panel management-premium-panel">
        <div className="clients-toolbar">
          <label className="management-search-field">
            <span>Buscar cliente</span>
            <input
              value={search}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Nome, telefone ou e-mail"
            />
          </label>

          <div className="management-filter-group" aria-label="Filtrar clientes">
            <ClientFilterButton
              active={filter === 'all'}
              label="Todos"
              onClick={() => setFilter('all')}
            />
            <ClientFilterButton
              active={filter === 'new'}
              label="Novos"
              onClick={() => setFilter('new')}
            />
            <ClientFilterButton
              active={filter === 'recurring'}
              label="Recorrentes"
              onClick={() => setFilter('recurring')}
            />
          </div>
        </div>

        <div className="management-list-heading">
          <div>
            <span className="eyebrow">Sua base</span>
            <h3>{visibleClients.length} cliente(s) encontrado(s)</h3>
          </div>
          <span className="management-soft-badge">Atualização automática</span>
        </div>

        {visibleClients.length ? (
          <div className="premium-client-list">
            {visibleClients.map(client => {
              const clientAppointments = appointments
                .filter(item => item.clientId === client.id)
                .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
              const expanded = expandedClientId === client.id;
              return (
                <div className="premium-client-row-shell" key={client.id}>
                  <ClientRow
                    client={client}
                    onEdit={() => onEditClient(client)}
                    appointmentCount={clientAppointments.length}
                    expanded={expanded}
                    onToggleHistory={() => setExpandedClientId(current => current === client.id ? null : client.id)}
                  />
                  {expanded ? (
                    <ClientHistoryPanel
                      appointments={clientAppointments}
                      onOpenAppointment={onOpenAppointment}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Nenhum cliente encontrado"
            text="Altere a busca ou os filtros para encontrar outro cadastro."
          />
        )}
      </article>
    </section>
  );
}

function ClientInsight({
  label,
  value,
  note,
  accent = false
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <article className={`client-insight-card ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function ClientFilterButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`management-filter-button ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ClientRow({
  client,
  onEdit,
  appointmentCount,
  expanded,
  onToggleHistory
}: {
  client: Client;
  onEdit: () => void;
  appointmentCount: number;
  expanded: boolean;
  onToggleHistory: () => void;
}) {
  const status = client.appointments >= 2 ? 'Recorrente' : 'Novo / ocasional';
  const whatsapp = buildWhatsAppUrl(client.phone);

  return (
    <article className="premium-client-row">
      <div className="client-identity-block">
        <span className="premium-avatar">{getInitials(client.name)}</span>
        <div>
          <strong>{client.name}</strong>
          <small>
            Cliente desde {dateOnlyFormatter.format(new Date(client.createdAt))}
          </small>
        </div>
      </div>

      <div className="client-detail-block">
        <span>Contato</span>
        <strong>{client.phone}</strong>
        <small>{client.email ?? 'E-mail não informado'}</small>
      </div>

      <div className="client-detail-block">
        <span>Última visita</span>
        <strong>{formatLastVisit(client.lastVisit)}</strong>
        <small>{client.appointments} atendimento(s)</small>
      </div>

      <div className="client-value-block">
        <span>Total gerado</span>
        <strong>{currencyFormatter.format(client.totalSpend)}</strong>
        <small className="client-status-label">{status}</small>
      </div>

      <div className="client-row-actions">
        {appointmentCount > 0 ? (
          <button type="button" className="client-edit-action" onClick={onToggleHistory}>
            {expanded ? 'Fechar histórico' : 'Atendimentos'}
          </button>
        ) : null}
        <button type="button" className="client-edit-action" onClick={onEdit}>Editar</button>
        {whatsapp ? (
          <a
            className="client-contact-action"
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp ↗
          </a>
        ) : (
          <span className="client-contact-action disabled">Sem WhatsApp</span>
        )}
      </div>
    </article>
  );
}

function ClientHistoryPanel({
  appointments,
  onOpenAppointment
}: {
  appointments: Appointment[];
  onOpenAppointment: (appointmentId: string) => void;
}) {
  const recent = appointments.slice(0, 6);
  if (!recent.length) return null;

  return (
    <div className="client-history-panel">
      <div className="client-history-heading">
        <div>
          <strong>Atendimentos recentes</strong>
          <span>Abra qualquer registro diretamente na Agenda.</span>
        </div>
        <small>{appointments.length} registro(s)</small>
      </div>
      <div className="client-history-list">
        {recent.map(appointment => (
          <button
            type="button"
            key={appointment.id}
            className="client-history-item"
            onClick={() => onOpenAppointment(appointment.id)}
          >
            <span>
              <strong>{appointment.serviceName}</strong>
              <small>
                {new Date(appointment.date).toLocaleDateString('pt-BR')} • {appointment.professionalName}
              </small>
            </span>
            <span className={`status ${appointment.status}`}>
              {appointmentStatusLabels[appointment.status]}
            </span>
            <em>Abrir →</em>
          </button>
        ))}
      </div>
      {appointments.length > recent.length ? (
        <small className="muted-text">Mostrando os {recent.length} registros mais recentes.</small>
      ) : null}
    </div>
  );
}

function filterClients(
  clients: Client[],
  search: string,
  filter: ClientFilter
): Client[] {
  const query = search.trim().toLocaleLowerCase('pt-BR');
  return clients.filter(client => {
    const matchesSearch = !query || [client.name, client.phone, client.email ?? '']
      .some(value => value.toLocaleLowerCase('pt-BR').includes(query));
    if (!matchesSearch) return false;
    if (filter === 'recurring') return client.appointments >= 2;
    if (filter === 'new') return isCurrentMonth(client.createdAt);
    return true;
  });
}

function buildClientStats(clients: Client[]) {
  return {
    total: clients.length,
    newThisMonth: clients.filter(client => isCurrentMonth(client.createdAt)).length,
    recurring: clients.filter(client => client.appointments >= 2).length
  };
}

function isCurrentMonth(value: string): boolean {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function buildWhatsAppUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
}

function formatLastVisit(lastVisit: string | null): string {
  if (!lastVisit) return 'Ainda não visitou';
  return dateOnlyFormatter.format(new Date(`${lastVisit}T12:00:00`));
}
