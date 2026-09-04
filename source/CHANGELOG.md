
## V11.7.2 RC1 — Final Pré-Staging

- congelamento funcional para staging/E2E;
- mensagem do cliente após envio do Pix esclarece que o horário já está reservado;
- gate `check:daily-operations` protege a mensagem de reserva;
- pacote final de documentação de lançamento, operação, piloto e modelos jurídicos/LGPD;
- nenhuma feature nova de negócio e nenhuma migration nova nesta etapa documental.

# V11.7.2 — Daily Operations Stabilization

- estabiliza o produto existente sem adicionar reembolso ou novo módulo comercial;
- painel privado ganha auto-sync a cada 30 s, retorno à aba/foco e indicador de sincronização;
- Agenda passa a receber resumo do último comprovante e diferencia “revisar comprovante” de “sinal pendente”;
- Visão Geral, Financeiro e Clientes passam a abrir o atendimento exato na Agenda;
- atendimento selecionado acompanha reagendamento feito pelo cliente em outro dispositivo;
- conclusão usa a comissão congelada no agendamento e protege preço/taxa em relação ao sinal pago;
- adiciona constraint de banco para taxa de pagamento não ultrapassar o restante após sinal;
- adiciona índice de suporte para a FK `appointment_payment_proofs.reviewed_by` apontada pelo advisor do Supabase;
- upload público valida arquivo no cliente e no servidor e é encerrado para atendimento terminal;
- remove o caminho antigo de simulação de pagamento do fluxo real;
- corrige texto antigo do Onboarding que chamava o sinal Pix já implementado de “em desenvolvimento”;
- adiciona `check:daily-operations`, elevando a bateria para 21 gates estáticos;
- documenta o que está pronto no código/banco e o que ainda precisa ser comprovado em staging/E2E.

# V11.7.1 — Founder Admin Bootstrap

- adiciona `npm run admin:create` para criar a primeira conta Super Admin sem barbearia fictícia;
- senha solicitada apenas em terminal interativo e não persistida pelo projeto;
- cria usuário Auth com metadata de login/nome para o trigger de `user_profiles`;
- promove a identidade diretamente em `platform_admins`;
- mantém `admin:grant` para contas já existentes.

# V11.6.9 — CYRNEX Admin remoto integrado

- migrations de Admin/assinaturas e Observabilidade/exclusão aplicadas deliberadamente no Supabase real;
- hardening com índices de FKs administrativas;
- bootstrap do Super Admin agora aceita `CYRNEX_ADMIN_USERNAME` ou e-mail, sem senha no projeto;
- documentação atualizada para refletir estado remoto real;
- observabilidade explicável V11.6.8 mantida como UX aprovada.

# CYRNEX FLOW — Changelog

## V11.6.8 — Observabilidade explicável

- transforma Saúde e Logs em painéis autoexplicativos para operação não técnica;
- explica o que significa cada nível: Crítico, Erro, Alerta e Info;
- cada log expandido passa a mostrar significado, impacto provável, causas comuns e próximos passos;
- adiciona orientação de onde investigar/arrumar com módulos e arquivos prováveis do projeto;
- adiciona critério de “considere resolvido quando” para evitar fechar incidente cedo demais;
- requisições lentas mostram o limite atual e causas como banco, cold start e processamento excessivo;
- erros HTTP 5xx diferenciam falha de uma operação de queda total da plataforma;
- eventos de segurança explicam quando CORS/bloqueio pode ser esperado ou configuração incorreta;
- exclusão incompleta aponta recibo, Storage, retry seguro e arquivos relacionados;
- Saúde do sistema explica API, PostgreSQL/Supabase, Storage e cada contador de 24 horas;
- mantém contexto técnico separado em uma seção recolhível para não poluir a leitura principal;
- nenhuma regra de negócio, subscription, exclusão ou migration remota foi alterada nesta rodada.

## V11.6.7 — Observabilidade da plataforma + exclusão controlada

- adiciona sidebar própria no CYRNEX Admin: Empresas, Saúde do sistema, Logs e Auditoria;
- adiciona saúde de API, PostgreSQL/Supabase, Storage, processo, memória e incidentes recentes;
- registra respostas 5xx, requisições lentas, CORS/payload bloqueados, startup e falhas críticas do processo;
- sanitiza metadados dos logs para reduzir risco de persistência de secrets/tokens;
- adiciona auditoria global administrativa;
- separa cancelamento reversível de exclusão definitiva;
- exclusão definitiva exige motivo + frase `EXCLUIR <slug>` e confirmação destrutiva;
- backend e RPC revalidam confirmação e papel `super_admin`;
- banco remove tenant de forma transacional e preserva recibo mínimo/auditoria;
- Storage da empresa é limpo depois da transação, com tentativas e incidente crítico se ficar incompleto;
- usuários do Auth não são removidos automaticamente porque podem participar de outras empresas;
- prepara integração futura com monitor externo para detectar indisponibilidade total da API;
- migration destrutiva permanece somente local/preparada para revisão; nada foi aplicado ao Supabase remoto.

## V11.6.6 — Admin mais rápido, autoexplicativo e acesso seguro

- remove alertas/confirmacões nativos do navegador no CYRNEX Admin;
- adiciona popup próprio para suspensão/cancelamento com consequências e motivo obrigatório;
- adiciona toast visual para sucesso/erro;
- adiciona filtros rápidos por status;
- separa salvar plano/vencimento de mudar o status da assinatura (`update_settings`);
- adiciona atalhos de vencimento +30 dias, +1 mês e sem data;
- adiciona ações contextuais como Pagamento recebido, Reativar acesso e Converter teste;
- adiciona presets de teste, tolerância e retenção;
- mantém suspensão/cancelamento sem exclusão destrutiva de dados;
- prepara `npm run admin:grant` para promover uma conta existente a Super Admin sem armazenar senha;
- Admin continua usando a mesma sessão/credenciais do CYRNEX FLOW, com autorização backend-only em `platform_admins`.

## V11.6.5 — Admin integrado e responsivo

- corrige dimensionamento do CYRNEX Admin em desktop, tablet e mobile;
- detalhes da empresa viram drawer/modal com backdrop e fechamento por ESC;
- preview do Admin passa a ter busca, seleção e botões funcionais com simulação local;
- sessão comum informa se a conta possui acesso de plataforma;
- atalho CYRNEX Admin aparece no painel normal somente para contas autorizadas;
- `/admin` reutiliza a mesma sessão HTTP-only quando o fundador já está logado;
- login direto em `/admin` usa o mesmo usuário/senha CYRNEX;
- `support` fica read-only e `super_admin` mantém ações comerciais;
- tela de assinatura bloqueada permite ao super admin retornar ao control plane;
- backend continua revalidando `platform_admins` em todas as rotas administrativas.

## V11.6.3 — Mobile First / Responsividade de Lançamento

- Rodada exclusivamente mobile-first, sem função de negócio nova.
- Painel ganhou navegação inferior dedicada: Início, Agenda, Clientes, Financeiro e Mais.
- `Mais` concentra Página Pública, Configurações, módulos Em desenvolvimento, conta, troca de barbearia e logout.
- Header móvel compacto substitui a dependência da sidebar horizontal.
- Safe-area, `100dvh`, inputs de 16 px e touch targets confortáveis aplicados aos fluxos móveis.
- Agenda Semana vira leitura vertical e Agenda Mês cabe em sete colunas sem rolagem horizontal no telefone.
- Modais, filtros, formulários, Onboarding, Clientes, Financeiro, Configurações, Auth, Página Pública, Booking, Meu Agendamento e Pix receberam ajustes responsivos finais.
- Preview standalone sincronizado e isolado em `crx-preview-1163`.
- Novo `check:mobile-readiness`.
- Matriz automatizada do preview: 25/25 combinações principais sem overflow horizontal em 320/360/375/390/430 px.
- Teste físico em iPhone/Android permanece obrigatório no E2E de staging.

## V11.6.2 — Pix manual com comprovante

- Sinal antecipado via Pix direto para a barbearia, sem custodiar dinheiro no CYRNEX FLOW.
- Meu Agendamento mostra chave/recebedor, upload privado e estados aguardando/confirmado/recusado.
- Comprovantes ficam em bucket privado `payment-proofs`, com RLS/FORCE RLS, URL assinada e limite de 5 MB.
- Agenda permite visualizar, confirmar ou recusar comprovante para owner/manager/receptionist.
- Confirmação grava `deposit_paid_at`, auditoria, Pix e confirmação do atendimento.
- Financeiro passou a contar sinal na data real de confirmação e apenas o restante na conclusão, evitando dupla contagem.
- Visão Geral foi alinhada à mesma definição de recebido.
- Onboarding voltou a permitir sinal somente quando o Pix manual estiver configurado.
- Preview standalone simula cliente → comprovante → Agenda → confirmação → Financeiro.
- Migrations reais aplicadas: `20260831190355_manual_pix_deposit_flow` e `20260831190554_manual_pix_rpc_execute_chain`.
- Security Advisor do Supabase permaneceu com 0 alertas.
- Novo quality gate `check:manual-pix`.
- Auditoria final pós-Pix consolidada em `docs/AUDITORIA-FINAL-V11.6.2.md`.
- Checklist de staging e roteiro E2E de lançamento adicionados à documentação.
- Preview standalone identificado como V11.6.2 e isolado em armazenamento local próprio para evitar herdar dados antigos.

## V11.6.1 — Fechamento pré-staging

- Auditoria global de frontend, backend, Supabase, preview, documentação e quality gates.
- Corrigidos 5 bloqueios concretos de compilação/integração encontrados na V11.6: `Array.at(-1)`, chave financeira da Visão Geral e `SectionHead` da Página Pública.
- WhatsApp, Lista de espera e Relatórios permanecem visíveis no menu como **Em desenvolvimento**, sem rota selecionável.
- Onboarding bloqueia recursos incompletos em vez de oferecer `Ativar`.
- Sinal/depósito obrigatório, lista de espera e regra de sinal após falta também receberam trava no backend/banco para o primeiro lançamento.
- Clientes ganharam edição real.
- Visão Geral passou a alinhar `Recebido` com o Financeiro e reforçou uso do timezone da empresa.
- Recuperação de senha em modo Supabase foi implementada no backend com desafio protegido no PostgreSQL, RLS/FORCE RLS, token por hash, alteração via Auth Admin e revogação de sessões.
- Migrations `production_password_recovery` e `launch_guard_v1161` foram aplicadas no Supabase real; Security Advisor permaneceu com 0 alertas.
- Atalhos de WhatsApp de cliente continuam funcionais por link externo sem liberar o módulo interno ainda simulado.
- Preview standalone sincronizado com o fechamento de lançamento e armazenamento isolado da V11.6.1.
- Novo `check:launch-readiness` e expansão do `check:password-recovery` para cobrir o runtime Supabase.
- O checkpoint ainda é **pré-staging**: dependências/build real, lockfile, GitHub, HTTPS, SMTP real, E2E, multiempresa e backup/restore precisam ser validados no ambiente de lançamento.


## V11.6 UI — Financeiro por período (pré-staging)

- Financeiro passou a ser um grupo na navegação, com submenu `Faturamento` e `Despesas`.
- Faturamento ganhou filtros `Hoje`, `Semana`, `Mês` e `Personalizado`.
- Indicadores do período: Faturado, Recebido, Resultado líquido, Atendimentos e ticket médio.
- Comparação de faturamento usa um período anterior de duração equivalente.
- Entradas ficaram compactas: horário/data + cliente + valor, com detalhes expansíveis ao clicar.
- Filtros de profissional e forma de pagamento ficam recolhidos para evitar poluição visual.
- Despesas ficaram em tela própria e também respeitam o período selecionado.
- `Recebido` nesta etapa representa o valor registrado no atendimento após a taxa de pagamento; conciliação bancária por data real de repasse ainda não foi criada.
- Preview standalone foi sincronizado com o novo fluxo.
- Adicionado `check:finance` ao quality gate para proteger a estrutura V11.6.
- Nenhuma migration nova foi criada nesta rodada; o objetivo é validar UX e leitura financeira antes de aprofundar liquidação bancária.


## V11.5 UI — varredura completa de cores (pré-staging)

- Consolidada a identidade visual claro/escuro em Login, Onboarding e Painel.
- Adicionada folha final `theme-integrity-v115.css`, carregada após os estilos legados.
- Corrigidos vazamentos de superfícies claras em horários profissionais, cópia de horários, serviços/sinal, exemplos financeiros, modais, calendário, slots, chips, rodapés e indicadores.
- Preview standalone sincronizado com a mesma proteção visual do código React real.
- `check:theme-integrity` ganhou guardas específicas da varredura V11.5.
- Nenhuma regra de negócio, Agenda, Supabase, Auth ou segurança foi alterada nesta rodada.


## V11.4.1 UI — correção final de vazamentos de cor
- Corrige superfícies claras remanescentes da Agenda no tema escuro.
- Corrige filtros e detalhes decorativos de Clientes.
- Corrige anel, trilhos e detalhes do Financeiro no tema escuro.
- Faz a prévia pública em modo `auto` acompanhar o tema atual do aparelho/painel.
- Faz modais do preview local herdarem o tema escolhido pelo usuário.


## V11.4 UI — Correção global de cores e temas

- Centraliza a paleta do painel, login e onboarding em tokens oficiais.
- Tema escuro usa a mesma família preto/carvão + dourado da Página Pública.
- Remove vazamentos de branco/verde/amarelo do CSS legado em componentes do painel e onboarding.
- Padroniza cores semânticas de sucesso, aviso e erro nos dois temas.
- Preserva intencionalmente o tema próprio da miniatura da Página Pública dentro do onboarding.
- Não altera regras de Agenda, Auth, Supabase ou negócio.
## V11.3 UI — Login + Onboarding Premium

- Tela de login redesenhada para a mesma identidade visual premium do painel e da Página Pública.
- Login, cadastro e recuperação de senha receberam temas claro/escuro sem alterar as regras de autenticação.
- Onboarding completo foi padronizado com progresso visual, etapas concluídas, topbar, cards e ações no mesmo sistema visual do painel.
- Tema do onboarding usa a preferência do usuário autenticado; a escolha continua persistida por usuário no navegador.
- Tema escuro preserva a paleta preto/carvão + dourado aprovada na Página Pública; tema claro preserva a versão clara premium.
- Preview standalone foi atualizado para permitir testar Login → Cadastro → Onboarding → Painel com a nova identidade.
- Nenhuma regra de Agenda, Supabase, RLS, booking ou autenticação foi simplificada nesta rodada.


## V11.2 UI — Painel unificado + temas claro/escuro

- Painel administrativo padronizado na mesma família visual premium da Página Pública.
- Tema escuro usa preto/carvão + dourado aprovado no site do cliente.
- Tema claro preserva a versão clara premium.
- Preferência de tema persistida por usuário no navegador.
- Visão Geral, Agenda, Clientes, Financeiro, WhatsApp e Configurações compartilham hierarquia, cards e estados visuais.
## Painel Premium V11.1 — Clientes + Financeiro

- Clientes recebeu nova hierarquia visual, indicadores, busca e filtros de novos/recorrentes.
- Clientes ganhou atalho de WhatsApp quando há telefone válido, sem criar um fluxo paralelo.
- Financeiro recebeu leitura do caixa, composição do resultado e ranking real de despesas por categoria.
- Despesas podem ser filtradas por categoria e continuam usando o fluxo real de cadastro/exclusão.
- A linguagem visual foi aproximada da Página Pública sem transformar o painel em uma cópia do site do cliente.
- Nenhuma regra de Agenda, autenticação, multiempresa ou Supabase foi alterada nesta rodada.

# Changelog

## Unreleased — Checkpoint Production Core

- Painel e Página Pública agora têm navegação de mão dupla: o painel abre a página real em nova aba e membros autenticados da própria empresa recebem uma barra administrativa discreta.
- A barra da equipe é invisível para clientes e só aparece após confirmação server-side do vínculo do usuário com o slug visitado.
- “Configurar página” ativa a empresa correta e abre diretamente a etapa de Página Pública do editor; “Ver como cliente” suprime completamente as ferramentas administrativas.
- Em contas com múltiplas barbearias, voltar/configurar troca o contexto para a unidade da página antes de entrar no painel.
- Página Pública/booking ganhou ponte server-side para o Supabase, usando o mesmo motor de disponibilidade da Agenda e revalidação transacional antes de criar o atendimento.
- Confirmações públicas agora geram link seguro de “Meu agendamento”; somente o hash SHA-256 do token é persistido no banco.
- Cliente pode consultar a própria reserva e, quando as regras da empresa permitem, reagendar ou cancelar dentro do prazo configurado; ambas as ações geram timeline e auditoria.
- RPCs públicas sensíveis permanecem inacessíveis diretamente para `anon`/`authenticated`; o gerenciamento passa exclusivamente pelo backend.

- Núcleo operacional privado conectado ao Supabase/PostgreSQL em produção, preservando JSON apenas no preview/desenvolvimento.
- Supabase Auth/JWT integrado ao backend com login por username + senha e isolamento por RLS.
- Clientes, Serviços, Profissionais, Configurações, Agenda, disponibilidade, bloqueios, lista de espera, atendimento passado, despesas e Visão Geral ganharam caminho de produção.
- Mutações críticas da Agenda, bloqueios, lista de espera, atendimento passado e despesas passam por RPCs transacionais; escrita direta nas tabelas sensíveis foi revogada para `authenticated`.
- Double booking e buffer são protegidos pelo PostgreSQL; encaixe exige confirmação/justificativa explícita e não libera novos agendamentos normais sobre o período ocupado.
- Atendimento passado ganhou leitura restrita por papel/solicitante, aprovação auditada, evidência obrigatória e confirmação de conflitos.
- Storage privado por `business_id` protege logo, galeria e portfólio; referências de mídia de outra empresa são rejeitadas.
- Novo quality gate `check:production-core` impede regressões que retornem módulos essenciais ao JSON no modo Supabase.
- Testes transacionais descartáveis confirmaram isolamento, lifecycle, recorrência, disponibilidade, bloqueios, espera, retroativo e financeiro sem deixar dados artificiais no banco.
- Supabase Security Advisor ficou sem alertas após as alterações.
- Este checkpoint ainda não é chamado de v0.12.0: faltam deploy, autenticação HTTP end-to-end hospedada, recuperação de senha online, backups/restore e infraestrutura de produção.

## v0.11.2 — Fechamento da Agenda para o MVP

- Calendário mensal recebeu nova hierarquia visual: número do dia, estado e resumo não ficam mais amontoados.
- Agenda visual separa fim real do serviço do fim reservado com buffer; horários livres começam somente após o buffer.
- Contagens de Dia/Semana/Mês e Resumo do dia ignoram faltas/cancelamentos como operação normal, preservando-os no histórico.
- Datas e horários da Agenda passam a usar o fuso configurado da empresa no frontend.
- Profissionais podem herdar o expediente da empresa ou definir horário semanal próprio.
- Disponibilidade usa a interseção entre expediente da empresa e do profissional; ocupação semanal acompanha essa carga efetiva.
- Configurações continuam impedidas de invalidar silenciosamente atendimentos futuros.
- Galeria do onboarding ganhou `Trocar foto` / `Trocar mídia`, mantendo os outros campos do item.
- Preview standalone acompanha calendário mensal, buffer, horário individual e substituição de mídia.
- Novo quality gate `check:agenda-regressions` executa cenários de buffer, status, horário individual e fuso.
- Agenda declarada fechada para o MVP; próxima prioridade oficial é PostgreSQL/Supabase real.

## v0.11.1 — Estabilização, segurança e correções de regressão

- Corrigida a integridade técnica da camada de ações/controller que havia deixado referências inconsistentes na v0.11.0.
- Adicionada autorização central por cargo no backend para financeiro, configurações e operações sensíveis.
- Frontend deixou de carregar automaticamente dados financeiros/operacionais completos para perfis sem permissão.
- Reforçado o isolamento multiempresa do adapter local com locks por empresa e gravação atômica.
- Adicionados rate limits básicos, limites menores de payload, headers de segurança e CORS explícito.
- Produção passa a recusar configuração insegura de CORS/recuperação de senha.
- API pública passou a respeitar página desativada, `publicVisible`, compatibilidade serviço-profissional e preço público.
- Booking público deixou de sobrescrever silenciosamente nome/e-mail de um cliente apenas por coincidência de telefone.
- Corrigidos filtros de Cancelados/Faltas sem apagar registros nem liberar a verdade histórica.
- Visão Geral e cálculos operacionais foram alinhados aos novos estados do ciclo da Agenda.
- Impedido `Não compareceu` antes do horário e repetição indevida do mesmo status/timestamp.
- Recorrência ganhou validação de escopo e pausa mais consistente; lista de espera não é mais desligada pela normalização de módulos.
- Adicionados snapshots de buffer/comissão e validações de impacto em mudanças de configuração.
- Migration de estabilização atualiza estados operacionais e regras de conflito no PostgreSQL planejado.
- Modal de atendimento e timeline foram refinados; Novo Agendamento ganhou footer sticky real.
- Preview principal atualizado para v0.11.1, com modal maior, timeline legível, footer sticky, filtros de Cancelados/Faltas e confirmações próprias.
- Adicionado `npm run check:security`.


## v0.11.0 — Agenda operacional completa

- Implementado ciclo `Agendado → Confirmado → Cliente chegou → Em atendimento → Concluído`.
- Adicionados horários reais de confirmação, chegada, início e fim, com linha do tempo operacional.
- Início antecipado passou a exigir confirmação explícita e fica registrado.
- Conclusão direta sem iniciar atendimento é recusada pelo backend.
- Encaixe passou a ser um fluxo explícito, com confirmação/justificativa para sobreposição e auditoria.
- Atendimento passado com conflito deixou de ser bloqueado definitivamente: aprovação exige confirmação e justificativa.
- Revisão de atendimento passado mostra dados de conferência e mantém vínculo com o conflito encontrado.
- Adicionada recorrência semanal, quinzenal, mensal e personalizada, com múltiplos dias e alternância de serviços.
- Recorrências podem ser pausadas/retomadas e reagendadas por ocorrência, próximos ou série inteira.
- Busca de próximo horário passou a consultar a mesma disponibilidade do backend usada pelo restante da Agenda.
- Calendário mensal separa claramente número do dia e resumo de atendimentos/fechamento.
- Filtros priorizam os resultados correspondentes sem tratar ocupações ocultas como vagas.
- Adicionados resumo do dia, modo foco, blocos recolhíveis e histórico rápido do cliente.
- Adicionada lista de espera operacional com API, persistência local e correspondência de vaga cancelada.
- Adicionado calendário/seletor oficial reutilizável para os novos fluxos da Agenda.
- Nova migration `20260821001500_agenda_lifecycle.sql`.
- Atualizados documentação, mapa de arquivos e quality gate da Agenda.
- Build completo não foi executado no ambiente de empacotamento porque o npm registry ficou inacessível por `EAI_AGAIN`; os checks independentes de dependências foram executados.

## v0.10.0 — Agenda inteligente e operacional

- Agenda aprofundada com visualizações Dia, Semana e Mês.
- Novo calendário refinado e seleção de horários por disponibilidade real.
- Regras do onboarding passam a comandar antecedência mínima e limite futuro da Agenda.
- Horários passados deixam de ser oferecidos como vagas.
- Duração, buffer, bloqueios, expediente e conflitos são validados pelo mesmo motor.
- Novo agendamento abre limpo e só recebe pré-preenchimento quando existe contexto explícito.
- Adicionados filtros por profissional/status e busca por cliente, serviço ou profissional.
- Adicionados bloqueios de horário, próxima vaga, reagendamento, cancelamento, falta e conclusão.
- Criado fluxo protegido `Registrar atendimento passado`, separado de novo agendamento.
- Atendimento passado exige motivo, evidência e referência verificável antes de entrar em aprovação.
- Funcionários não podem aprovar o próprio lançamento; gerente precisa do dono para o próprio pedido.
- Aprovação/rejeição e lançamento posterior geram trilha de auditoria.
- Nova migration `20260821001400_agenda_operations.sql`.
- Criado `docs/AGENDA.md` e quality gate `npm run check:agenda`.
- Preview standalone atualizado para testar a Agenda v0.10.0.

## v0.9.0 — Visão Geral operacional

- Criada a nova Visão Geral com hierarquia `Agora → Hoje → Contexto complementar`.
- Cabeçalho passa a mostrar saudação, data, status aberto/fechado e atendimento atual/próximo.
- Adicionados atalhos reais para novo agendamento, novo cliente e despesa.
- Atendimento atual/próximo ganhou ações de agenda, WhatsApp e conclusão.
- Indicadores do dia passaram a usar dados reais e comparação com a semana anterior somente quando existe histórico.
- Faturamento geral fica restrito a dono/gerente e depende do módulo Financeiro.
- Criado cálculo de horários livres a partir da agenda configurada, grade e menor duração de serviço.
- Linha do tempo diária diferencia atendimentos de horários livres e pré-preenche o novo agendamento.
- Adicionado indicador de ocupação, alertas operacionais, movimento por hora e resumo financeiro do dia.
- Criados blocos “Seu dia em uma frase” e “Aconteceu hoje”.
- Preview standalone ganhou Visão Geral dinâmica e fluxos locais para cliente, agendamento, despesa e conclusão.
- Adicionado `docs/VISAO-GERAL.md` e quality gate `npm run check:overview`.

## v0.8.2 — Onboarding fechado

- Cálculo das taxas de cartão atualiza em tempo real no preview e mostra taxa descontada + valor líquido.
- Todos os módulos voltaram a ser selecionáveis no onboarding, sem rótulos internos de “Em preparação”.
- Lista de espera voltou a ser uma escolha normal das regras de agendamento.
- Revisão final reflete a lista de espera somente quando regra e módulo estiverem ativos.
- Removidos textos internos de desenvolvimento das etapas 6, 8 e 10.
- Onboarding 1–10 considerado fechado para seguir ao desenvolvimento dos módulos do painel.

## v0.8.1 — Polimento e fechamento do onboarding

- Aplicada a regra oficial de UX: **apareceu = funciona; clicou = responde; erro = explica**.
- Etapa 4 simplificada: dias clicáveis + horário de abertura/fechamento + pausas claras.
- Cópia de horário agora pergunta exatamente em quais dias aplicar e confirma o resultado.
- Hora extra continua como exceção autorizada sem alterar a rotina semanal.
- Etapa 5 ganhou cards de serviço recolhíveis para listas grandes continuarem organizadas.
- Adicionais passaram a exibir `Nome`, `Preço adicional` e `Tempo adicional` explicitamente.
- Regra de sinal do serviço ficou autoexplicativa e mostra quando o percentual geral será definido.
- Sinal específico mostra cálculo de preço, sinal e valor restante em tempo real.
- Etapa 7 corrigida: **Configurar agora** abre realmente as taxas de débito/crédito.
- Taxas mostram exemplo do valor líquido em uma venda de R$ 100,00.
- Campo de maquininha ganhou exemplos e orientação para mais de uma máquina.
- Etapa 9 trocou “Ação principal” por linguagem humana e explica o destaque do botão.
- Aparência `Automático` passou a ser `Seguir o aparelho do cliente`.
- Botão principal da prévia pública agora responde no modo de teste.
- Preview passou a respeitar de verdade a opção **Manter conectado**.
- Recuperação no preview não permite redefinir senha usando e-mail diferente da conta salva.
- Preview trata falta de espaço no `localStorage` ao testar muitas mídias, sem falhar silenciosamente.
- Revisão final ganhou validações adicionais para sinal, taxas e WhatsApp como ação principal.
- Formas de pagamento na revisão aparecem com nomes humanos, não chaves internas.
- Adicionado quality gate `npm run check:interactions` para a regra **apareceu = funciona**.
- Recursos ainda sem tela/fluxo completo aparecem como **Em preparação** e não podem ser ativados prematuramente.
- Lista de espera deixou de fingir disponibilidade no onboarding enquanto o fluxo completo ainda não existe.
- Nenhuma alteração de schema foi necessária nesta versão; a v0.8.1 é uma rodada de UX e comportamento.

## v0.7.4

- Tela de login agora possui caminho claro **Criar minha barbearia**.
- Primeiro cadastro cria proprietário + primeira barbearia e abre o onboarding.
- Donos podem criar novas barbearias dentro de Configurações sem criar outra conta.
- Cada nova unidade nasce zerada e isolada por `business_id`.
- Conta passa a lembrar a última barbearia usada.
- Troca rápida de unidade no menu lateral quando houver mais de uma.
- Área **Minhas barbearias** mostra unidade atual e demais unidades vinculadas.
- Preview funcional atualizado com criação de conta e múltiplas barbearias.
- Novo quality gate `npm run check:businesses`.

## v0.7.3 — Recuperação de senha fechada

- Adicionado cooldown de 60 segundos para reenvio, com contagem regressiva na interface.
- Adicionado limite adicional de solicitações por IP.
- Código de recuperação passou a ser armazenado com `scrypt` e salt aleatório.
- Código confirmado não pode ser confirmado novamente.
- Nova senha não pode ser igual à senha atual.
- E-mail passou a ser único no cadastro local.
- Adicionado envio SMTP real de código de recuperação.
- Adicionado suporte a SMTPS e STARTTLS com opção de exigir TLS.
- Adicionado aviso por e-mail depois da alteração da senha.
- `npm run dev` agora inicia uma caixa SMTP local para teste real de e-mail.
- Adicionado visualizador da caixa local em `http://127.0.0.1:8025`.
- Código de teste deixa de ser exposto no app local executado pelo fluxo padrão.
- Criado `npm run check:password-recovery`.
- Criada documentação e checklist específicos da recuperação de senha.

## v0.7.2 — Recuperação completa de senha

- Criado fluxo Esqueci minha senha por e-mail.
- Adicionado código de 6 dígitos com validade de 10 minutos e limite de tentativas.
- Criada validação do código antes da troca de senha.
- Nova senha encerra sessões antigas do usuário.
- Códigos e tokens de redefinição passam a ser de uso único.
- Adicionado exibir/ocultar senha no login, cadastro e redefinição.
- Regras de senha padronizadas: 8 caracteres, pelo menos uma letra e um número.
- Modo local mostra o código apenas para testes; produção fica preparada para envio por e-mail.
- Quality gate de autenticação ampliado para validar o fluxo de recuperação.

## v0.6.0 — Onboarding e configuração inicial

- Criado onboarding completo em 10 etapas antes da liberação do painel.
- Adicionado salvamento progressivo e edição posterior pela aba Configurações.
- Implementado modo profissional único/equipe com comportamento adaptativo.
- Configuração de dias, horários, pausas, serviços, preços, duração e buffers.
- Configuração de sinal, cancelamento, reagendamento, antecedência e janela futura.
- Formas de pagamento e taxas passaram a ser configuráveis.
- Módulos e regras comerciais configuráveis por estabelecimento.
- Agendamento público passou a respeitar agenda semanal, pausas, buffers e limites.
- Navegação e dashboard passaram a respeitar módulos ativos.
- Criado módulo backend de onboarding com validação própria.
- Adicionada migration 011 para alinhar o onboarding ao schema PostgreSQL.
- Criada documentação de onboarding e mapeamento para o banco definitivo.
- Adicionado `npm run check:onboarding` como quality gate.
- Disponibilidade pública passou a ser calculada pelo servidor no fuso da barbearia.
- Reservas públicas forjadas fora da grade, pausa ou horário configurado são rejeitadas.
- Sinal por serviço pode herdar corretamente a regra padrão da empresa.
- Serviços e profissionais removidos pela configuração são inativados, preservando histórico e permitindo reativação.

## v0.5.0 — Fundação PostgreSQL/Supabase

- Banco definitivo modelado para PostgreSQL/Supabase.
- 50 tabelas organizadas por domínio em 10 migrations.
- Estrutura multiempresa com `business_id` e FKs compostas.
- RLS com papéis owner/manager/professional/receptionist.
- Financeiro restrito e prótese com policy específica.
- Constraint de conflito de agenda por intervalo/profissional.
- Telefone normalizado com UNIQUE parcial por empresa.
- Recorrência com padrão alternado de serviços.
- Lista de espera e ofertas de vaga.
- Contas a receber com ledger e atualização automática de status.
- Estoque baseado em movimentos e view de saldo.
- Loja, pedidos, parcerias, prótese, página pública e mensagens modelados.
- Storage privado por empresa.
- Documentação completa em `docs/database/`.
- `npm run check:database` adicionado como quality gate.
- Adapter JSON isolado atrás de `server/src/database/index.ts` para migração futura.

## 0.4.2 — refatoração estrutural

- preservado o comportamento funcional da v0.4.1;
- `App.tsx` foi reduzido e passou a apenas montar a aplicação;
- frontend dividido em `app`, `features`, `components`, `hooks`, `services`, `domain`, `utils` e `styles`;
- agendamento público separado em componentes menores e fáceis de localizar;
- backend dividido em módulos por domínio em `server/src/modules`;
- acesso ao JSON local isolado em `server/src/database`;
- rotas, serviços e criação de agendamentos deixaram de ficar concentrados em um único arquivo;
- CSS monolítico dividido por responsabilidade;
- adicionada documentação de arquitetura, mapa de arquivos e padrão oficial de código;
- adicionado `npm run check:structure` para validar tamanho de arquivos, linhas e estrutura obrigatória;
- adicionada configuração `.editorconfig`;
- documentado o onboarding como primeira prioridade da próxima versão funcional.

## 0.4.0 — disponibilidade visual e confirmação

- substituído o campo livre de data e horário por uma escolha guiada;
- adicionada faixa com os próximos sete dias e opção de outra data;
- adicionada grade que diferencia horários livres, ocupados e horários que já passaram;
- criado endpoint público de disponibilidade sem expor dados dos clientes;
- adicionados horários de funcionamento à configuração da barbearia;
- o botão de reserva só é liberado após a escolha de um horário realmente disponível;
- após o pagamento do sinal, uma janela confirma o agendamento;
- criado comprovante completo com nome, WhatsApp, serviço, barbeiro, data, duração, valor total, sinal pago e saldo restante;
- a confirmação permanece na tela e pode ser aberta novamente;
- preview atualizado e testado com o fluxo completo.

## 0.3.0 — versão barbearia

- removidos textos e dados do nicho anterior;
- adicionados serviços e barbeiros configurados na base;
- criado fluxo público de autoagendamento;
- criado cadastro automático pelo telefone;
- conflito de agenda agora considera a duração do serviço;
- adicionado sinal percentual e situação de pagamento;
- adicionado fechamento com forma de pagamento e taxa da maquininha;
- adicionadas comissões, despesas e resultado líquido;
- adicionada área financeira;
- atualizados dashboard, agenda, clientes e mensagens;
- criado novo preview independente para barbearia;
- atualizados README, roteiro de demonstração e plano de produto.

## 0.2.0

- transformado o protótipo em um fluxo funcional de clientes e agendamentos;
- adicionada persistência local de dados;
- adicionadas rotas de cadastro, agenda, status e saúde;
- métricas corrigidas para não contabilizar faltas como receita;
- adicionados carregamento, erros, estados vazios e notificações;
- adicionados modo claro/escuro, pesquisa e interface responsiva.

## v0.4.1

- Corrigida a inicialização da API em projetos ESM no Windows.
- Substituído `ts-node-dev` por `tsx watch` no servidor.
- Ajustado o TypeScript do servidor para `NodeNext`.
- Corrigido o inicializador conjunto de `web` e `server` para evitar `spawn EINVAL` no Windows.
## Em desenvolvimento — Base de produção / Supabase Auth

- Banco real Supabase/PostgreSQL provisionado com RLS, FORCE RLS e isolamento multiempresa.
- Constraint PostgreSQL contra double booking respeitando buffer de serviço.
- Storage privado por `business_id`.
- Bootstrap atômico de conta Owner e criação transacional de novas barbearias.
- Runtime de autenticação separado entre `local` e `supabase`.
- Login de produção continua usando username + senha; e-mail permanece para identidade/recuperação.
- Access/refresh tokens de produção ficam em cookies HttpOnly.
- JWT do usuário é anexado ao contexto interno do backend para futuras consultas protegidas por RLS.
- Chave secreta Supabase restrita ao backend e a operações administrativas específicas.
- Histórico antigo de migrations foi movido para `supabase/legacy-migrations-v0.11.2`; a base consolidada do MVP está em `supabase/migrations`.
- Recuperação de senha online ainda é uma pendência deliberada antes do piloto; o fluxo local continua intacto.

## V11.4.2 UI — correções finais da Visão Geral
- Remove fundo branco fixo do anel de ocupação no tema escuro.
- Remove fundo bege/claro fixo do CTA inicial da Visão Geral.
- Corrige contraste dos valores em negrito no resumo inteligente.
- Adiciona guardas equivalentes no CSS React para evitar regressão no app real.

## V11.7.0 — Launch Zero-Config Preparation

- Blueprint `render.yaml` para backend Node/Express + frontend React/Vite no Render;
- template de variáveis de produção sem secrets reais;
- `GET /api/ready` com verificação real de PostgreSQL/Supabase + Storage;
- `/api/health` passa a expor somente a identificação da release;
- graceful shutdown SIGTERM/SIGINT para deploys controlados;
- preflight de configuração de produção;
- quality gate `check:launch-zero-config`;
- CI GitHub para `npm run check` + audit de runtime;
- runbook de go-live, DNS, e-mail, uptime, incidentes e matriz de envs;
- reforço do gate de backup + restore antes do piloto.
