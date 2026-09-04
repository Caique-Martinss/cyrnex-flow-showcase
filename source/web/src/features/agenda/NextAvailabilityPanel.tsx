import { useMemo, useState } from 'react';
import type { BusinessSettings, Professional, Service } from '../../domain/types';
import { loadAdminAvailability } from '../../services';
import { addDaysText, getMaximumBookingDate, toLocalDateTimeInput } from './agenda.helpers';
import { getDateTextInTimeZone } from '../../utils/businessTime';
import { CollapsibleAgendaSection } from './CollapsibleAgendaSection';

interface NextAvailabilityPanelProps {
  settings: BusinessSettings;
  services: Service[];
  professionals: Professional[];
  onNewAppointmentAt: (date: string, professionalId?: string) => void;
}

interface ResultSlot {
  start: string;
  professional: Professional;
}

export function NextAvailabilityPanel(props: NextAvailabilityPanelProps) {
  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('any');
  const [results, setResults] = useState<ResultSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const service = props.services.find(item => item.id === serviceId);
  const eligibleProfessionals = useMemo(() => props.professionals.filter(item => (
    item.active &&
    item.servesClients &&
    (!service?.professionalIds.length || service.professionalIds.includes(item.id))
  )), [props.professionals, service]);

  async function searchSlots() {
    if (!service) return;
    const targets = professionalId === 'any'
      ? eligibleProfessionals
      : eligibleProfessionals.filter(item => item.id === professionalId);
    if (!targets.length) {
      setResults([]);
      setSearched(true);
      setError('Nenhum profissional habilitado realiza esse serviço.');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const found: ResultSlot[] = [];
      const today = getDateTextInTimeZone(new Date(), props.settings.timezone);
      const maximum = getMaximumBookingDate(props.settings);
      let dateText = today;
      while (dateText <= maximum && found.length < 5) {
        const responses = await Promise.all(targets.map(async professional => ({
          professional,
          availability: await loadAdminAvailability({
            serviceId: service.id,
            professionalId: professional.id,
            date: dateText
          })
        })));
        responses.forEach(({ professional, availability }) => {
          availability.slots
            .filter(slot => slot.status === 'available')
            .forEach(slot => found.push({ start: slot.start, professional }));
        });
        found.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        dateText = addDaysText(dateText, 1);
      }
      setResults(found.slice(0, 5));
    } catch (reason) {
      setResults([]);
      setError(reason instanceof Error ? reason.message : 'Não foi possível procurar horários agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <CollapsibleAgendaSection
      storageKey="next-availability"
      title="Encontrar próximo horário disponível"
      eyebrow="Atalho inteligente"
      className="next-availability-panel"
    >
      <p className="muted-copy">
        Escolha o serviço e, se quiser, um profissional. O sistema procura automaticamente os
        próximos horários livres que realmente cabem na agenda.
      </p>

      <div className="next-availability-form">
        <label>
          Serviço
          <select
            value={serviceId}
            onChange={event => {
              setServiceId(event.target.value);
              setProfessionalId('any');
              setResults([]);
              setSearched(false);
            }}
          >
            <option value="">Selecione</option>
            {props.services.filter(item => item.active).map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          Profissional
          <select
            disabled={!serviceId}
            value={professionalId}
            onChange={event => {
              setProfessionalId(event.target.value);
              setResults([]);
              setSearched(false);
            }}
          >
            <option value="any">Qualquer profissional</option>
            {eligibleProfessionals.map(item => (
              <option key={item.id} value={item.id}>{item.professionalName || item.name}</option>
            ))}
          </select>
        </label>
        <button type="button" disabled={!serviceId || loading} onClick={() => void searchSlots()}>
          {loading ? 'Procurando...' : 'Buscar horários'}
        </button>
      </div>

      {error ? <div className="picker-error">{error}</div> : null}
      {results.length ? (
        <div className="next-slot-list">
          {results.map(result => {
            const date = new Date(result.start);
            return (
              <button
                key={`${result.professional.id}-${result.start}`}
                type="button"
                onClick={() => props.onNewAppointmentAt(
                  toLocalDateTimeInput(date, props.settings.timezone),
                  result.professional.id
                )}
              >
                <span>
                  <strong>
                    {date.toLocaleTimeString('pt-BR', {
                      timeZone: props.settings.timezone,
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </strong>
                  <small>
                    {date.toLocaleDateString('pt-BR', {
                      timeZone: props.settings.timezone,
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit'
                    })}
                    {' • '}{result.professional.professionalName || result.professional.name}
                  </small>
                </span>
                <em>Agendar →</em>
              </button>
            );
          })}
        </div>
      ) : searched && !loading && !error ? (
        <div className="agenda-empty-state compact">
          <strong>Nenhum horário livre encontrado dentro das regras atuais.</strong>
          <span>Tente outro serviço, outro profissional ou revise o limite futuro de agendamentos.</span>
        </div>
      ) : null}
    </CollapsibleAgendaSection>
  );
}
