# Financeiro V11.6 — visão por período

## Objetivo

Deixar o Financeiro útil no dia a dia sem transformar a tela em um ERP pesado.
A regra visual desta etapa é: mostrar o essencial primeiro e aprofundar somente
quando o usuário pedir.

## Navegação

`Financeiro` virou um grupo na sidebar:

- Faturamento
- Despesas

As duas áreas ficam separadas para não misturar entradas e saídas na mesma tela.

## Faturamento

Períodos disponíveis:

- Hoje
- Semana
- Mês
- Personalizado

Indicadores do período:

- Faturado
- Recebido
- Resultado líquido
- Quantidade de atendimentos
- Ticket médio

O faturamento usa somente atendimentos com status `completed` e a data de
`completedAt` quando disponível.

### Recebido nesta etapa

`Recebido = Faturado - taxas de pagamento registradas`.

Esse número representa o pagamento registrado na conclusão do atendimento,
líquido da taxa cadastrada. Ele ainda NÃO é conciliação bancária por data de
repasse da adquirente. Essa diferença fica explícita na própria tela para não
mostrar um dado mais preciso do que o sistema realmente possui.

## Entradas

A lista principal é propositalmente compacta.

Fechada:

`10:30 — João                            R$ 85,00  ⌄`

Ao expandir aparecem:

- serviço;
- profissional;
- forma de pagamento;
- recebido;
- taxa;
- comissão;
- resultado do atendimento.

Busca e filtros ficam discretos. Profissional e forma de pagamento ficam dentro
de `Filtros`, evitando ocupar espaço permanente.

## Despesas

A tela de Despesas respeita o mesmo seletor de período e mantém:

- total de despesas;
- quantidade de lançamentos;
- maior categoria;
- filtro por categoria;
- lista de despesas;
- ranking por categoria;
- registro e exclusão usando os fluxos existentes.

## Comparativo

O cartão de Faturado compara o período atual com um período anterior de duração
equivalente. Quando não há base anterior, a interface informa isso sem inventar
percentual.

## Banco / produção

Nenhuma migration foi adicionada nesta rodada. A V11.6 usa os dados operacionais
já presentes em `appointments` e `expenses`.

Uma futura conciliação bancária real exigirá modelar data de liquidação/repasse
ou uma entidade de pagamentos. Isso não deve ser confundido com o `Recebido`
registrado desta versão.

## Quality gate

Novo comando:

```bash
npm run check:finance
```

Ele valida a presença do submenu, períodos, Faturado/Recebido, entradas
expansíveis e sincronização do preview standalone.
