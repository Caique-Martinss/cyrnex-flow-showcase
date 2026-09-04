import { SummaryRow } from '../../components/ui/SummaryRow';
import type { PublicBookingResult } from '../../domain/types';
import {
  currencyFormatter,
  dateTimeFormatter
} from '../../utils/formatters';

interface BookingReceiptProps {
  result: PublicBookingResult;
}

export function BookingReceipt({ result }: BookingReceiptProps) {
  const { appointment } = result;
  const showPrice = appointment.service?.publicPriceVisible !== false;
  const depositPaid = appointment.depositStatus === 'paid';
  const depositWaived = appointment.depositStatus === 'waived';
  const paidAmount = depositPaid ? appointment.depositAmount : 0;
  const remainingAmount = Math.max(0, appointment.price - paidAmount);

  const depositText = depositWaived
    ? 'Não exigido'
    : depositPaid
      ? `${currencyFormatter.format(appointment.depositAmount)} pago`
      : `${currencyFormatter.format(appointment.depositAmount)} pendente`;

  return (
    <div className="booking-receipt">
      <div className="receipt-header">
        <div>
          <span>Comprovante do agendamento</span>
          <strong>#{appointment.id.slice(0, 8).toUpperCase()}</strong>
        </div>

        <span
          className={`receipt-status ${
            depositPaid || depositWaived ? 'confirmed' : 'pending'
          }`}
        >
          {depositPaid || depositWaived
            ? 'Confirmado'
            : 'Aguardando sinal'}
        </span>
      </div>

      <div className="booking-summary">
        <SummaryRow label="Nome" value={result.client.name} />
        <SummaryRow label="WhatsApp" value={result.client.phone} />
        <SummaryRow label="Serviço" value={appointment.serviceName} />
        <SummaryRow label="Barbeiro" value={appointment.professionalName} />
        <SummaryRow
          label="Data e horário"
          value={dateTimeFormatter.format(new Date(appointment.date))}
        />
        <SummaryRow
          label="Duração"
          value={`${appointment.durationMinutes} minutos`}
        />
        {showPrice ? (
          <>
            <SummaryRow
              label="Valor total"
              value={currencyFormatter.format(appointment.price)}
            />
            <SummaryRow label="Sinal" value={depositText} />
            <SummaryRow
              label="Valor restante no dia"
              value={currencyFormatter.format(remainingAmount)}
              strong
            />
          </>
        ) : (
          <SummaryRow label="Valor" value="Não exibido publicamente" />
        )}
      </div>
    </div>
  );
}
