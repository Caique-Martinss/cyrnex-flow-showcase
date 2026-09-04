# Decisões de modelagem

## `business_id` em quase todas as tabelas

Não é repetição inútil. Ele permite filtragem eficiente por tenant, RLS simples e FKs compostas que bloqueiam relações cruzadas entre empresas.

## Cliente sem telefone

Telefone é opcional porque existe cadastro presencial/rápido. Quando houver telefone, `phone_normalized` é calculado pelo banco e possui UNIQUE parcial por empresa.

## Cliente avulso

`appointments.client_id` pode ser nulo desde que exista `guest_name`. Assim um atendimento sem cadastro continua entrando na agenda e no financeiro.

## Totais do cliente

`last_visit`, quantidade de atendimentos e total pago não ficam gravados no cadastro principal. A view `client_metrics` calcula isso a partir do histórico, evitando divergência.

## Estoque como ledger

`inventory_movements` guarda cada entrada/saída. A view `product_stock` soma os movimentos. Isso preserva a explicação de por que o estoque chegou ao número atual.

## Contas a receber como ledger

A dívida nasce em `receivables`; pagamentos/perdões entram em `receivable_entries`. O saldo é calculado pela view `receivable_balances`.

## Agendamentos históricos usam snapshot

Nome do serviço, nome do profissional e valores relevantes ficam no próprio atendimento. Se o preço de "Corte" mudar amanhã, o atendimento antigo continua representando o que aconteceu naquele dia.

## Recorrência alternada

`recurrence_pattern_items` permite uma sequência como:

1. Corte
2. Pezinho
3. Corte
4. Pezinho

sem precisar criar uma regra separada para cada semana.

## Cortesia de casamento

Não transformamos o preço original em zero silenciosamente. O valor normal permanece no atendimento e a cortesia entra em `appointment_adjustments`, preservando o valor concedido em benefício.

## Próteses

Prótese capilar é um módulo opcional. A tabela própria guarda informações específicas sem poluir `clients` com dezenas de colunas que a maioria das barbearias nunca usa.

## Módulos opcionais

`business_modules` controla se Loja, Prótese, Parcerias, Financeiro etc. aparecem para cada empresa. O schema pode ter as tabelas disponíveis sem obrigar todo cliente a usar todas as funções.
