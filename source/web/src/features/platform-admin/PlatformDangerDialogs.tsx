import { ActionDialog } from '../../components/ui/ActionDialog';

type DangerousAction = 'suspend' | 'cancel';

interface Props {
  action: DangerousAction | null;
  businessName: string;
  reason: string;
  retentionDays: number;
  loading: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function PlatformDangerDialogs({
  action,
  businessName,
  reason,
  retentionDays,
  loading,
  onReasonChange,
  onClose,
  onConfirm
}: Props) {
  return (
    <>
      <ActionDialog
        open={action === 'suspend'}
        eyebrow="CYRNEX ADMIN · SUSPENSÃO"
        title={`Suspender ${businessName}?`}
        description="Use quando o cliente não deve mais operar o sistema até regularizar a situação."
        tone="warning"
        confirmLabel="Sim, suspender acesso"
        busy={loading}
        confirmDisabled={!reason.trim()}
        onClose={onClose}
        onConfirm={onConfirm}
      >
        <div className="action-dialog-impact-list">
          <Impact label="Bloqueia" text="Painel privado, API operacional e novos bookings." />
          <Impact label="Preserva" text="Clientes, agenda, financeiro, arquivos e configurações." />
          <Impact label="Reversível" text="Um clique em “Reativar acesso” devolve a operação." />
        </div>
        <ReasonField
          label="Motivo da suspensão"
          value={reason}
          placeholder="Ex.: mensalidade de setembro não recebida"
          onChange={onReasonChange}
        />
      </ActionDialog>

      <ActionDialog
        open={action === 'cancel'}
        eyebrow="CYRNEX ADMIN · CANCELAMENTO"
        title={`Cancelar a assinatura de ${businessName}?`}
        description={`O acesso será encerrado e os dados ficarão preservados por ${retentionDays} dias.`}
        tone="danger"
        confirmLabel="Sim, cancelar assinatura"
        busy={loading}
        confirmDisabled={!reason.trim()}
        onClose={onClose}
        onConfirm={onConfirm}
      >
        <div className="action-dialog-impact-list">
          <Impact label="Cobrança" text="A assinatura passa ao estado Cancelado." />
          <Impact label="Retenção" text={`Os dados permanecem guardados por ${retentionDays} dias.`} />
          <Impact label="Sem exclusão" text="Nenhum dado é apagado por esta ação." />
        </div>
        <ReasonField
          label="Motivo do cancelamento"
          value={reason}
          placeholder="Ex.: cliente solicitou encerramento do plano"
          onChange={onReasonChange}
        />
      </ActionDialog>
    </>
  );
}

function Impact({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <strong>{label}</strong>
      <span>{text}</span>
    </div>
  );
}

function ReasonField({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="action-dialog-reason">
      <span>{label}</span>
      <textarea
        autoFocus
        rows={3}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <small>Obrigatório. Fica registrado no histórico administrativo.</small>
    </label>
  );
}
