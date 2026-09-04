import { useState } from 'react';
import type {
  BusinessSettings,
  Client,
  Professional,
  Service,
  WaitlistEntry,
  WaitlistStatus
} from '../../domain/types';
import { CollapsibleAgendaSection } from './CollapsibleAgendaSection';
import { OfficialDateTimePicker } from './OfficialDateTimePicker';
import { businessDateTimeInputToUtc } from '../../utils/businessTime';

interface WaitlistPanelProps {
  settings: BusinessSettings;
  entries: WaitlistEntry[];
  clients: Client[];
  services: Service[];
  professionals: Professional[];
  actionLoading: boolean;
  onCreate: (input: {
    clientId: string;
    serviceId: string;
    professionalId?: string;
    desiredFrom: string;
    desiredTo: string;
    notes?: string;
  }) => void;
  onStatusChange: (entry: WaitlistEntry, status: WaitlistStatus) => void;
  onOpenWhatsApp: (clientId: string) => void;
}

export function WaitlistPanel(props: WaitlistPanelProps) {
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [desiredFrom, setDesiredFrom] = useState('');
  const [desiredTo, setDesiredTo] = useState('');
  const [notes, setNotes] = useState('');
  const waiting = props.entries.filter(
    item => item.status === 'waiting' || item.status === 'contacted'
  );

  if (!props.settings.bookingRules.allowWaitlist) return null;

  const desiredFromUtc = desiredFrom
    ? businessDateTimeInputToUtc(desiredFrom, props.settings.timezone)
    : null;
  const desiredToUtc = desiredTo
    ? businessDateTimeInputToUtc(desiredTo, props.settings.timezone)
    : null;
  const valid = Boolean(
    clientId
    && serviceId
    && desiredFromUtc
    && desiredToUtc
    && desiredToUtc.getTime() > desiredFromUtc.getTime()
  );

  const submitEntry = () => {
    props.onCreate({
      clientId,
      serviceId,
      professionalId: professionalId || undefined,
      desiredFrom: desiredFromUtc?.toISOString() ?? '',
      desiredTo: desiredToUtc?.toISOString() ?? '',
      notes
    });
    setClientId('');
    setServiceId('');
    setProfessionalId('');
    setDesiredFrom('');
    setDesiredTo('');
    setNotes('');
  };

  return (
    <CollapsibleAgendaSection
      storageKey="waitlist"
      title="Lista de espera"
      eyebrow="Vagas que surgirem"
      summary={`${waiting.length} cliente(s) aguardando`}
      className="waitlist-panel"
    >
      <p className="muted-copy">
        Cadastre a janela em que o cliente consegue vir. Quando uma vaga compatível surgir,
        a Agenda mostra quem pode ser chamado.
      </p>

      <div className="waitlist-create-grid">
        <label>
          Cliente
          <select value={clientId} onChange={event => setClientId(event.target.value)}>
            <option value="">Selecione</option>
            {props.clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </label>
        <label>
          Serviço
          <select value={serviceId} onChange={event => setServiceId(event.target.value)}>
            <option value="">Selecione</option>
            {props.services.filter(item => item.active).map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </label>
        <label>
          Profissional
          <select
            value={professionalId}
            onChange={event => setProfessionalId(event.target.value)}
          >
            <option value="">Qualquer profissional</option>
            {props.professionals
              .filter(item => item.active && item.servesClients)
              .map(professional => (
                <option key={professional.id} value={professional.id}>
                  {professional.professionalName || professional.name}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="waitlist-window-grid">
        <OfficialDateTimePicker
          settings={props.settings}
          value={desiredFrom}
          label="Disponível a partir de"
          onChange={setDesiredFrom}
        />
        <OfficialDateTimePicker
          settings={props.settings}
          value={desiredTo}
          label="Disponível até"
          onChange={setDesiredTo}
        />
      </div>

      <label>
        Observação opcional
        <textarea
          value={notes}
          onChange={event => setNotes(event.target.value)}
          placeholder="Ex.: prefere depois das 17h, mas consegue antecipar."
        />
      </label>
      <button
        type="button"
        disabled={!valid || props.actionLoading}
        onClick={submitEntry}
      >
        Adicionar à lista de espera
      </button>

      <div className="waitlist-entry-list">
        {waiting.map(entry => (
          <WaitlistEntryCard
            key={entry.id}
            entry={entry}
            clients={props.clients}
            services={props.services}
            professionals={props.professionals}
            timeZone={props.settings.timezone}
            onOpenWhatsApp={props.onOpenWhatsApp}
            onStatusChange={props.onStatusChange}
          />
        ))}
        {!waiting.length ? (
          <div className="agenda-empty-state compact">
            <strong>Ninguém aguardando no momento.</strong>
            <span>Novas entradas aparecerão aqui.</span>
          </div>
        ) : null}
      </div>
    </CollapsibleAgendaSection>
  );
}

interface WaitlistEntryCardProps {
  entry: WaitlistEntry;
  clients: Client[];
  services: Service[];
  professionals: Professional[];
  timeZone: string;
  onStatusChange: (entry: WaitlistEntry, status: WaitlistStatus) => void;
  onOpenWhatsApp: (clientId: string) => void;
}

function WaitlistEntryCard(props: WaitlistEntryCardProps) {
  const client = props.clients.find(item => item.id === props.entry.clientId);
  const service = props.services.find(item => item.id === props.entry.serviceId);
  const professional = props.professionals.find(
    item => item.id === props.entry.professionalId
  );
  const professionalName = professional?.professionalName
    || professional?.name
    || 'Qualquer profissional';

  return (
    <div className="waitlist-entry">
      <div>
        <strong>{client?.name ?? 'Cliente'}</strong>
        <span>{service?.name ?? 'Serviço'} • {professionalName}</span>
        <small>
          {new Date(props.entry.desiredFrom).toLocaleString('pt-BR', { timeZone: props.timeZone })}
          {' → '}
          {new Date(props.entry.desiredTo).toLocaleString('pt-BR', { timeZone: props.timeZone })}
        </small>
      </div>
      <div className="waitlist-entry-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => props.onOpenWhatsApp(props.entry.clientId)}
        >
          WhatsApp
        </button>
        {props.entry.status === 'waiting' ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => props.onStatusChange(props.entry, 'contacted')}
          >
            Marcar contato
          </button>
        ) : null}
        <button
          type="button"
          className="text-button"
          onClick={() => props.onStatusChange(props.entry, 'cancelled')}
        >
          Remover
        </button>
      </div>
    </div>
  );
}
