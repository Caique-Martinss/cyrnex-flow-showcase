import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Modal } from '../../components/ui/Modal';
import type { ScheduleBlockFormState } from '../../domain/forms';
import type { BusinessSettings, Professional } from '../../domain/types';
import { OfficialDateTimePicker } from './OfficialDateTimePicker';

interface ScheduleBlockModalProps {
  form: ScheduleBlockFormState;
  setForm: Dispatch<SetStateAction<ScheduleBlockFormState>>;
  settings: BusinessSettings;
  professionals: Professional[];
  actionLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export function ScheduleBlockModal(props: ScheduleBlockModalProps) {
  return (
    <Modal
      title="Bloquear horário"
      description="Reserve um período para pausa, compromisso ou indisponibilidade."
      onClose={props.onClose}
    >
      <form className="modal-form" onSubmit={props.onSubmit}>
        {props.settings.operationMode === 'team' ? (
          <label>
            Quem será bloqueado?
            <select
              value={props.form.professionalId}
              onChange={event => {
                props.setForm(current => ({
                  ...current,
                  professionalId: event.target.value
                }));
              }}
            >
              <option value="">Todos os profissionais</option>
              {props.professionals
                .filter(item => item.active && item.servesClients)
                .map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
            </select>
          </label>
        ) : null}

        <div className="block-datetime-grid">
          <OfficialDateTimePicker
            settings={props.settings}
            value={props.form.startsAt}
            label="Início do bloqueio"
            onChange={value => props.setForm(current => ({ ...current, startsAt: value }))}
          />
          <OfficialDateTimePicker
            settings={props.settings}
            value={props.form.endsAt}
            label="Fim do bloqueio"
            onChange={value => props.setForm(current => ({ ...current, endsAt: value }))}
          />
        </div>

        <label>
          Tipo de bloqueio
          <select
            value={props.form.blockType}
            onChange={event => {
              props.setForm(current => ({
                ...current,
                blockType: event.target.value as ScheduleBlockFormState['blockType']
              }));
            }}
          >
            <option value="personal">Compromisso pessoal</option>
            <option value="break">Pausa / almoço</option>
            <option value="maintenance">Manutenção</option>
            <option value="closed">Fechamento excepcional</option>
            <option value="other">Outro</option>
          </select>
        </label>

        <label>
          Motivo
          <input
            required
            minLength={3}
            value={props.form.reason}
            onChange={event => {
              props.setForm(current => ({ ...current, reason: event.target.value }));
            }}
            placeholder="Ex.: almoço, reunião, compromisso externo"
          />
        </label>

        <div className="security-note compact">
          <strong>O sistema protege a agenda.</strong>
          <span>
            Se já existir atendimento nesse período, o bloqueio será recusado e explicará o motivo.
          </span>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={props.onClose}>
            Cancelar
          </button>
          <button disabled={props.actionLoading}>
            {props.actionLoading ? 'Salvando...' : 'Bloquear período'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
