import { useState } from 'react';
import type { BusinessSettings, PublicBookingResult } from '../../domain/types';
import { currencyFormatter, dateTimeFormatter } from '../../utils/formatters';
import {
  businessAddress,
  openAppointmentCalendar,
  openAppointmentRoute,
  openAppointmentWhatsApp,
  openPersistentAppointment
} from './bookingConfirmation.helpers';
import { BookingReceipt } from './BookingReceipt';

interface BookingConfirmationProps {
  result: PublicBookingResult;
  settings: BusinessSettings;
  confirmed: boolean;
  actionLoading: boolean;
  allowDepositSimulation?: boolean;
  onConfirmDeposit?: () => void;
  onOpenConfirmation?: () => void;
  onReset: () => void;
}

export function BookingConfirmation({
  result,
  settings,
  confirmed,
  actionLoading,
  allowDepositSimulation = false,
  onConfirmDeposit,
  onOpenConfirmation,
  onReset
}: BookingConfirmationProps) {
  const [view, setView] = useState<'confirmation' | 'appointment'>('confirmation');

  if (confirmed && view === 'appointment') {
    return (
      <AppointmentHub
        result={result}
        settings={settings}
        onBack={() => setView('confirmation')}
      />
    );
  }

  return (
    <div className={`booking-success ${confirmed ? 'confirmed' : 'pending-payment'}`}>
      <span className="success-icon">{confirmed ? '✓' : '⌛'}</span>
      <span className="eyebrow">
        {confirmed ? 'Agendamento confirmado' : 'Horário reservado'}
      </span>
      <h2>
        {confirmed
          ? `${result.client.name}, seu horário está garantido`
          : `${result.client.name}, falta apenas confirmar o sinal`}
      </h2>
      <p className="confirmation-intro">
        {confirmed
          ? 'Salve este horário e tenha as principais ações da sua reserva em um só lugar.'
          : 'O horário foi separado. Confirme o pagamento para garantir a reserva.'}
      </p>

      <BookingReceipt result={result} />

      {!confirmed ? (
        allowDepositSimulation ? (
          <button disabled={actionLoading || !onConfirmDeposit} onClick={onConfirmDeposit}>
            {actionLoading
              ? 'Confirmando...'
              : result.appointment.service?.publicPriceVisible === false
                ? 'Simular confirmação do sinal'
                : `Simular Pix de ${currencyFormatter.format(result.appointment.depositAmount)}`}
          </button>
        ) : (
          <div className="booking-payment-pending">
            <strong>Sinal pendente</strong>
            <span>
              O horário está reservado. Faça o Pix diretamente para a barbearia e envie o comprovante
              pelo seu link seguro para garantir a reserva.
            </span>
            <button
              className="confirmation-primary-action"
              type="button"
              onClick={() => openPersistentAppointment(result, settings)}
            >
              Pagar sinal por Pix
            </button>
          </div>
        )
      ) : (
        <ConfirmationActionGrid
          result={result}
          settings={settings}
          onAppointment={() => {
            if (!openPersistentAppointment(result, settings)) setView('appointment');
          }}
        />
      )}

      <p className="policy-text">{result.cancellationPolicy}</p>
      <div className="confirmation-footer-actions">
        {confirmed && onOpenConfirmation ? (
          <button className="secondary-button" type="button" onClick={onOpenConfirmation}>
            Ver confirmação novamente
          </button>
        ) : null}
        <button className="secondary-button" type="button" onClick={onReset}>
          Fazer outro agendamento
        </button>
      </div>
    </div>
  );
}

function ConfirmationActionGrid({
  result,
  settings,
  onAppointment
}: {
  result: PublicBookingResult;
  settings: BusinessSettings;
  onAppointment: () => void;
}) {
  const hasAddress = Boolean(businessAddress(settings));
  return (
    <div className="confirmation-action-grid">
      <button className="confirmation-primary-action" type="button" onClick={onAppointment}>
        <span>◫</span><strong>Ver meu agendamento</strong><small>Detalhes e código da reserva</small>
      </button>
      <button type="button" onClick={() => openAppointmentCalendar(result, settings)}>
        <span>▣</span><strong>Adicionar ao calendário</strong><small>Salvar no celular ou computador</small>
      </button>
      <button type="button" onClick={() => openAppointmentWhatsApp(result, settings)}>
        <span>◉</span><strong>Falar no WhatsApp</strong><small>Abrir conversa com a barbearia</small>
      </button>
      {hasAddress ? (
        <button type="button" onClick={() => openAppointmentRoute(settings)}>
          <span>⌖</span><strong>Ver rota</strong><small>Abrir localização no Maps</small>
        </button>
      ) : null}
    </div>
  );
}

function AppointmentHub({
  result,
  settings,
  onBack
}: {
  result: PublicBookingResult;
  settings: BusinessSettings;
  onBack: () => void;
}) {
  const { appointment } = result;
  const address = businessAddress(settings);
  return (
    <div className="customer-appointment-hub">
      <button className="appointment-hub-back" type="button" onClick={onBack}>← Voltar</button>
      <span className="eyebrow">Meu agendamento</span>
      <div className="appointment-hub-title">
        <div>
          <span className="appointment-status-dot" />
          <small>Confirmado</small>
          <h2>{appointment.serviceName}</h2>
        </div>
        <strong>#{appointment.id.slice(0, 8).toUpperCase()}</strong>
      </div>
      <div className="appointment-hub-grid">
        <article><span>Quando</span><strong>{dateTimeFormatter.format(new Date(appointment.date))}</strong></article>
        <article><span>Profissional</span><strong>{appointment.professionalName}</strong></article>
        <article><span>Duração</span><strong>{appointment.durationMinutes} minutos</strong></article>
        <article><span>Cliente</span><strong>{result.client.name}</strong></article>
        {appointment.service?.publicPriceVisible !== false ? (
          <article><span>Valor</span><strong>{currencyFormatter.format(appointment.price)}</strong></article>
        ) : null}
        {address ? <article className="wide"><span>Local</span><strong>{address}</strong></article> : null}
      </div>
      <div className="appointment-hub-actions">
        <button
          type="button"
          onClick={() => openAppointmentCalendar(result, settings)}
        >
          ▣ Adicionar ao calendário
        </button>
        <button
          type="button"
          onClick={() => openAppointmentWhatsApp(result, settings)}
        >
          ◉ WhatsApp
        </button>
        {address ? (
          <button type="button" onClick={() => openAppointmentRoute(settings)}>
            ⌖ Ver rota
          </button>
        ) : null}
      </div>
      <p className="appointment-manage-note">
        Quando o gerenciamento online estiver conectado ao backend, este mesmo acesso seguro poderá oferecer
        reagendamento e cancelamento somente quando as regras da barbearia permitirem.
      </p>
    </div>
  );
}
