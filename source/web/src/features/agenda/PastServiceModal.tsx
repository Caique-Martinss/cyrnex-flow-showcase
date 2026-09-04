import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect
} from 'react';
import { Modal } from '../../components/ui/Modal';
import { paymentMethodLabels } from '../../app/constants';
import type { PastServiceFormState } from '../../domain/forms';
import type {
  BusinessSettings,
  Client,
  MemberRole,
  Professional,
  Service
} from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';
import { OfficialDateTimePicker } from './OfficialDateTimePicker';

interface PastServiceModalProps {
  form: PastServiceFormState;
  setForm: Dispatch<SetStateAction<PastServiceFormState>>;
  clients: Client[];
  services: Service[];
  professionals: Professional[];
  settings: BusinessSettings;
  role: MemberRole;
  actionLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export function PastServiceModal(props: PastServiceModalProps) {
  const selectedService = props.services.find(item => item.id === props.form.serviceId);

  useEffect(() => {
    if (!selectedService || props.form.price) return;
    props.setForm(current => ({
      ...current,
      price: String(selectedService.price)
    }));
  }, [selectedService, props.form.price, props.setForm]);

  return (
    <Modal
      title="Registrar atendimento passado"
      description="Use somente quando um atendimento real aconteceu e não foi lançado na hora."
      onClose={props.onClose}
    >
      <form className="modal-form past-service-form" onSubmit={props.onSubmit}>
        <div className="security-note">
          <strong>Registro protegido por aprovação e auditoria</strong>
          <span>
            O lançamento não entra no histórico nem no financeiro até ser aprovado por dono ou gerente.
          </span>
          {props.role === 'owner' ? (
            <small>
              Como dono, você pode revisar o próprio lançamento; essa exceção fica registrada
              na auditoria. Para os demais perfis, a aprovação precisa ser feita por outra pessoa.
            </small>
          ) : props.role === 'manager' ? (
            <small>
              Seu próprio lançamento precisa ser validado pelo dono. Gerentes não aprovam
              solicitações feitas por si mesmos.
            </small>
          ) : (
            <small>Seu pedido ficará aguardando validação de dono ou gerente.</small>
          )}
        </div>

        <div className="agenda-form-grid">
          <label>
            Cliente
            <select
              required
              value={props.form.clientId}
              onChange={event => {
                props.setForm(current => ({ ...current, clientId: event.target.value }));
              }}
            >
              <option value="">Selecione</option>
              {props.clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>

          <label>
            Serviço realizado
            <select
              required
              value={props.form.serviceId}
              onChange={event => {
                const service = props.services.find(item => item.id === event.target.value);
                props.setForm(current => ({
                  ...current,
                  serviceId: event.target.value,
                  price: service ? String(service.price) : ''
                }));
              }}
            >
              <option value="">Selecione</option>
              {props.services.filter(item => item.active).map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </label>

          <label>
            Profissional que atendeu
            <select
              required
              value={props.form.professionalId}
              onChange={event => {
                props.setForm(current => ({
                  ...current,
                  professionalId: event.target.value
                }));
              }}
            >
              <option value="">Selecione</option>
              {props.professionals.filter(item => item.active && item.servesClients).map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <div className="agenda-form-full-width">
            <OfficialDateTimePicker
              settings={props.settings}
              value={props.form.startsAt}
              allowPast
              label="Data e hora em que aconteceu"
              onChange={value => props.setForm(current => ({ ...current, startsAt: value }))}
            />
          </div>

          <label>
            Valor realmente cobrado
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={props.form.price}
              onChange={event => {
                props.setForm(current => ({ ...current, price: event.target.value }));
              }}
            />
            {selectedService ? (
              <small>Preço cadastrado: {currencyFormatter.format(selectedService.price)}</small>
            ) : null}
          </label>

          <label>
            Como foi pago?
            <select
              value={props.form.paymentMethod}
              onChange={event => {
                props.setForm(current => ({
                  ...current,
                  paymentMethod: event.target.value as PastServiceFormState['paymentMethod']
                }));
              }}
            >
              {props.settings.paymentMethods.filter(item => item.active).map(item => (
                <option key={item.method} value={item.method}>
                  {paymentMethodLabels[item.method]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Por que não foi lançado na hora?
          <textarea
            required
            minLength={5}
            value={props.form.reason}
            onChange={event => {
              props.setForm(current => ({ ...current, reason: event.target.value }));
            }}
            placeholder="Ex.: atendimento foi feito durante queda de internet e ficou sem registro."
          />
        </label>

        <div className="proof-grid">
          <label>
            Como podemos comprovar?
            <select
              value={props.form.proofType}
              onChange={event => {
                props.setForm(current => ({
                  ...current,
                  proofType: event.target.value as PastServiceFormState['proofType']
                }));
              }}
            >
              <option value="payment_record">Registro de pagamento</option>
              <option value="receipt">Comprovante / recibo</option>
              <option value="client_confirmation">Confirmação do cliente</option>
              <option value="other">Outra evidência</option>
            </select>
          </label>

          <label>
            Referência da comprovação
            <input
              required
              minLength={3}
              value={props.form.proofReference}
              onChange={event => {
                props.setForm(current => ({
                  ...current,
                  proofReference: event.target.value
                }));
              }}
              placeholder="Ex.: ID do Pix, nº do recibo ou registro da confirmação."
            />
            <small>Precisa ser algo que o responsável consiga conferir.</small>
          </label>

          <label>
            Descreva a evidência
            <input
              required
              minLength={5}
              value={props.form.proofDescription}
              onChange={event => {
                props.setForm(current => ({
                  ...current,
                  proofDescription: event.target.value
                }));
              }}
              placeholder="Ex.: Pix de R$ 55 recebido às 09:48."
            />
          </label>
        </div>

        <label>
          Observação do atendimento (opcional)
          <textarea
            value={props.form.notes}
            onChange={event => {
              props.setForm(current => ({ ...current, notes: event.target.value }));
            }}
          />
        </label>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={props.onClose}>
            Cancelar
          </button>
          <button disabled={props.actionLoading}>
            {props.actionLoading ? 'Enviando...' : 'Enviar para aprovação'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

