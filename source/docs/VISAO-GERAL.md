# Visão Geral — v0.9.0

A Visão Geral é a primeira tela operacional depois do onboarding. O objetivo é responder em poucos segundos: **como está meu dia e o que precisa da minha atenção agora?**

## Hierarquia da tela

### Agora

- saudação, data e status aberto/fechado;
- atendimento atual ou próximo atendimento;
- contagem até o próximo horário;
- ações rápidas: novo agendamento, novo cliente e despesa quando o Financeiro estiver ativo;
- WhatsApp do próximo cliente quando o módulo estiver ativo;
- conclusão de atendimento ligada ao fluxo real de fechamento.

### Hoje

- agendamentos do dia;
- faturamento previsto e já recebido somente para perfis autorizados e com Financeiro ativo;
- quantidade de opções de horário livres calculadas pela grade e pela menor duração de serviço disponível;
- ocupação da agenda;
- linha do tempo com atendimentos e intervalos livres clicáveis;
- alertas de sinais pendentes, cancelamentos e retornos quando aplicável;
- resumo financeiro do dia;
- gráfico simples de movimento por horário.

### Contexto complementar

- resumo em linguagem natural do dia;
- histórico recolhível “Aconteceu hoje”;
- comparação com o mesmo dia da semana anterior somente quando existe histórico;
- estado inicial zerado com orientação para cadastrar o primeiro cliente.

## Regras de segurança e visibilidade

- profissionais não recebem faturamento geral ou resultado financeiro;
- valores gerais são exibidos somente para `owner`/`manager` quando o Financeiro estiver habilitado;
- módulos desligados não criam cards vazios;
- nenhuma comparação é inventada sem dados históricos;
- horário livre é uma opção real de início e abre o modal de agendamento já com data/hora preenchidas.

## Regra de UX

> Apareceu = funciona. Existe = tem propósito. Clicou = responde. Deu erro = explica.

A Visão Geral não usa gráficos decorativos. Cada componente precisa ajudar o usuário a agir ou compreender o dia.
