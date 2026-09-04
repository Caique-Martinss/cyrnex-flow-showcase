import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export function Modal({
  title,
  description,
  children,
  onClose,
  className = ''
}: ModalProps) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">CYRNEX FLOW</span>
            <h2 id="modal-title">{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}
