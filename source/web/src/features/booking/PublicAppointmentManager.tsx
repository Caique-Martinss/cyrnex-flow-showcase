import { useMemo, useState } from 'react';
import type { AvailabilitySlot, BusinessSettings } from '../../domain/types';
import type { PublicBookingManagement } from '../../services/publicBookingManagement.api';
import { dateTimeFormatter } from '../../utils/formatters';
import {
  businessAddress,
  openAppointmentCalendar,
  openAppointmentRoute,
  openAppointmentWhatsApp
} from './bookingConfirmation.helpers';

interface PublicAppointmentManagerProps {
  management: PublicBookingManagement;
  settings: BusinessSettings;
  availabilitySlots: AvailabilitySlot[];
  availabilityLoading: boolean;
  availabilityError: string;
  selectedSlot: AvailabilitySlot | null;
  rescheduleDate: string;
  minimumDate: string;
  maximumDate: string;
  actionLoading: boolean;
  actionError: string;
  onRescheduleDate: (value: string) => void;
  onSelectSlot: (slot: AvailabilitySlot | null) => void;
  onReschedule: () => void;
  onCancel: (reason: string) => void;
  onSubmitPaymentProof: (file: File) => void;
}

export function PublicAppointmentManager(props: PublicAppointmentManagerProps) {
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view');
  const [cancelReason, setCancelReason] = useState('');
  const booking = props.management.booking;
  const appointment = booking.appointment;
  const address = businessAddress(props.settings);
  const status = statusLabel(appointment.status);
  const deadline = props.management.changeDeadline
    ? dateTimeFormatter.format(new Date(props.management.changeDeadline))
    : null;
  const canUseCalendar = appointment.status !== 'cancelled' && appointment.status !== 'missed';
  const managementExpires = dateTimeFormatter.format(
    new Date(props.management.managementExpiresAt)
  );
  const visibleSlots = useMemo(
    () => props.availabilitySlots.filter(slot => slot.status === 'available'),
    [props.availabilitySlots]
  );

  return (
    <div className="public-customer-page pp-page appointment-management-page">
      <header className="appointment-management-topbar">
        <a className="pp-secondary" href={`/b/${encodeURIComponent(props.settings.bookingSlug)}`}>
          ← Voltar para {props.settings.businessName}
        </a>
        <span>CYRNEX FLOW • acesso seguro</span>
      </header>

      <main className="appointment-management-shell pp-booking-shell">
        <section className="customer-appointment-hub pp-glow appointment-management-card">
          <span className="eyebrow">Meu agendamento</span>
          <div className="appointment-hub-title">
            <div>
              <span className={`appointment-status-dot status-${appointment.status}`} />
              <small>{status}</small>
              <h2>{appointment.serviceName}</h2>
            </div>
            <strong>#{appointment.id.slice(0, 8).toUpperCase()}</strong>
          </div>

          <div className="appointment-hub-grid">
            <article>
              <span>Quando</span>
              <strong>{dateTimeFormatter.format(new Date(appointment.date))}</strong>
            </article>
            <article><span>Profissional</span><strong>{appointment.professionalName}</strong></article>
            <article><span>Duração</span><strong>{appointment.durationMinutes} minutos</strong></article>
            <article><span>Cliente</span><strong>{booking.client.name}</strong></article>
            {appointment.service?.publicPriceVisible !== false ? (
              <article><span>Valor</span><strong>{formatMoney(appointment.price)}</strong></article>
            ) : null}
            {address ? <article className="wide"><span>Local</span><strong>{address}</strong></article> : null}
          </div>

          {props.management.payment.required ? (
            <ManualPixPaymentPanel
              management={props.management}
              loading={props.actionLoading}
              error={props.actionError}
              onSubmit={props.onSubmitPaymentProof}
            />
          ) : null}

          <div className="appointment-hub-actions management-utility-actions">
            {canUseCalendar ? (
              <button type="button" onClick={() => openAppointmentCalendar(booking, props.settings)}>
                ▣ Adicionar ao calendário
              </button>
            ) : null}
            <button type="button" onClick={() => openAppointmentWhatsApp(booking, props.settings)}>
              ◉ WhatsApp
            </button>
            {address ? (
              <button type="button" onClick={() => openAppointmentRoute(props.settings)}>
                ⌖ Ver rota
              </button>
            ) : null}
            <button type="button" onClick={() => void copyCurrentLink()}>
              ⧉ Copiar link
            </button>
          </div>

          {mode === 'view' ? (
            <ManagementActions
              management={props.management}
              deadline={deadline}
              onMode={setMode}
            />
          ) : null}
          {mode === 'reschedule' ? (
            <ReschedulePanel
              {...props}
              visibleSlots={visibleSlots}
              onBack={() => setMode('view')}
            />
          ) : null}
          {mode === 'cancel' ? (
            <CancelPanel
              reason={cancelReason}
              loading={props.actionLoading}
              error={props.actionError}
              onReason={setCancelReason}
              onBack={() => setMode('view')}
              onConfirm={() => props.onCancel(cancelReason)}
            />
          ) : null}

          <p className="appointment-manage-note">
            Este link é pessoal. Não compartilhe publicamente. O acesso expira em {managementExpires}.
          </p>
        </section>
      </main>
    </div>
  );
}

function ManualPixPaymentPanel(props: {
  management: PublicBookingManagement;
  loading: boolean;
  error: string;
  onSubmit: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const appointment = props.management.booking.appointment;
  const payment = props.management.payment;
  const depositPaid = appointment.depositStatus === 'paid' || payment.proofStatus === 'confirmed';
  const terminal = ['completed', 'cancelled', 'missed'].includes(appointment.status);
  const remaining = Math.max(0, appointment.price - (depositPaid ? appointment.depositAmount : 0));
  const canSubmit = !terminal
    && appointment.depositStatus === 'pending'
    && payment.method === 'pix'
    && payment.proofStatus !== 'submitted';

  if (depositPaid) {
    return (
      <section className="manual-pix-card payment-confirmed-card">
        <div className="manual-pix-heading">
          <div><span className="eyebrow">Pagamento</span><h3>✓ Sinal confirmado</h3></div>
          <strong>{formatMoney(appointment.depositAmount)}</strong>
        </div>
        <p>O pagamento via Pix foi confirmado pela barbearia. Seu horário está garantido.</p>
        {appointment.service?.publicPriceVisible !== false ? (
          <small>Restante no dia: <strong>{formatMoney(remaining)}</strong></small>
        ) : null}
        {payment.proofReviewedAt ? (
          <small>Confirmado em {dateTimeFormatter.format(new Date(payment.proofReviewedAt))}.</small>
        ) : null}
      </section>
    );
  }

  if (terminal) {
    return (
      <section className="manual-pix-card payment-waiting-card">
        <div className="manual-pix-heading">
          <div><span className="eyebrow">Pagamento</span><h3>Envio de comprovante encerrado</h3></div>
          <strong>{formatMoney(appointment.depositAmount)}</strong>
        </div>
        <p>Este agendamento já foi encerrado. Não é possível enviar um novo comprovante por este link.</p>
        <small>
          Se você já realizou um pagamento e precisa confirmar a situação,
          fale diretamente com a barbearia.
        </small>
      </section>
    );
  }

  if (payment.proofStatus === 'submitted') {
    return (
      <section className="manual-pix-card payment-waiting-card">
        <div className="manual-pix-heading">
          <div><span className="eyebrow">Pagamento</span><h3>Comprovante enviado</h3></div>
          <strong>{formatMoney(appointment.depositAmount)}</strong>
        </div>
        <p><strong>Horário reservado ✅</strong><br />
          Seu horário já está garantido. Seu comprovante foi enviado e aguarda apenas a conferência da barbearia.
        </p>
        {payment.proofSubmittedAt ? (
          <small>Enviado em {dateTimeFormatter.format(new Date(payment.proofSubmittedAt))}.</small>
        ) : null}
        <small>Você não precisa enviar novamente enquanto esta análise estiver pendente.</small>
      </section>
    );
  }

  return (
    <section className="manual-pix-card">
      <div className="manual-pix-heading">
        <div><span className="eyebrow">Pagamento</span><h3>Pague o sinal por Pix</h3></div>
        <strong>{formatMoney(appointment.depositAmount)}</strong>
      </div>
      {payment.proofStatus === 'rejected' ? (
        <div className="payment-proof-rejected" role="alert">
          <strong>O último comprovante não foi confirmado.</strong>
          <span>{payment.proofReviewNote || 'Confira o pagamento e envie um novo comprovante.'}</span>
        </div>
      ) : null}
      {payment.method === 'pix' ? (
        <>
          <div className="manual-pix-details">
            <div><span>Recebedor</span><strong>{payment.receiverName}</strong></div>
            <div><span>Chave Pix</span><strong>{payment.pixKey}</strong></div>
          </div>
          <button
            className="pp-secondary manual-pix-copy"
            type="button"
            onClick={() => void copyText(payment.pixKey)}
          >
            ⧉ Copiar chave Pix
          </button>
          <div className="payment-proof-upload">
            <label>
              <span>Depois de pagar, envie o comprovante</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={event => setFile(event.target.files?.[0] ?? null)}
              />
              <small>JPG, PNG, WebP ou PDF • até 5 MB.</small>
            </label>
            <button
              className="pp-primary"
              type="button"
              disabled={!file || props.loading || !canSubmit}
              onClick={() => file && props.onSubmit(file)}
            >
              {props.loading ? 'Enviando...' : 'Já fiz o Pix • enviar comprovante'}
            </button>
          </div>
        </>
      ) : (
        <p>O pagamento antecipado está indisponível. Fale com a barbearia antes de pagar.</p>
      )}
      {props.error ? <p className="management-error" role="alert">{props.error}</p> : null}
      <small>O envio do comprovante não confirma o pagamento sozinho. A barbearia fará a validação.</small>
    </section>
  );
}

function ManagementActions(props: {
  management: PublicBookingManagement;
  deadline: string | null;
  onMode: (mode: 'reschedule' | 'cancel') => void;
}) {
  const terminal = ['completed', 'cancelled', 'missed'].includes(
    props.management.booking.appointment.status
  );
  return (
    <div className="appointment-management-actions">
      {props.management.canReschedule ? (
        <button className="pp-primary" type="button" onClick={() => props.onMode('reschedule')}>
          Reagendar horário
        </button>
      ) : null}
      {props.management.canCancel ? (
        <button className="management-danger-button" type="button" onClick={() => props.onMode('cancel')}>
          Cancelar agendamento
        </button>
      ) : null}
      {!props.management.canReschedule && !props.management.canCancel ? (
        <p>
          {terminal
            ? 'Este atendimento já foi encerrado e não aceita novas alterações.'
            : props.deadline
              ? `O prazo para alterações online terminou em ${props.deadline}.`
              : 'Alterações online não estão disponíveis para este agendamento.'}
        </p>
      ) : props.deadline ? (
        <small>Alterações online disponíveis até {props.deadline}, conforme regra da barbearia.</small>
      ) : null}
    </div>
  );
}

function ReschedulePanel(props: PublicAppointmentManagerProps & {
  visibleSlots: AvailabilitySlot[];
  onBack: () => void;
}) {
  return (
    <section className="appointment-management-panel">
      <div className="management-panel-heading">
        <div><span className="eyebrow">Reagendar</span><h3>Escolha um novo horário</h3></div>
        <button className="pp-secondary" type="button" onClick={props.onBack}>Voltar</button>
      </div>
      <label className="management-date-field">
        <span>Nova data</span>
        <input
          type="date"
          min={props.minimumDate}
          max={props.maximumDate}
          value={props.rescheduleDate}
          onChange={event => props.onRescheduleDate(event.target.value)}
        />
      </label>
      {props.availabilityLoading ? <p>Buscando horários disponíveis...</p> : null}
      {props.availabilityError ? <p className="management-error">{props.availabilityError}</p> : null}
      {!props.availabilityLoading && !props.availabilityError && props.rescheduleDate ? (
        <div className="management-slot-grid">
          {props.visibleSlots.length ? props.visibleSlots.map(slot => (
            <button
              className={props.selectedSlot?.start === slot.start ? 'selected' : ''}
              key={slot.start}
              type="button"
              onClick={() => props.onSelectSlot(slot)}
            >
              {slot.label}
            </button>
          )) : <p>Nenhum horário disponível nessa data.</p>}
        </div>
      ) : null}
      <button
        className="pp-primary"
        disabled={!props.selectedSlot || props.actionLoading}
        type="button"
        onClick={props.onReschedule}
      >
        {props.actionLoading ? 'Reagendando...' : 'Confirmar novo horário'}
      </button>
      {props.actionError ? <p className="management-error">{props.actionError}</p> : null}
    </section>
  );
}

function CancelPanel(props: {
  reason: string;
  loading: boolean;
  error: string;
  onReason: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <section className="appointment-management-panel cancellation-panel">
      <div className="management-panel-heading">
        <div><span className="eyebrow">Cancelamento</span><h3>Confirmar cancelamento?</h3></div>
        <button className="pp-secondary" type="button" onClick={props.onBack}>Voltar</button>
      </div>
      <p>O horário será liberado na Agenda da barbearia. Esta ação fica registrada no histórico.</p>
      <label>
        <span>Motivo <small>opcional</small></span>
        <textarea
          maxLength={500}
          rows={3}
          value={props.reason}
          onChange={event => props.onReason(event.target.value)}
          placeholder="Se quiser, conte por que precisa cancelar."
        />
      </label>
      <button
        className="management-danger-button solid"
        disabled={props.loading}
        type="button"
        onClick={props.onConfirm}
      >
        {props.loading ? 'Cancelando...' : 'Sim, cancelar agendamento'}
      </button>
      {props.error ? <p className="management-error">{props.error}</p> : null}
    </section>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    arrived: 'Cliente chegou',
    in_service: 'Em atendimento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    missed: 'Não compareceu'
  };
  return labels[status] ?? status;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

async function copyCurrentLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
  } catch {
    const field = document.createElement('textarea');
    field.value = window.location.href;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}
