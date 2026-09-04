export type PlatformAdminSection = 'businesses' | 'health' | 'logs' | 'audit';

interface Props {
  active: PlatformAdminSection;
  onChange: (section: PlatformAdminSection) => void;
  attentionCount?: number;
}

export function PlatformAdminSidebar({ active, onChange, attentionCount = 0 }: Props) {
  return (
    <aside className="platform-admin-sidebar" aria-label="Áreas do CYRNEX Admin">
      <div className="platform-admin-sidebar-label">CONTROL PLANE</div>
      <nav>
        <NavButton icon="▦" label="Empresas" active={active === 'businesses'} onClick={() => onChange('businesses')} />
        <NavButton
          icon="●"
          label="Saúde do sistema"
          active={active === 'health'}
          onClick={() => onChange('health')}
          attention={attentionCount}
        />
        <NavButton
          icon="≡"
          label="Logs"
          active={active === 'logs'}
          onClick={() => onChange('logs')}
          attention={attentionCount}
        />
        <NavButton icon="↺" label="Auditoria" active={active === 'audit'} onClick={() => onChange('audit')} />
      </nav>
      <div className="platform-admin-sidebar-help">
        <strong>CRX Monitor</strong>
        <span>Erros 5xx, lentidão, reinícios, Storage e banco aparecem aqui.</span>
      </div>
    </aside>
  );
}

function NavButton({
  icon,
  label,
  active,
  attention = 0,
  onClick
}: {
  icon: string;
  label: string;
  active: boolean;
  attention?: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className={active ? 'is-active' : ''} onClick={onClick}>
      <span className="platform-admin-nav-icon">{icon}</span>
      <span>{label}</span>
      {attention > 0 ? <strong>{attention > 99 ? '99+' : attention}</strong> : null}
    </button>
  );
}
