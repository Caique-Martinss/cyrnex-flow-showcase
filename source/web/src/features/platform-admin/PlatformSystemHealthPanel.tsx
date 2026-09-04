import { useEffect, useState } from 'react';
import { getErrorMessage, getPlatformSystemHealth, type PlatformSystemHealth } from '../../services';

export function PlatformSystemHealthPanel({ onAttention }: { onAttention?: (count: number) => void }) {
  const [health, setHealth] = useState<PlatformSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(false), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const next = await getPlatformSystemHealth();
      setHealth(next);
      onAttention?.(next.incidents24h.critical + next.incidents24h.errors);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  return (
    <section className="platform-admin-observability-page">
      <div className="platform-admin-page-heading">
        <div>
          <span>OBSERVABILIDADE</span>
          <h1>Saúde do sistema</h1>
          <p>Veja se o CYRNEX está funcionando e entenda rapidamente o que cada indicador quer dizer.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? 'Verificando...' : 'Atualizar agora'}
        </button>
      </div>

      {error ? <div className="platform-admin-error">{error}</div> : null}
      {!health && loading ? <div className="platform-health-skeleton">Verificando serviços...</div> : null}
      {health ? (
        <>
          <div className={`platform-overall-health is-${health.overallStatus}`}>
            <span className="platform-health-dot" />
            <div>
              <strong>{overallLabel(health.overallStatus)}</strong>
              <small>{overallExplanation(health.overallStatus)}</small>
              <small>Última verificação: {formatDateTime(health.checkedAt)}</small>
            </div>
          </div>

          <div className="platform-health-services">
            <ServiceHealth
              name="API CYRNEX"
              status={health.api.status}
              detail={`Uptime ${formatDuration(health.api.uptimeSeconds)}`}
              explanation="Recebe login, Agenda, Clientes, Financeiro e demais chamadas do sistema."
            />
            <ServiceHealth
              name="PostgreSQL / Supabase"
              status={health.database.status}
              detail={latencyLabel(health.database.latencyMs, health.database.message)}
              explanation="Guarda os dados das empresas. Falha aqui pode impedir leitura e gravação."
            />
            <ServiceHealth
              name="Supabase Storage"
              status={health.storage.status}
              detail={latencyLabel(health.storage.latencyMs, health.storage.message)}
              explanation="Guarda arquivos privados, como comprovantes Pix e mídias da empresa."
            />
          </div>

          <div className="platform-health-incidents">
            <IncidentCard
              label="Críticos · 24h"
              value={health.incidents24h.critical}
              tone="critical"
              help="Risco alto: queda, integridade de dados, segurança ou operação irreversível incompleta."
            />
            <IncidentCard
              label="Erros · 24h"
              value={health.incidents24h.errors}
              tone="error"
              help="Operações que falharam, como respostas HTTP 5xx. Nem sempre significam queda total."
            />
            <IncidentCard
              label="Alertas · 24h"
              value={health.incidents24h.warnings}
              tone="warn"
              help="Condições anormais que merecem atenção, mas podem não ter interrompido a operação."
            />
            <IncidentCard
              label="Requisições lentas"
              value={health.incidents24h.slowRequests}
              help="Chamadas acima do limite de lentidão configurado. Hoje o padrão é 1,8 segundo."
            />
            <IncidentCard
              label="Inícios da API"
              value={health.incidents24h.apiStarts}
              help="Quantas inicializações foram registradas. Pode ser deploy, cold start ou reinício."
            />
          </div>

          <div className="platform-health-grid">
            <article className="platform-health-card">
              <span>PROCESSO DA API</span>
              <p className="platform-health-card-help">
                Informações do processo Node que está executando o backend neste momento.
              </p>
              <dl>
                <Row label="Iniciado" value={formatDateTime(health.api.startedAt)} />
                <Row label="Ambiente" value={health.api.environment} />
                <Row label="Node" value={health.api.nodeVersion} />
                <Row label="Memória RSS" value={`${health.api.memoryMb.rss} MB`} />
                <Row label="Heap" value={`${health.api.memoryMb.heapUsed} / ${health.api.memoryMb.heapTotal} MB`} />
              </dl>
            </article>

            <article className="platform-health-card">
              <span>ÚLTIMO EVENTO CRÍTICO</span>
              <p className="platform-health-card-help">
                O evento de maior prioridade mais recente. Abra Logs para ver causa provável e onde investigar.
              </p>
              {health.lastCritical ? (
                <div className="platform-last-critical">
                  <strong>{health.lastCritical.message}</strong>
                  <small>{health.lastCritical.source} · {health.lastCritical.category}</small>
                  <time>{formatDateTime(health.lastCritical.createdAt)}</time>
                </div>
              ) : (
                <div className="platform-health-ok-message">
                  Nenhum evento crítico registrado nas últimas 24 horas.
                </div>
              )}
            </article>
          </div>

          <section className="platform-health-interpretation">
            <span>COMO LER ESTA TELA</span>
            <div>
              <article>
                <strong>Operacional</strong>
                <p>O serviço respondeu ao teste atual. Isso não garante que nunca houve erro nas últimas 24h.</p>
              </article>
              <article>
                <strong>Operacional com atenção</strong>
                <p>API, banco e Storage respondem, mas existe incidente crítico recente para revisar.</p>
              </article>
              <article>
                <strong>Degradado</strong>
                <p>Banco ou Storage falhou no teste atual. Prioridade alta porque fluxos reais podem parar.</p>
              </article>
            </div>
          </section>

          <div className="platform-external-monitor-note">
            <strong>Detecção de queda total</strong>
            <p>{health.externalMonitor.note}</p>
            <span>
              {health.externalMonitor.configured
                ? 'Monitor externo configurado.'
                : 'Pronto para integrar um monitor externo no staging.'}
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}

function ServiceHealth({
  name,
  status,
  detail,
  explanation
}: {
  name: string;
  status: string;
  detail: string;
  explanation: string;
}) {
  const ok = status === 'operational';
  return (
    <article className={`platform-service-health ${ok ? 'is-ok' : 'is-down'}`}>
      <div><span className="platform-health-dot" /><strong>{name}</strong></div>
      <b>{ok ? 'Operacional' : 'Falha'}</b>
      <small>{detail}</small>
      <p>{explanation}</p>
    </article>
  );
}

function IncidentCard({
  label,
  value,
  tone = 'default',
  help
}: {
  label: string;
  value: number;
  tone?: string;
  help: string;
}) {
  return (
    <article className={`platform-incident-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{help}</small>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function overallLabel(status: PlatformSystemHealth['overallStatus']): string {
  if (status === 'operational') return 'Sistema operacional';
  if (status === 'attention') return 'Sistema operacional com atenção';
  return 'Sistema degradado';
}

function overallExplanation(status: PlatformSystemHealth['overallStatus']): string {
  if (status === 'operational') return 'Os serviços principais responderam e não há crítico recente.';
  if (status === 'attention') return 'Os serviços respondem, mas existe pelo menos um crítico nas últimas 24h.';
  return 'Banco ou Storage não respondeu corretamente na verificação atual.';
}

function latencyLabel(latency: number | null, message?: string): string {
  return latency === null ? (message || 'Indisponível') : `${latency} ms`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}min` : `${minutes}min`;
}
