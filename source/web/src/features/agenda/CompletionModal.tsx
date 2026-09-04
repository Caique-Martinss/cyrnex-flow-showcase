import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { paymentMethodLabels } from '../../app/constants';
import { Modal } from '../../components/ui/Modal';
import type { CompletionFormState } from '../../domain/forms';
import type {
  Appointment,
  PaymentMethod,
  PaymentMethodSetting,
  Service
} from '../../domain/types';
import { currencyFormatter } from '../../utils/formatters';

interface CompletionModalProps {
  appointment: Appointment;
  services: Service[];
  paymentMethods: PaymentMethodSetting[];
  form: CompletionFormState;
  setForm: Dispatch<SetStateAction<CompletionFormState>>;
  actionLoading: boolean;
  timeZone: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

export function CompletionModal({
  appointment,
  services,
  paymentMethods,
  form,
  setForm,
  actionLoading,
  timeZone,
  onSubmit,
  onClose
}: CompletionModalProps) {
  const commissionPercent = appointment.commissionPercentSnapshot ?? 0;
  const currentPrice = Number(form.price || appointment.price);
  const commissionAmount = currentPrice * commissionPercent / 100;
  const paidDeposit = appointment.depositStatus === 'paid' ? appointment.depositAmount : 0;
  const remainingToReceive = Math.max(0, currentPrice - paidDeposit);
  const priceBelowPaidDeposit = paidDeposit > 0 && currentPrice < paidDeposit;
  const cardFee = Number(form.cardFee || 0);
  const invalidCardFee = cardFee < 0 || cardFee > remainingToReceive;
  const activeMethods = paymentMethods.filter(item => item.active);
  const eligibleServices = services.filter(item => (
    item.active && (!item.professionalIds.length || item.professionalIds.includes(appointment.professionalId))
  ));

  function selectPaymentMethod(method: PaymentMethod) {
    const configured = activeMethods.find(item => item.method === method);
    const fee = configured ? calculateFee(remainingToReceive, configured) : 0;
    setForm(current => ({
      ...current,
      paymentMethod: method,
      cardFee: fee.toFixed(2)
    }));
  }

  return (
    <Modal
      title="Concluir atendimento"
      description={`${appointment.client?.name ?? 'Cliente'} • iniciado às ${
        formatClock(appointment.actualStartedAt, timeZone)
      }`}
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={onSubmit}>
        <div className="two-columns">
          <label>
            Serviço realizado
            <select
              required
              value={form.serviceId}
              onChange={event => setForm(current => ({ ...current, serviceId: event.target.value }))}
            >
              {eligibleServices.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </label>
          <label>
            Valor cobrado
            <input
              required
              min={paidDeposit > 0 ? paidDeposit : 0}
              step="0.01"
              type="number"
              value={form.price}
              onChange={event => setForm(current => ({ ...current, price: event.target.value }))}
            />
          </label>
        </div>

        <div className="two-columns">
          <label>
            Forma de pagamento
            <select
              value={form.paymentMethod}
              onChange={event => selectPaymentMethod(event.target.value as PaymentMethod)}
            >
              {activeMethods.map(method => (
                <option key={method.method} value={method.method}>
                  {method.label || paymentMethodLabels[method.method]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Taxa descontada
            <input
              min="0"
              max={remainingToReceive}
              step="0.01"
              type="number"
              value={form.cardFee}
              onChange={event => setForm(current => ({ ...current, cardFee: event.target.value }))}
            />
          </label>
        </div>

        {priceBelowPaidDeposit ? (
          <div className="security-note compact danger-note" role="alert">
            <strong>O valor final não pode ser menor que o sinal já confirmado.</strong>
            <span>
              O cliente já pagou {currencyFormatter.format(paidDeposit)}.
              Ajuste o valor total para pelo menos esse valor.
            </span>
          </div>
        ) : null}
        {invalidCardFee ? (
          <div className="security-note compact danger-note" role="alert">
            <strong>A taxa não pode ser maior que o valor que falta receber.</strong>
            <span>Restante atual: {currencyFormatter.format(remainingToReceive)}.</span>
          </div>
        ) : null}

        <label>
          Observação final
          <textarea
            value={form.notes}
            onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
            placeholder="Opcional: ajuste realizado, preferência do cliente ou observação relevante."
          />
        </label>

        <div className="service-summary">
          <div>
            <strong>{currencyFormatter.format(currentPrice)}</strong>
            <span>Valor total do atendimento</span>
          </div>
          {paidDeposit > 0 ? (
            <div>
              <strong>{currencyFormatter.format(remainingToReceive)}</strong>
              <span>Restante após sinal Pix de {currencyFormatter.format(paidDeposit)}</span>
            </div>
          ) : null}
          <div>
            <strong>{currencyFormatter.format(commissionAmount)}</strong>
            <span>
              {commissionPercent}% de comissão registrada neste agendamento para{' '}
              {appointment.professionalName}
            </span>
          </div>
        </div>

        <div className="security-note compact">
          <strong>Conclusão registrada na linha do tempo.</strong>
          <span>Financeiro, comissão e histórico só são atualizados depois desta confirmação.</span>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button disabled={
            actionLoading || !form.serviceId || !form.price || priceBelowPaidDeposit || invalidCardFee
          }>
            {actionLoading ? 'Concluindo...' : 'Concluir e lançar no caixa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function calculateFee(price: number, setting: PaymentMethodSetting): number {
  if (setting.feeType === 'none') return 0;
  if (setting.feeType === 'fixed') return setting.feeValue;
  return Math.round(price * setting.feeValue) / 100;
}

function formatClock(value: string | null, timeZone: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' });
}
