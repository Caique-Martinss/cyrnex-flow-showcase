import { Modal } from '../../components/ui/Modal';
import type { PublicBookingResult } from '../../domain/types';
import { BookingReceipt } from './BookingReceipt';

interface PaymentConfirmationModalProps {
  result: PublicBookingResult;
  onClose: () => void;
}

export function PaymentConfirmationModal({
  result,
  onClose
}: PaymentConfirmationModalProps) {
  return (
    <Modal
      title="Pagamento confirmado"
      description="Seu agendamento está garantido. Confira os dados antes de fechar."
      onClose={onClose}
    >
      <div className="payment-confirmation-modal">
        <span className="success-icon large">✓</span>
        <div className="payment-confirmation-title">
          <span className="eyebrow">Tudo certo</span>
          <h2>Você está agendado!</h2>
          <p>As informações continuam disponíveis na tela de confirmação.</p>
        </div>

        <BookingReceipt result={result} />
        <button type="button" onClick={onClose}>
          Entendi
        </button>
      </div>
    </Modal>
  );
}
