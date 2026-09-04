import { useEffect, useMemo, useState } from 'react';
import { ActionDialog } from '../../components/ui/ActionDialog';

interface Props {
  open: boolean;
  businessName: string;
  businessSlug: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (input: { reason: string; confirmation: string }) => Promise<void>;
}

export function PlatformDeleteBusinessDialog({
  open,
  businessName,
  businessSlug,
  loading,
  onClose,
  onConfirm
}: Props) {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const expected = `EXCLUIR ${businessSlug}`;

  useEffect(() => {
    if (!open) return;
    setReason('');
    setConfirmation('');
  }, [open, businessSlug]);

  const confirmationMatches = useMemo(
    () => confirmation.trim().toLocaleUpperCase('pt-BR') === expected.toLocaleUpperCase('pt-BR'),
    [confirmation, expected]
  );

  async function confirm() {
    if (!reason.trim() || !confirmationMatches || loading) return;
    await onConfirm({ reason: reason.trim(), confirmation: confirmation.trim() });
  }

  return (
    <ActionDialog
      open={open}
      eyebrow="CYRNEX ADMIN · EXCLUSÃO IRREVERSÍVEL"
      title={`Excluir definitivamente ${businessName}?`}
      description="Esta ação remove a empresa do CYRNEX FLOW e não possui botão de desfazer."
      tone="danger"
      confirmLabel="Excluir empresa definitivamente"
      busy={loading}
      confirmDisabled={reason.trim().length < 5 || !confirmationMatches}
      onClose={onClose}
      onConfirm={confirm}
    >
      <div className="platform-hard-delete-alert">
        <strong>⚠ Esta é uma exclusão real.</strong>
        <p>Use somente quando você realmente quer remover a empresa e os dados do tenant.</p>
      </div>

      <div className="action-dialog-impact-list">
        <Impact
          label="Banco"
          text="Remove a empresa e os registros vinculados por business_id através das relações de cascade."
        />
        <Impact
          label="Arquivos"
          text="Limpa os arquivos da empresa nos buckets administrados pelo CYRNEX após apagar o tenant."
        />
        <Impact label="Página pública" text="Slug, booking e operação da empresa deixam de existir." />
        <Impact
          label="Contas"
          text="Usuários do Auth não são apagados automaticamente, pois podem pertencer a outra empresa."
        />
        <Impact
          label="Prova"
          text="Fica somente um recibo administrativo mínimo e a auditoria, sem dados operacionais do tenant."
        />
      </div>

      <label className="action-dialog-reason">
        <span>Motivo da exclusão</span>
        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={event => setReason(event.target.value)}
          placeholder="Ex.: cliente solicitou exclusão definitiva após encerramento do contrato"
        />
        <small>Obrigatório. Fica no recibo administrativo da exclusão.</small>
      </label>

      <label className="platform-delete-confirmation-field">
        <span>Confirmação final</span>
        <small>Digite exatamente:</small>
        <code>{expected}</code>
        <input
          value={confirmation}
          onChange={event => setConfirmation(event.target.value)}
          placeholder={expected}
          autoComplete="off"
          spellCheck={false}
        />
        <em className={confirmation ? (confirmationMatches ? 'is-ok' : 'is-wrong') : ''}>
          {confirmation
            ? (confirmationMatches ? 'Confirmação correta.' : 'A frase ainda não confere.')
            : 'O botão só será liberado quando a frase estiver correta.'}
        </em>
      </label>
    </ActionDialog>
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
