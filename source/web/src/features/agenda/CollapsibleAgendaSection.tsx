import { type ReactNode, useEffect, useState } from 'react';

interface CollapsibleAgendaSectionProps {
  storageKey: string;
  title: string;
  eyebrow?: string;
  summary?: string;
  criticalSummary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleAgendaSection(props: CollapsibleAgendaSectionProps) {
  const [open, setOpen] = useState(() => {
    const stored = window.localStorage.getItem(`agenda-collapse:${props.storageKey}`);
    return stored === null ? (props.defaultOpen ?? true) : stored === 'open';
  });

  useEffect(() => {
    window.localStorage.setItem(`agenda-collapse:${props.storageKey}`, open ? 'open' : 'closed');
  }, [open, props.storageKey]);

  return (
    <section className={`panel collapsible-agenda-section ${props.className ?? ''}`}>
      <button
        type="button"
        className="collapsible-agenda-header"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <span>
          {props.eyebrow ? <small className="eyebrow">{props.eyebrow}</small> : null}
          <strong>{props.title}</strong>
          {props.summary ? <em>{props.summary}</em> : null}
        </span>
        <span className="collapse-indicator">{open ? '⌃' : '⌄'}</span>
      </button>
      {!open && props.criticalSummary ? (
        <div className="collapsed-critical-summary">{props.criticalSummary}</div>
      ) : null}
      {open ? <div className="collapsible-agenda-content">{props.children}</div> : null}
    </section>
  );
}
