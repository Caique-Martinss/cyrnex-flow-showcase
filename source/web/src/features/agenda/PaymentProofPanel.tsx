import { useEffect, useState } from 'react';
import type { Appointment } from '../../domain/types';
import {
  getErrorMessage,
  loadAppointmentPaymentProof,
  reviewAppointmentPaymentProof,
  type AppointmentPaymentProof
} from '../../services';
import { currencyFormatter, dateTimeFormatter } from '../../utils/formatters';

export function PaymentProofPanel(props: {
  appointment: Appointment;
  onReviewed: () => Promise<void> | void;
}) {
  const [proof, setProof] = useState<AppointmentPaymentProof | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setProof(await loadAppointmentPaymentProof(props.appointment.id));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (props.appointment.source !== 'public' || props.appointment.depositAmount <= 0) {
      setProof(null);
      return;
    }
    void refresh();
  }, [
    props.appointment.id,
    props.appointment.source,
    props.appointment.depositAmount,
    props.appointment.depositStatus,
    props.appointment.paymentProofStatus,
    props.appointment.paymentProofSubmittedAt
  ]);

  if (props.appointment.source !== 'public' || props.appointment.depositAmount <= 0) return null;

  async function review(action: 'confirm' | 'reject') {
    if (!proof || proof.status !== 'submitted') return;
    setReviewing(true);
    setError('');
    try {
      const result = await reviewAppointmentPaymentProof(
        props.appointment.id,
        proof.id,
        action,
        note.trim() || undefined
      );
      setProof(result.proof);
      setNote('');
      await props.onReviewed();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setReviewing(false);
    }
  }

  return (
    <section className="agenda-payment-proof">
      <div className="mini-section-heading">
        <strong>Pagamento do sinal</strong>
        <span>{currencyFormatter.format(props.appointment.depositAmount)} via Pix</span>
      </div>

      {loading ? <p className="muted">Carregando comprovante...</p> : null}
      {!loading && !proof && props.appointment.depositStatus === 'pending' ? (
        <div className="payment-proof-status waiting">
          <strong>Aguardando comprovante do cliente</strong>
          <span>Quando ele enviar pelo link seguro, a confirmação aparecerá aqui.</span>
        </div>
      ) : null}

      {proof?.status === 'submitted' ? (
        <div className="payment-proof-review">
          <div className="payment-proof-status submitted">
            <strong>Comprovante recebido • conferir</strong>
            <span>Enviado em {dateTimeFormatter.format(new Date(proof.submittedAt))}</span>
          </div>
          <a className="secondary-button proof-open-button" href={proof.signedUrl} target="_blank" rel="noreferrer">
            Ver comprovante
          </a>
          <label>
            Observação <small>opcional</small>
            <textarea
              maxLength={500}
              rows={2}
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="Ex.: valor divergente ou comprovante ilegível."
            />
          </label>
          <div className="payment-proof-actions">
            <button type="button" disabled={reviewing} onClick={() => void review('confirm')}>
              {reviewing ? 'Processando...' : '✓ Confirmar pagamento'}
            </button>
            <button
              className="secondary-button danger-outline"
              type="button"
              disabled={reviewing}
              onClick={() => void review('reject')}
            >
              Recusar comprovante
            </button>
          </div>
          <small>Confirmar marca o sinal como pago, registra Pix e garante o horário.</small>
        </div>
      ) : null}

      {proof?.status === 'confirmed' || props.appointment.depositStatus === 'paid' ? (
        <div className="payment-proof-status confirmed">
          <strong>✓ Pix confirmado</strong>
          <span>
            {proof?.reviewedAt
              ? `Confirmado em ${dateTimeFormatter.format(new Date(proof.reviewedAt))}.`
              : 'Pagamento confirmado.'}
          </span>
          {proof?.signedUrl ? (
            <a href={proof.signedUrl} target="_blank" rel="noreferrer">Ver comprovante</a>
          ) : null}
        </div>
      ) : null}

      {proof?.status === 'rejected' && props.appointment.depositStatus === 'pending' ? (
        <div className="payment-proof-status rejected">
          <strong>Comprovante recusado</strong>
          <span>{proof.reviewNote || 'O cliente pode enviar um novo comprovante pelo link seguro.'}</span>
        </div>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}
