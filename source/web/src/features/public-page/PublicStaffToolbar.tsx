import { useState } from 'react';
import { switchBusiness } from '../../services/auth.api';
import type { PublicStaffContext } from '../../services/publicPage.api';

interface PublicStaffToolbarProps {
  context: PublicStaffContext;
  slug: string;
}

export function PublicStaffToolbar({ context, slug }: PublicStaffToolbarProps) {
  const [navigating, setNavigating] = useState(false);

  async function openPrivateArea(path: string) {
    if (navigating) return;
    setNavigating(true);
    try {
      await switchBusiness(context.businessId);
      goTo(path);
    } catch {
      setNavigating(false);
    }
  }

  return (
    <aside className="pp-staff-toolbar" aria-label="Ferramentas da equipe">
      <div className="pp-shell pp-staff-toolbar-inner">
        <div className="pp-staff-toolbar-copy">
          <span className="pp-staff-dot" aria-hidden="true" />
          <div>
            <strong>Você está visualizando sua Página Pública</strong>
            <small>{context.businessName} • {roleLabel(context.role)}</small>
          </div>
        </div>
        <div className="pp-staff-toolbar-actions">
          <button
            disabled={navigating}
            type="button"
            onClick={() => void openPrivateArea('/')}
          >
            Voltar ao painel
          </button>
          {context.canConfigure ? (
            <button
              className="is-primary"
              disabled={navigating}
              type="button"
              onClick={() => void openPrivateArea('/?configure=public-page')}
            >
              Configurar página
            </button>
          ) : null}
          <button disabled={navigating} type="button" onClick={() => viewAsCustomer(slug)}>
            Ver como cliente
          </button>
        </div>
      </div>
    </aside>
  );
}

function viewAsCustomer(slug: string) {
  const url = new URL(`/b/${encodeURIComponent(slug)}`, window.location.origin);
  url.searchParams.set('view', 'customer');
  window.location.assign(url.toString());
}

function goTo(path: string) {
  window.location.assign(new URL(path, window.location.origin).toString());
}

function roleLabel(role: PublicStaffContext['role']): string {
  if (role === 'owner') return 'Dono';
  if (role === 'manager') return 'Gerente';
  if (role === 'professional') return 'Profissional';
  return 'Recepção';
}
