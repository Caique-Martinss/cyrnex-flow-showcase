import { useEffect, useMemo, useState } from 'react';
import {
  getErrorMessage,
  getPlatformSystemLogs,
  type PlatformLogSeverity,
  type PlatformSystemLog
} from '../../services';
import { diagnoseLog, severityGuides } from './platformLogDiagnostics';

const severities: Array<{ value: '' | PlatformLogSeverity; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'critical', label: 'Críticos' },
  { value: 'error', label: 'Erros' },
  { value: 'warn', label: 'Alertas' },
  { value: 'info', label: 'Info' }
];

const guideSeverities: PlatformLogSeverity[] = ['critical', 'error', 'warn', 'info'];

export function PlatformSystemLogsPanel({ onAttention }: { onAttention?: (count: number) => void }) {
  const [logs, setLogs] = useState<PlatformSystemLog[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [severity, setSeverity] = useState<'' | PlatformLogSeverity>('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [severity, category, search]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => void load(false), 20_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, severity, category, search]);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const result = await getPlatformSystemLogs({ severity, category, search, limit: 180 });
      setLogs(result.logs);
      setCategories(result.categories);
      const criticalOrError = result.logs.filter(
        item => item.severity === 'critical' || item.severity === 'error'
      ).length;
      onAttention?.(criticalOrError);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  const counts = useMemo(() => ({
    critical: logs.filter(item => item.severity === 'critical').length,
    error: logs.filter(item => item.severity === 'error').length,
    warn: logs.filter(item => item.severity === 'warn').length
  }), [logs]);

  return (
    <section className="platform-admin-observability-page">
      <div className="platform-admin-page-heading">
        <div>
          <span>OBSERVABILIDADE</span>
          <h1>Logs do sistema</h1>
          <p>Falhas e eventos explicados em linguagem prática, com causa provável e onde investigar.</p>
        </div>
        <div className="platform-log-page-actions">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={event => setAutoRefresh(event.target.checked)}
            />
            Auto
          </label>
          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      <section className="platform-observability-guide">
        <button
          type="button"
          className="platform-observability-guide-head"
          onClick={() => setShowGuide(current => !current)}
        >
          <span>
            <strong>Como interpretar os níveis</strong>
            <small>O nível indica prioridade, não apenas “quantos erros existem”.</small>
          </span>
          <b>{showGuide ? 'Ocultar' : 'Ver guia'}</b>
        </button>
        {showGuide ? (
          <div className="platform-severity-guide-grid">
            {guideSeverities.map(item => (
              <article key={item} className={`is-${item}`}>
                <span className={`platform-log-severity is-${item}`}>
                  {severityGuides[item].label.toUpperCase()}
                </span>
                <strong>{severityGuides[item].short}</strong>
                <p>{severityGuides[item].description}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="platform-log-summary">
        <span><b>{counts.critical}</b> críticos visíveis</span>
        <span><b>{counts.error}</b> erros visíveis</span>
        <span><b>{counts.warn}</b> alertas visíveis</span>
      </div>

      <div className="platform-log-toolbar">
        <div className="platform-log-severity-filter">
          {severities.map(item => (
            <button
              key={item.label}
              type="button"
              className={severity === item.value ? 'is-active' : ''}
              onClick={() => setSeverity(item.value)}
            >{item.label}</button>
          ))}
        </div>
        <select value={category} onChange={event => setCategory(event.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map(item => <option value={item} key={item}>{humanCategory(item)}</option>)}
        </select>
        <input
          type="search"
          placeholder="Buscar mensagem, rota ou origem"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
      </div>

      {error ? <div className="platform-admin-error">{error}</div> : null}
      <div className="platform-system-log-list">
        {loading && logs.length === 0 ? <p className="platform-admin-loading">Carregando logs...</p> : null}
        {!loading && logs.length === 0 ? (
          <div className="platform-log-empty">
            <strong>Nenhum log encontrado.</strong>
            <span>Isso pode significar que não houve eventos para o filtro atual.</span>
          </div>
        ) : null}
        {logs.map(log => (
          <SystemLogRow
            key={log.id}
            log={log}
            expanded={expanded === log.id}
            onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
          />
        ))}
      </div>
    </section>
  );
}

function SystemLogRow({
  log,
  expanded,
  onToggle
}: {
  log: PlatformSystemLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const diagnostic = diagnoseLog(log);
  return (
    <article className={`platform-system-log-row is-${log.severity}`}>
      <button type="button" onClick={onToggle} aria-expanded={expanded}>
        <span className={`platform-log-severity is-${log.severity}`}>{severityLabel(log.severity)}</span>
        <span className="platform-log-main">
          <strong>{log.message}</strong>
          <small>{humanCategory(log.category)} · {log.source}{log.route ? ` · ${log.route}` : ''}</small>
        </span>
        <span className="platform-log-meta">
          {log.httpStatus ? <b>HTTP {log.httpStatus}</b> : null}
          {log.durationMs !== null ? <small>{log.durationMs} ms</small> : null}
          <time>{formatDateTime(log.createdAt)}</time>
        </span>
        <span className="platform-log-expand">{expanded ? '−' : '+'}</span>
      </button>
      {expanded ? <LogExplanation log={log} diagnostic={diagnostic} /> : null}
    </article>
  );
}

function LogExplanation({
  log,
  diagnostic
}: {
  log: PlatformSystemLog;
  diagnostic: ReturnType<typeof diagnoseLog>;
}) {
  return (
    <div className="platform-system-log-details">
      <section className="platform-log-human-explanation">
        <article className="is-meaning">
          <span>O QUE ISSO SIGNIFICA</span>
          <p>{diagnostic.meaning}</p>
        </article>
        <article className="is-impact">
          <span>IMPACTO PROVÁVEL</span>
          <p>{diagnostic.impact}</p>
        </article>
        <DiagnosticList title="CAUSAS MAIS PROVÁVEIS" items={diagnostic.likelyCauses} />
        <DiagnosticList title="ONDE INVESTIGAR / ARRUMAR" items={diagnostic.investigate} codeLike />
        <DiagnosticList title="O QUE FAZER AGORA" items={diagnostic.actions} ordered />
        <article className="is-resolved">
          <span>CONSIDERE RESOLVIDO QUANDO</span>
          <p>{diagnostic.resolvedWhen}</p>
        </article>
      </section>

      <details className="platform-log-technical-details">
        <summary>Contexto técnico</summary>
        <div className="platform-log-technical-grid">
          <Info label="ID" value={log.id} />
          <Info label="Request ID" value={log.requestId ?? '—'} />
          <Info label="Business ID" value={log.businessId ?? '—'} />
          <Info label="Categoria" value={log.category} />
          <Info label="Origem" value={log.source} />
          <Info label="Rota" value={log.route ?? '—'} />
        </div>
        <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
      </details>
    </div>
  );
}

function DiagnosticList({
  title,
  items,
  ordered = false,
  codeLike = false
}: {
  title: string;
  items: string[];
  ordered?: boolean;
  codeLike?: boolean;
}) {
  const List = ordered ? 'ol' : 'ul';
  return (
    <article>
      <span>{title}</span>
      <List className={codeLike ? 'is-code-like' : ''}>
        {items.map(item => <li key={item}>{item}</li>)}
      </List>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><code>{value}</code></div>;
}

function severityLabel(value: PlatformLogSeverity): string {
  return ({ debug: 'DEBUG', info: 'INFO', warn: 'ALERTA', error: 'ERRO', critical: 'CRÍTICO' })[value];
}

function humanCategory(value: string): string {
  const labels: Record<string, string> = {
    http_5xx: 'Erro HTTP 5xx',
    slow_request: 'Requisição lenta',
    lifecycle: 'Ciclo da API',
    process_failure: 'Falha do processo',
    unhandled_error: 'Erro não tratado',
    security: 'Segurança',
    request_rejected: 'Requisição rejeitada',
    tenant_deletion: 'Exclusão de empresa'
  };
  return labels[value] ?? value.replaceAll('_', ' ');
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}
