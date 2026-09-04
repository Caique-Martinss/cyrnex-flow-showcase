import { useEffect, type ReactNode } from 'react';

export type ActionDialogTone = 'default' | 'warning' | 'danger';

interface ActionDialogProps {
  open: boolean;
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: ActionDialogTone;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ActionDialog({
  open,
  eyebrow = 'CYRNEX',
  title,
  description,
  tone = 'default',
  confirmLabel,
  cancelLabel = 'Voltar',
  busy = false,
  confirmDisabled = false,
  children,
  onConfirm,
  onClose
}: ActionDialogProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (!busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="action-dialog-layer" data-action-dialog-open="true">
      <button
        type="button"
        className="action-dialog-backdrop"
        aria-label="Fechar confirmação"
        disabled={busy}
        onClick={onClose}
      />
      <section
        className={`action-dialog is-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        aria-describedby={description ? 'action-dialog-description' : undefined}
      >
        <div className="action-dialog-head">
          <div>
            <span>{eyebrow}</span>
            <h2 id="action-dialog-title">{title}</h2>
            {description ? <p id="action-dialog-description">{description}</p> : null}
          </div>
          <button
            type="button"
            className="action-dialog-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {children ? <div className="action-dialog-body">{children}</div> : null}
        <div className="action-dialog-actions">
          <button type="button" className="is-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="is-primary"
            onClick={() => void onConfirm()}
            disabled={busy || confirmDisabled}
          >
            {busy ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
