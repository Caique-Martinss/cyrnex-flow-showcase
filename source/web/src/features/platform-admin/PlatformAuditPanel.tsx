import { useEffect, useState } from 'react';
import { getErrorMessage, getPlatformAuditLogs, type PlatformAuditLog } from '../../services';

export function PlatformAuditPanel() {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function load() {
    setLoading(true);
    setError('');
    try { setLogs(await getPlatformAuditLogs(search)); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  }

  return (
    <section className="platform-admin-observability-page">
      <div className="platform-admin-page-heading">
        <div>
          <span>SEGURANÇA & GOVERNANÇA</span>
          <h1>Auditoria da plataforma</h1>
          <p>Quem alterou assinaturas, suspendeu, cancelou ou excluiu empresas.</p>
        </div>
        <input
          className="platform-audit-search"
          type="search"
          placeholder="Buscar empresa ou ação"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </div>
      {error ? <div className="platform-admin-error">{error}</div> : null}
      <div className="platform-global-audit-list">
        {loading ? <p className="platform-admin-loading">Carregando auditoria...</p> : null}
        {!loading && logs.length === 0 ? (
          <div className="platform-log-empty"><strong>Nenhuma ação encontrada.</strong></div>
        ) : null}
        {logs.map(log => (
          <article key={log.id}>
            <span className="platform-audit-icon">{log.action === 'business.hard_delete' ? '!' : '↺'}</span>
            <div>
              <strong>{auditLabel(log.action)}</strong>
              <small>
                {log.businessName
                  ? `${log.businessName}${log.businessSlug ? ` · /${log.businessSlug}` : ''}`
                  : 'Empresa removida ou não vinculada'}
              </small>
              <p>{auditReason(log.metadata)}</p>
            </div>
            <time>{formatDateTime(log.createdAt)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

function auditLabel(action: string): string {
  const labels: Record<string, string> = {
    'subscription.update_settings': 'Configuração da assinatura atualizada',
    'subscription.start_trial': 'Período de teste iniciado',
    'subscription.activate': 'Assinatura ativada',
    'subscription.mark_past_due': 'Assinatura marcada em atraso',
    'subscription.suspend': 'Acesso suspenso',
    'subscription.cancel': 'Assinatura cancelada',
    'business.hard_delete': 'Empresa excluída definitivamente'
  };
  return labels[action] ?? action;
}
function auditReason(metadata: Record<string, unknown>): string {
  const reason = typeof metadata.reason === 'string' ? metadata.reason.trim() : '';
  return reason || 'Sem observação registrada.';
}
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
