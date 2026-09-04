# Agenda v0.11.2

A Agenda é o centro operacional diário da barbearia. A v0.11.2 fecha esta etapa para o MVP: mantém a estabilização/segurança da v0.11.1 e corrige os últimos pontos de disponibilidade, fuso, expediente individual e apresentação mensal encontrados na revisão manual.

## Fechamento da etapa na v0.11.2

A Agenda passa a ser tratada como **fechada para o MVP**, sem expansão de escopo antes do piloto. Novas mudanças nesta área devem ser correções de regressão ou problemas reais descobertos no uso.

Correções finais:

- o calendário mensal separa número do dia, estado e resumo, sem textos sobrepostos;
- a duração exibida do atendimento termina no fim real do serviço, enquanto `bufferAfterMinutes` continua reservando o recurso até o horário correto;
- faltas e cancelamentos permanecem consultáveis, mas não entram na contagem operacional normal;
- toda a Agenda usa o fuso configurado da empresa para interpretar o dia/horário comercial;
- cada profissional pode herdar o expediente da empresa ou definir horário próprio;
- disponibilidade e ocupação respeitam a **interseção** entre expediente da empresa e expediente do profissional;
- salvar uma configuração que invalide um atendimento futuro continua bloqueado com explicação;
- cenários executáveis de regressão cobrem buffer, status, expediente individual e fuso.

## Princípios

- **Apareceu = funciona.** Horários exibidos como livres precisam ser realmente reserváveis.
- **Uma fonte de verdade.** Expediente, pausas, duração, buffer, profissional, conflitos, bloqueios, passado, antecedência e horizonte futuro usam o mesmo motor.
- **Erro explica.** Uma ação inválida informa o que aconteceu e o que precisa ser corrigido.
- **Contexto sem sujeira.** `Novo agendamento` abre limpo; pré-preenchimento só acontece quando a abertura veio de um horário/profissional específico.
- **Conflito nunca é silencioso.** Agendamento comum bloqueia sobreposição; encaixe e atendimento passado exigem confirmação explícita e auditoria.

## Visualizações

- **Dia:** linha do tempo por profissional, atendimentos, bloqueios e horários livres.
- **Semana:** visão resumida para navegar rapidamente entre os dias.
- **Mês:** cada célula separa claramente o número do dia do resumo (`10 atendimentos`, `Sem atendimentos` ou `Fechado`).

Filtros priorizam visualmente os resultados correspondentes sem transformar horários realmente ocupados em disponíveis. Ocupações ocultas pelo filtro permanecem protegidas e são resumidas de forma compacta.

## Calendário oficial e disponibilidade

O componente `OfficialDateTimePicker.tsx` reutiliza o calendário inteligente oficial nos fluxos novos da Agenda. O cálculo de disponibilidade continua centralizado no backend em `server/src/modules/scheduling/availability.service.ts` e é consultado pelo frontend por `web/src/services/agenda.api.ts`.

O motor considera:

- horário de funcionamento e pausas;
- duração do serviço e buffer;
- profissional escolhido e serviços habilitados;
- agendamentos existentes;
- bloqueios da agenda;
- datas e horários passados;
- antecedência mínima;
- limite máximo de agendamento futuro;
- conflitos.

A busca **Encontrar próximo horário disponível** usa essa mesma API, em vez de manter uma regra paralela no componente.

## Novo agendamento e encaixe

Agendamento normal futuro não aceita horário passado nem sobreposição. A validação existe no frontend e no backend.

Encaixe é tratado separadamente:

1. o backend detecta a sobreposição;
2. retorna o atendimento conflitante;
3. a interface pede confirmação explícita;
4. exige justificativa;
5. salva a decisão na linha do tempo e na auditoria.

Um encaixe não pode virar recorrência na mesma criação.

## Ciclo operacional

Fluxo principal:

`Agendado → Confirmado → Cliente chegou → Em atendimento → Concluído`

Também existem:

- `Não compareceu`;
- `Cancelado`;
- `Reagendado`.

A conclusão só é permitida depois de `Iniciar atendimento`. O backend valida a transição, portanto não é possível contornar a regra enviando apenas uma requisição manual.

Se o atendimento for iniciado antes do horário programado, a interface pede confirmação e o backend exige `confirmEarlyStart`. O horário real de início é registrado.

Na conclusão podem ser informados serviço final, valor final, pagamento e observação. A conclusão continua alimentando histórico, financeiro e dados operacionais já existentes.

## Linha do tempo

Cada atendimento possui eventos operacionais como:

- criação;
- confirmação;
- chegada;
- início real;
- conclusão;
- reagendamento;
- cancelamento;
- falta;
- confirmação de conflito/encaixe.

A linha do tempo aparece no inspetor do atendimento e também serve de apoio à auditoria.

## Registrar atendimento passado

`Registrar atendimento passado` continua separado de `Novo agendamento`.

A solicitação registra:

- cliente e telefone consultável na revisão;
- serviço;
- profissional;
- data/hora passada;
- valor;
- pagamento;
- observação;
- motivo;
- tipo de evidência;
- referência verificável;
- descrição da evidência.

Até a aprovação, o lançamento **não entra definitivamente no histórico nem no financeiro**.

### Conflito em atendimento passado

Conflito não bloqueia definitivamente a aprovação. O sistema:

1. identifica e mantém o vínculo com o atendimento conflitante;
2. exibe aviso forte na revisão;
3. exige confirmação explícita de que o conflito foi conferido;
4. exige justificativa;
5. registra aprovador, evidência, conflito e justificativa na auditoria;
6. cria o atendimento retroativo como concluído após a aprovação.

Sem confirmação e justificativa, o backend responde com conflito e não aprova.

### Regras de aprovação

- profissional/recepcionista: dono ou gerente pode revisar, mas nunca o próprio solicitante;
- gerente: lançamento próprio ou de nível equivalente precisa de validação do dono;
- dono: continua autorizado a tratar a exceção administrativa registrada na auditoria;
- rejeição exige motivo;
- aprovação exige confirmação da evidência.

## Recorrência

A base v0.11.x suporta:

- semanal;
- quinzenal;
- mensal;
- personalizada;
- múltiplos dias da semana quando aplicável;
- alternância de serviços na sequência.

Cada ocorrência é validada pelo motor de disponibilidade antes da sequência ser criada. Se uma ocorrência não couber, a criação é interrompida com mensagem indicando onde está o problema.

Uma recorrência pode ser pausada e retomada. Ao reagendar um atendimento recorrente, o escopo pode ser:

- somente este atendimento;
- este e os próximos;
- toda a sequência.

## Lista de espera

A Agenda ganhou fluxo próprio de lista de espera com API e persistência no adapter local:

- cadastro de cliente, serviço, profissional opcional e janela desejada;
- status da entrada;
- atualização de contato;
- identificação de clientes compatíveis quando um cancelamento libera uma vaga;
- atalho para WhatsApp quando o módulo estiver ativo.

A implementação local fica em:

```text
web/src/features/agenda/WaitlistPanel.tsx
web/src/services/waitlist.api.ts
server/src/modules/waitlist/waitlist.routes.ts
```

O schema PostgreSQL definitivo já possuía fundação de lista de espera; a linha v0.11.x conecta o fluxo operacional do piloto local.

## Resumo, foco e blocos recolhíveis

A Agenda possui:

- resumo do dia;
- modo foco para priorizar o que ainda importa;
- seções recolhíveis;
- preferência de aberto/fechado lembrada no navegador;
- histórico rápido do cliente dentro do atendimento;
- aviso operacional de atrasos quando aplicável.

Informações críticas continuam visíveis mesmo quando áreas auxiliares são recolhidas.

## Banco e migration

As migrations principais desta etapa são:

```text
supabase/migrations/20260821001500_agenda_lifecycle.sql
supabase/migrations/20260825001600_stabilization_security.sql
```

A segunda consolida a estabilização dos estados operacionais, snapshots e regras de conflito/recorrência que precisavam acompanhar a evolução da Agenda.

## Preview standalone

`ABRIR-PREVIEW-CYRNEX-FLOW.html` continua sendo uma demonstração local sem plugins. Ele não substitui o projeto React/API e não deve ser tratado como código de produção.

O preview acompanha os fluxos que podem ser demonstrados sem backend real. Recursos que dependem de validação servidor/banco definitivo devem ser verificados no app normal quando as dependências estiverem instaladas.

## Verificação da versão

Os quality gates da Agenda verificam estrutura, arquivos principais, regras de estabilização e sintaxe do preview. `check:agenda-regressions` executa cenários concretos de buffer, status, expediente individual e fuso. `check:security` adiciona verificações estruturais de autorização, isolamento e API pública. O build/typecheck completo continua dependendo das dependências npm do projeto.
