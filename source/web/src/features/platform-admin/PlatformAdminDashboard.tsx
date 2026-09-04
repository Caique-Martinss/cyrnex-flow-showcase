import { useEffect, useMemo, useState } from 'react';
import type { PlatformAdminSession, SubscriptionStatus } from '../../domain/subscription.types';
import {
  deletePlatformBusiness,
  getErrorMessage,
  getPlatformBusinessDetails,
  getPlatformOverview,
  updatePlatformBusinessSubscription,
  type PlatformBusinessDetails,
  type PlatformOverview
} from '../../services';
import { PlatformAdminSidebar, type PlatformAdminSection } from './PlatformAdminSidebar';
import { PlatformAuditPanel } from './PlatformAuditPanel';
import { PlatformBusinessDetailsPanel } from './PlatformBusinessDetailsPanel';
import { PlatformDeleteBusinessDialog } from './PlatformDeleteBusinessDialog';
import { PlatformSystemHealthPanel } from './PlatformSystemHealthPanel';
import { PlatformSystemLogsPanel } from './PlatformSystemLogsPanel';

type AdminAction =
  | 'update_settings'
  | 'start_trial'
  | 'activate'
  | 'mark_past_due'
  | 'suspend'
  | 'cancel';

type StatusFilter = 'all' | SubscriptionStatus;

interface Props {
  session: PlatformAdminSession;
  onLogout: () => Promise<void>;
}

export function PlatformAdminDashboard({ session, onLogout }: Props) {
  const [section, setSection] = useState<PlatformAdminSection>('businesses');
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [selected, setSelected] = useState<PlatformBusinessDetails | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [attentionCount, setAttentionCount] = useState(0);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOverview(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function loadOverview(query = '') {
    setLoading(true);
    setError('');
    try {
      setOverview(await getPlatformOverview(query));
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      setNotice({ tone: 'error', message });
    } finally {
      setLoading(false);
    }
  }

  async function openBusiness(businessId: string) {
    setError('');
    try {
      setSelected(await getPlatformBusinessDetails(businessId));
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      setNotice({ tone: 'error', message });
    }
  }

  async function subscriptionAction(input: {
    action: AdminAction;
    reason: string;
    planCode: string;
    trialDays: number;
    graceDays: number;
    retentionDays: number;
    currentPeriodEnd: string | null;
  }) {
    if (!selected) return;
    setActionLoading(true);
    setError('');
    try {
      await updatePlatformBusinessSubscription(selected.business.id, input);
      const [nextDetails, nextOverview] = await Promise.all([
        getPlatformBusinessDetails(selected.business.id),
        getPlatformOverview(search)
      ]);
      setSelected(nextDetails);
      setOverview(nextOverview);
      setNotice({ tone: 'success', message: successMessage(input.action, selected.business.name) });
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      setNotice({ tone: 'error', message });
      throw requestError;
    } finally {
      setActionLoading(false);
    }
  }

  async function hardDeleteSelected(input: { reason: string; confirmation: string }) {
    if (!selected) return;
    const businessName = selected.business.name;
    setActionLoading(true);
    setError('');
    try {
      const receipt = await deletePlatformBusiness(selected.business.id, input);
      setDeleteDialogOpen(false);
      setSelected(null);
      await loadOverview(search);
      setNotice(receipt.storageCleanup.status === 'complete'
        ? {
            tone: 'success',
            message: (
              `${businessName} foi excluída definitivamente. `
              + `${receipt.storageCleanup.totalDeletedObjects} arquivo(s) removido(s) do Storage.`
            )
          }
        : {
            tone: 'error',
            message: (
              `${businessName} foi removida do banco, mas a limpeza do Storage ficou incompleta. `
              + 'O incidente foi registrado nos Logs para correção.'
            )
          }
      );
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      setNotice({ tone: 'error', message });
      throw requestError;
    } finally {
      setActionLoading(false);
    }
  }

  const counts = overview?.statusCounts;
  const displayedBusinesses = useMemo(() => {
    const businesses = overview?.businesses ?? [];
    return filter === 'all'
      ? businesses
      : businesses.filter(item => item.subscription.status === filter);
  }, [overview, filter]);

  return (
    <main className="platform-admin-page">
      <header className="platform-admin-header">
        <div className="platform-admin-header-brand">
          <strong>CRX</strong>
          <div><span>CYRNEX</span><small>ADMIN CONTROL PLANE</small></div>
        </div>
        <div className="platform-admin-account">
          <span>{session.admin.displayName}</span>
          <small>{session.admin.role === 'super_admin' ? 'SUPER ADMIN' : 'SUPORTE'}</small>
          <a className="platform-admin-flow-link" href="/">CYRNEX FLOW</a>
          <button type="button" onClick={() => void onLogout()}>Sair</button>
        </div>
      </header>

      <div className="platform-admin-shell">
        <PlatformAdminSidebar
          active={section}
          onChange={next => {
            setSection(next);
            setSelected(null);
            setDeleteDialogOpen(false);
          }}
          attentionCount={attentionCount}
        />

        <div className="platform-admin-main-area">
          {section === 'businesses' ? (
            <section className="platform-admin-content">
              <div className="platform-admin-title">
                <div><span>PLATAFORMA</span><h1>Empresas & assinaturas</h1></div>
                <input
                  type="search"
                  value={search}
                  placeholder="Buscar empresa ou slug"
                  onChange={event => setSearch(event.target.value)}
                />
              </div>

              <div className="platform-admin-metrics">
                <Metric label="Empresas" value={overview?.totalBusinesses ?? 0} />
                <Metric label="Ativas" value={counts?.active ?? 0} />
                <Metric label="Teste" value={counts?.trial ?? 0} />
                <Metric label="Em atraso" value={counts?.past_due ?? 0} attention={Boolean(counts?.past_due)} />
                <Metric label="Suspensas" value={counts?.suspended ?? 0} attention={Boolean(counts?.suspended)} />
                <Metric label="Canceladas" value={counts?.cancelled ?? 0} />
              </div>

              <div className="platform-admin-filterbar" aria-label="Filtrar empresas por status">
                <FilterButton
                  active={filter === 'all'}
                  label="Todas"
                  count={overview?.totalBusinesses ?? 0}
                  onClick={() => setFilter('all')}
                />
                <FilterButton
                  active={filter === 'active'}
                  label="Ativas"
                  count={counts?.active ?? 0}
                  onClick={() => setFilter('active')}
                />
                <FilterButton
                  active={filter === 'trial'}
                  label="Teste"
                  count={counts?.trial ?? 0}
                  onClick={() => setFilter('trial')}
                />
                <FilterButton
                  active={filter === 'past_due'}
                  label="Em atraso"
                  count={counts?.past_due ?? 0}
                  onClick={() => setFilter('past_due')}
                  attention
                />
                <FilterButton
                  active={filter === 'suspended'}
                  label="Suspensas"
                  count={counts?.suspended ?? 0}
                  onClick={() => setFilter('suspended')}
                  attention
                />
                <FilterButton
                  active={filter === 'cancelled'}
                  label="Canceladas"
                  count={counts?.cancelled ?? 0}
                  onClick={() => setFilter('cancelled')}
                />
              </div>

              {error ? <div className="platform-admin-error is-inline">{error}</div> : null}
              <section className="platform-business-list">
                <div className="platform-business-list-head">
                  <span>Empresa</span><span>Plano</span><span>Status</span><span>Membros</span><span />
                </div>
                {loading ? <p className="platform-admin-loading">Carregando empresas...</p> : null}
                {!loading && displayedBusinesses.length === 0 ? (
                  <div className="platform-admin-empty-filter">
                    <strong>Nenhuma empresa neste filtro.</strong>
                    <span>Tente outro status ou limpe a busca.</span>
                    {filter !== 'all' ? (
                      <button type="button" onClick={() => setFilter('all')}>Mostrar todas</button>
                    ) : null}
                  </div>
                ) : null}
                {displayedBusinesses.map(item => (
                  <button
                    key={item.id}
                    className="platform-business-row"
                    type="button"
                    onClick={() => void openBusiness(item.id)}
                  >
                    <span><strong>{item.name}</strong><small>/{item.slug}</small></span>
                    <span>{item.subscription.planCode}</span>
                    <span className={`subscription-status is-${item.subscription.status}`}>
                      {statusLabel(item.subscription.status)}
                    </span>
                    <span>{item.memberCount}</span>
                    <span>Gerenciar →</span>
                  </button>
                ))}
              </section>
            </section>
          ) : null}

          {section === 'health' ? <PlatformSystemHealthPanel onAttention={setAttentionCount} /> : null}
          {section === 'logs' ? <PlatformSystemLogsPanel onAttention={setAttentionCount} /> : null}
          {section === 'audit' ? <PlatformAuditPanel /> : null}
        </div>
      </div>

      {selected ? (
        <PlatformBusinessDetailsPanel
          details={selected}
          actionLoading={actionLoading}
          canMutate={session.admin.role === 'super_admin'}
          onClose={() => setSelected(null)}
          onRequestDelete={() => setDeleteDialogOpen(true)}
          onAction={subscriptionAction}
        />
      ) : null}

      {selected ? (
        <PlatformDeleteBusinessDialog
          open={deleteDialogOpen}
          businessName={selected.business.name}
          businessSlug={selected.business.slug}
          loading={actionLoading}
          onClose={() => {
            if (!actionLoading) setDeleteDialogOpen(false);
          }}
          onConfirm={hardDeleteSelected}
        />
      ) : null}

      {notice ? (
        <div className={`platform-admin-toast is-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          <span>{notice.tone === 'success' ? '✓' : '!'}</span>
          <p>{notice.message}</p>
          <button type="button" aria-label="Fechar aviso" onClick={() => setNotice(null)}>×</button>
        </div>
      ) : null}
    </main>
  );
}

function Metric({ label, value, attention = false }: { label: string; value: number; attention?: boolean }) {
  return <div className={attention ? 'is-attention' : ''}><span>{label}</span><strong>{value}</strong></div>;
}

function FilterButton({ active, label, count, attention = false, onClick }: {
  active: boolean;
  label: string;
  count: number;
  attention?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${active ? 'is-active' : ''} ${attention && count > 0 ? 'is-attention' : ''}`.trim()}
      onClick={onClick}
    >
      <span>{label}</span><strong>{count}</strong>
    </button>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    trial: 'Teste', active: 'Ativo', past_due: 'Em atraso', suspended: 'Suspenso', cancelled: 'Cancelado'
  };
  return labels[status] ?? status;
}

function successMessage(action: AdminAction, businessName: string): string {
  const messages: Record<AdminAction, string> = {
    update_settings: `Configurações de ${businessName} salvas.`,
    start_trial: `Período de teste de ${businessName} iniciado.`,
    activate: `${businessName} está com o acesso ativo.`,
    mark_past_due: `${businessName} foi marcado como em atraso.`,
    suspend: `Acesso de ${businessName} suspenso. Os dados continuam preservados.`,
    cancel: `Assinatura de ${businessName} cancelada. Os dados entraram em retenção.`
  };
  return messages[action];
}
