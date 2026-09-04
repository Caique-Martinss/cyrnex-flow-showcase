import type { PlatformLogSeverity, PlatformSystemLog } from '../../services';

export interface LogDiagnostic {
  meaning: string;
  impact: string;
  likelyCauses: string[];
  investigate: string[];
  actions: string[];
  resolvedWhen: string;
}

export interface SeverityGuide {
  label: string;
  short: string;
  description: string;
}

export const severityGuides: Record<PlatformLogSeverity, SeverityGuide> = {
  debug: {
    label: 'Debug',
    short: 'Detalhe técnico',
    description: 'Informação de diagnóstico. Normalmente não representa falha para o cliente.'
  },
  info: {
    label: 'Info',
    short: 'Evento normal',
    description: 'Algo esperado aconteceu, como inicialização da API ou ação administrativa concluída.'
  },
  warn: {
    label: 'Alerta',
    short: 'Atenção preventiva',
    description: 'Algo saiu do padrão, mas a operação pode ter continuado. Vale investigar se repetir.'
  },
  error: {
    label: 'Erro',
    short: 'Operação falhou',
    description: 'Uma requisição ou processo falhou. Pode afetar um usuário ou fluxo específico.'
  },
  critical: {
    label: 'Crítico',
    short: 'Risco alto',
    description: 'Pode envolver indisponibilidade, segurança, integridade de dados ou falha irreversível.'
  }
};

export function diagnoseLog(log: PlatformSystemLog): LogDiagnostic {
  const routeArea = resolveRouteArea(log.route);
  const base = categoryDiagnostic(log, routeArea);
  return {
    ...base,
    investigate: unique([...base.investigate, ...routeArea.files])
  };
}

function categoryDiagnostic(log: PlatformSystemLog, routeArea: RouteArea): LogDiagnostic {
  if (log.category === 'http_5xx') return http5xxDiagnostic(log, routeArea);
  if (log.category === 'slow_request') return slowRequestDiagnostic(log, routeArea);
  if (log.category === 'security') return securityDiagnostic(log);
  if (log.category === 'request_rejected') return rejectedDiagnostic(log, routeArea);
  if (log.category === 'tenant_deletion') return deletionDiagnostic(log);
  if (log.category === 'lifecycle') return lifecycleDiagnostic(log);
  if (log.category === 'process_failure') return processFailureDiagnostic(log);
  if (log.category === 'unhandled_error') return unhandledDiagnostic(log, routeArea);

  return {
    meaning: `O CYRNEX registrou um evento da categoria “${humanCategory(log.category)}”.`,
    impact: severityGuides[log.severity].description,
    likelyCauses: [
      'Condição específica do módulo que gerou o evento.',
      'Integração, validação ou dependência temporariamente fora do comportamento esperado.'
    ],
    investigate: unique([
      routeArea.label ? `Área provável: ${routeArea.label}.` : 'Confira a origem e a rota registradas.',
      ...routeArea.files,
      'Use Request ID e horário para relacionar eventos próximos.'
    ]),
    actions: [
      'Abra os metadados técnicos e confirme o horário, rota, origem e Request ID.',
      'Tente reproduzir o fluxo em staging com dados fictícios.',
      'Procure logs do mesmo horário para identificar o primeiro erro da sequência.'
    ],
    resolvedWhen: 'O fluxo volta a funcionar e o evento deixa de se repetir nos testes equivalentes.'
  };
}

function http5xxDiagnostic(log: PlatformSystemLog, routeArea: RouteArea): LogDiagnostic {
  return {
    meaning: (
      `A API recebeu uma requisição${routeArea.label ? ` de ${routeArea.label}` : ''}, `
      + `mas terminou com HTTP ${log.httpStatus ?? '5xx'}. Isso indica falha no servidor.`
    ),
    impact: 'A operação daquele usuário provavelmente não foi concluída. O restante da API pode continuar online.',
    likelyCauses: [
      'Erro inesperado no backend durante a execução da rota.',
      'Falha de consulta ou escrita no PostgreSQL/Supabase.',
      'Exceção de integração, validação incompleta ou estado inesperado dos dados.'
    ],
    investigate: unique([
      routeArea.label ? `Fluxo afetado: ${routeArea.label}.` : 'Confira a rota HTTP indicada.',
      'server/src/middleware/errorHandlers.ts',
      ...routeArea.files,
      'Pesquise o mesmo Request ID em logs próximos.'
    ]),
    actions: [
      'Abra os detalhes e copie o Request ID.',
      'Confira se banco e Storage estavam operacionais no mesmo horário.',
      'Reproduza a mesma ação em staging.',
      'Corrija a causa no módulo da rota, sem esconder o erro apenas no frontend.'
    ],
    resolvedWhen: 'A mesma requisição conclui sem 5xx e não gera novo erro equivalente após o teste.'
  };
}

function slowRequestDiagnostic(log: PlatformSystemLog, routeArea: RouteArea): LogDiagnostic {
  const threshold = numberMetadata(log, 'threshold') ?? 1800;
  return {
    meaning: (
      `A requisição levou ${log.durationMs ?? 'mais tempo que o esperado'} ms. `
      + `O limite atual de alerta é aproximadamente ${threshold} ms.`
    ),
    impact: 'A operação pode ter funcionado, mas o usuário percebe lentidão. Repetição pode degradar a experiência.',
    likelyCauses: [
      'Consulta ao banco lenta ou trazendo dados demais.',
      'Muitas operações sequenciais em vez de uma consulta otimizada.',
      'Latência externa, cold start do hosting ou processamento excessivo no backend.'
    ],
    investigate: unique([
      routeArea.label ? `Fluxo afetado: ${routeArea.label}.` : 'Confira a rota lenta.',
      ...routeArea.files,
      'server/src/middleware/requestTelemetry.ts',
      'Supabase Performance Advisor e índices relacionados à consulta.'
    ]),
    actions: [
      'Veja se a lentidão foi isolada ou aparece várias vezes na mesma rota.',
      'Compare duração da API com a latência do banco na tela Saúde.',
      'Analise a consulta e reduza payload, chamadas repetidas ou processamento desnecessário.',
      'No Render Free, considere cold start antes de classificar como regressão.'
    ],
    resolvedWhen: `A rota permanece abaixo de ${threshold} ms em execuções normais e sem regressão funcional.`
  };
}

function securityDiagnostic(log: PlatformSystemLog): LogDiagnostic {
  const cors = log.source.toLowerCase().includes('cors') || log.message.toLowerCase().includes('cors');
  return {
    meaning: cors
      ? 'Uma origem tentou acessar a API e foi bloqueada pela política CORS.'
      : 'Uma proteção de segurança rejeitou uma tentativa ou condição não permitida.',
    impact: cors
      ? 'Pode ser proteção funcionando corretamente ou configuração errada do domínio do frontend.'
      : 'Normalmente a ação é bloqueada antes de alcançar dados sensíveis.',
    likelyCauses: cors
      ? [
          'Acesso vindo de domínio não autorizado.',
          'CORS_ORIGIN ainda aponta para URL antiga ou não inclui o staging correto.',
          'Tentativa automatizada ou requisição externa indevida.'
        ]
      : [
          'Usuário sem permissão para a ação.',
          'Sessão ausente/expirada ou regra de segurança acionada.',
          'Requisição fora do formato ou origem permitidos.'
        ],
    investigate: [
      'server/src/app.ts',
      'Variável CORS_ORIGIN no hosting.',
      'Rotas de autenticação e middleware de autorização relacionados ao evento.'
    ],
    actions: [
      'Confirme se a origem deveria realmente ter acesso.',
      'Se for o frontend oficial, revise CORS_ORIGIN sem usar * com credenciais.',
      'Se a origem for desconhecida, mantenha o bloqueio e observe repetição.'
    ],
    resolvedWhen: 'Origens legítimas funcionam e origens não autorizadas continuam sendo recusadas.'
  };
}

function rejectedDiagnostic(log: PlatformSystemLog, routeArea: RouteArea): LogDiagnostic {
  return {
    meaning: 'A API recusou a requisição antes de concluir a operação solicitada.',
    impact: 'Normalmente a ação não é executada. Isso pode ser esperado em validação, autenticação ou limites.',
    likelyCauses: [
      'Dados inválidos ou incompletos.',
      'Usuário sem permissão, sessão inválida ou assinatura bloqueada.',
      'Payload acima do limite ou regra de negócio impedindo a operação.'
    ],
    investigate: unique([
      routeArea.label ? `Fluxo afetado: ${routeArea.label}.` : 'Confira a rota recusada.',
      ...routeArea.files,
      'Validações e middlewares executados antes da rota.'
    ]),
    actions: [
      'Confira o HTTP status e a mensagem devolvida ao cliente.',
      'Valide se a recusa era esperada pela regra de negócio.',
      'Se era uma ação legítima, reproduza em staging e revise a condição que bloqueou.'
    ],
    resolvedWhen: 'A ação legítima funciona e tentativas inválidas continuam sendo rejeitadas corretamente.'
  };
}

function deletionDiagnostic(log: PlatformSystemLog): LogDiagnostic {
  const incomplete = /incomplet|falh/i.test(log.message) || log.severity === 'critical';
  return {
    meaning: incomplete
      ? 'A empresa foi excluída do banco, mas a limpeza de arquivos no Storage não terminou completamente.'
      : 'O CYRNEX registrou uma etapa ou conclusão do processo de exclusão definitiva de empresa.',
    impact: incomplete
      ? 'Os dados operacionais podem ter sido removidos, mas alguns arquivos privados podem ter sobrado no Storage.'
      : 'Evento administrativo esperado quando uma exclusão definitiva foi executada.',
    likelyCauses: incomplete
      ? [
          'Falha temporária de conexão com Supabase Storage.',
          'Objeto/bucket retornou erro durante a remoção.',
          'Timeout ou indisponibilidade parcial depois da transação no banco.'
        ]
      : ['Ação deliberada de Super Admin com confirmação forte.'],
    investigate: [
      'server/src/modules/platform-admin/platformDeletion.service.ts',
      'server/src/database/postgres/platformStorageAdmin.ts',
      'Supabase Storage: buckets business-assets e payment-proofs.',
      'Recibo de exclusão informado nos metadados.'
    ],
    actions: incomplete
      ? [
          'Abra o receiptId e identifique o bucket que falhou.',
          'Confirme se o Supabase Storage está operacional.',
          'Execute a rotina segura de retry da limpeza para o recibo.',
          'Não recrie nem apague dados manualmente sem conferir o recibo.'
        ]
      : [
          'Confirme o recibo de exclusão e a auditoria.',
          'Verifique se a limpeza do Storage terminou como complete.'
        ],
    resolvedWhen: incomplete
      ? 'O recibo indica Storage cleanup complete e nenhum objeto residual daquele tenant permanece.'
      : 'O recibo e a auditoria confirmam a conclusão esperada da exclusão.'
  };
}

function lifecycleDiagnostic(log: PlatformSystemLog): LogDiagnostic {
  return {
    meaning: 'A API iniciou ou registrou uma mudança normal no ciclo de vida do processo.',
    impact: (
      'Isoladamente não é erro. Muitos reinícios em pouco tempo podem indicar instabilidade ' +
      'ou deploys repetidos.'
    ),
    likelyCauses: [
      'Deploy ou restart esperado.',
      'Cold start do plano de hosting.',
      'Reinício após falha do processo, se houver evento crítico imediatamente antes.'
    ],
    investigate: [
      'server/src/index.ts',
      'Histórico de deploy/restart do Render.',
      'Logs críticos e process_failure imediatamente anteriores.'
    ],
    actions: [
      'Se foi deploy planejado, nenhuma ação é necessária.',
      'Se houver muitos inícios sem deploy, correlacione com process_failure e hosting.'
    ],
    resolvedWhen: 'A API permanece estável e novos reinícios só acontecem por deploy/cold start esperado.'
  };
}

function processFailureDiagnostic(log: PlatformSystemLog): LogDiagnostic {
  return {
    meaning: 'O processo Node encontrou uma falha grave que pode encerrar ou desestabilizar a API.',
    impact: 'Alto. Pode causar indisponibilidade até o serviço reiniciar.',
    likelyCauses: [
      'Promise rejeitada sem tratamento.',
      'Exceção não capturada.',
      'Falha fatal de dependência ou bug de runtime.'
    ],
    investigate: [
      'server/src/index.ts',
      'Logs do Render no mesmo segundo do evento.',
      'Evento unhandled_error ou HTTP 5xx imediatamente anterior.'
    ],
    actions: [
      'Trate como incidente prioritário.',
      'Identifique o primeiro stack/error relacionado no hosting.',
      'Reproduza em staging e corrija a exceção raiz.',
      'Confirme estabilidade após o restart.'
    ],
    resolvedWhen: 'A causa raiz está corrigida e a API permanece online sem novo process_failure equivalente.'
  };
}

function unhandledDiagnostic(log: PlatformSystemLog, routeArea: RouteArea): LogDiagnostic {
  return {
    meaning: 'O backend recebeu uma exceção que não foi tratada de forma específica pelo fluxo normal.',
    impact: 'Pode gerar HTTP 500 e interromper a operação que estava em andamento.',
    likelyCauses: [
      'Estado inesperado de dados.',
      'Erro de programação não convertido para uma resposta controlada.',
      'Dependência externa falhou fora do caminho previsto.'
    ],
    investigate: unique([
      'server/src/middleware/errorHandlers.ts',
      ...routeArea.files,
      'Request ID, rota e stack disponível no hosting.'
    ]),
    actions: [
      'Correlacione o Request ID com a rota e o horário.',
      'Descubra a exceção original no log do servidor.',
      'Crie tratamento específico sem mascarar a causa.',
      'Adicione teste de regressão para o cenário.'
    ],
    resolvedWhen: 'O cenário passa a retornar resultado válido ou erro controlado, sem exceção não tratada.'
  };
}

interface RouteArea {
  label: string;
  files: string[];
}

function resolveRouteArea(route: string | null): RouteArea {
  const value = route?.toLowerCase() ?? '';
  const mappings: Array<[string, string, string[]]> = [
    ['/appointments', 'Agenda / atendimentos', [
      'server/src/modules/appointments/appointment.routes.ts',
      'server/src/modules/appointments/appointment.production.repository.ts'
    ]],
    ['/dashboard', 'Visão Geral', [
      'server/src/modules/dashboard/dashboard.routes.ts',
      'server/src/modules/dashboard/dashboard.production.repository.ts'
    ]],
    ['/clients', 'Clientes', [
      'server/src/modules/clients/client.routes.ts',
      'server/src/modules/clients/client.repository.ts'
    ]],
    ['/expenses', 'Financeiro / despesas', [
      'server/src/modules/expenses/expense.routes.ts',
      'server/src/modules/expenses/expense.production.repository.ts'
    ]],
    ['/auth', 'Autenticação', [
      'server/src/modules/auth/productionAuth.routes.ts',
      'server/src/modules/auth/supabaseAuth.service.ts'
    ]],
    ['/public-booking', 'Booking público', [
      'server/src/modules/public-booking/publicBooking.routes.ts',
      'server/src/modules/public-booking/publicBooking.production.repository.ts'
    ]],
    ['/onboarding', 'Onboarding', [
      'server/src/modules/onboarding/onboarding.routes.ts',
      'server/src/modules/onboarding/onboarding.production.repository.ts'
    ]],
    ['/settings', 'Configurações', [
      'server/src/modules/settings/settings.routes.ts',
      'server/src/modules/settings/settings.repository.ts'
    ]],
    ['/platform-admin', 'CYRNEX Admin', [
      'server/src/modules/platform-admin/platformAdmin.routes.ts',
      'server/src/modules/platform-admin/platformAdmin.repository.ts'
    ]]
  ];
  const match = mappings.find(([prefix]) => value.includes(prefix));
  return match ? { label: match[1], files: match[2] } : { label: '', files: [] };
}

function numberMetadata(log: PlatformSystemLog, key: string): number | null {
  const value = log.metadata[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function humanCategory(value: string): string {
  return value.replaceAll('_', ' ');
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
