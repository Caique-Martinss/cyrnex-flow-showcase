# Padrão de código

Estas são as regras de organização do CYRNEX FLOW. Elas valem para todas as próximas versões.

## 1. Legibilidade vem antes de compactação

- máximo recomendado de 120 caracteres por linha;
- arquivos TypeScript/TSX não devem ultrapassar 450 linhas sem uma justificativa forte;
- funções devem fazer uma coisa bem definida;
- componentes grandes devem ser quebrados em componentes menores;
- evitar ternários, callbacks e JSX enormes em uma única linha.

O script `npm run check:structure` verifica automaticamente tamanho de linha, tamanho de arquivo e partes obrigatórias da arquitetura.

## 2. Nomes devem explicar a intenção

Preferir:

```text
getAvailableTimeSlots.ts
BookingConfirmation.tsx
appointment.service.ts
formatCurrency()
```

Evitar:

```text
helpers2.ts
novo.ts
funcaoFinal.ts
Component3.tsx
x()
```

## 3. Cada responsabilidade tem um lugar

- tela/funcionalidade → `features/`;
- componente reutilizável → `components/`;
- chamada HTTP → `services/`;
- hook React reutilizável → `hooks/`;
- tipo/modelo → `domain/`;
- regra da API → `server/src/modules/`;
- acesso ao banco → `server/src/database/`;
- documentação → `docs/`.

## 4. Não duplicar regra de negócio

Uma regra importante não deve existir em cinco lugares diferentes.

Exemplo: o servidor deve ser a fonte de verdade para impedir conflito de agendamento. A tela pode prevenir erros para melhorar a experiência, mas a API ainda precisa validar.

## 5. Comentários explicam o "porquê"

Comentários são úteis quando explicam uma decisão, exceção ou regra difícil.

Bom:

```ts
// Mantemos o saldo separado do serviço atual para não distorcer a receita por serviço.
```

Ruim:

```ts
// Soma 1
count += 1;
```

O código deve ser legível sem depender de comentários em todas as linhas.

## 6. Mudanças de comportamento precisam ser rastreáveis

Ao adicionar ou alterar uma função relevante:

- atualizar `CHANGELOG.md`;
- atualizar documentação quando a arquitetura ou regra mudar;
- preservar nomes coerentes entre frontend e backend.

## 7. Não misturar protótipo com aplicação real

Os arquivos `ABRIR-PREVIEW-*.html` são previews independentes. Eles não são a base arquitetural da aplicação React.

Toda implementação real deve entrar em `web/` e `server/`.

## 8. Checklist antes de considerar uma alteração pronta

```bash
npm run check:structure
npm run typecheck
```

Além disso, testar o fluxo alterado no navegador e confirmar que não houve regressão em funções existentes.


## Banco de dados

- `supabase/migrations/` é a fonte de verdade do schema relacional.
- Toda tabela de tenant deve ter `business_id`, salvo exceção documentada.
- Dinheiro usa `numeric`, nunca `float`/`double`/`money`.
- Não duplicar métrica derivada em colunas se ela puder ser calculada com segurança do histórico.
- Relacionamentos multiempresa devem preferir FKs compostas `(business_id, id)`.
- Não criar tabela genérica `dados`, `extras` ou `config2` para fugir de modelagem.
- JSONB só quando a estrutura é realmente flexível; dados consultados/relacionados com frequência merecem colunas/tabelas próprias.
- Toda nova tabela precisa de motivo, ownership/tenant, constraints, índices necessários e política RLS.
- Toda mudança de schema precisa passar em `npm run check:database`.
- Migration aplicada não é reescrita; correção é uma nova migration.
