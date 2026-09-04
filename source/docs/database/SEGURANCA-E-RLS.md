# Segurança, multiempresa e RLS

## Objetivo

Nenhum usuário de uma barbearia deve conseguir enxergar registros de outra, mesmo se houver erro no frontend.

A proteção acontece em camadas:

1. `business_id` identifica o tenant.
2. FKs compostas evitam cruzar entidades de tenants diferentes.
3. `business_members` é a fonte de papéis e permissões.
4. RLS filtra linhas por usuário autenticado.
5. A API continua responsável por autorização de ação e por esconder campos sensíveis.

## Papéis

- `owner` — dono, controle total da empresa.
- `manager` — gestão operacional/financeira conforme política.
- `professional` — operação do próprio atendimento.
- `receptionist` — agenda/clientes sem poder administrativo completo.

## Financeiro

As tabelas `payments`, `receivables`, `receivable_entries` e `expenses` são restritas no RLS a dono/gerente.

O portal do profissional não deve receber faturamento total do cliente. Como RLS controla linhas e não é a única ferramenta de segurança por coluna, a API deve devolver DTOs específicos para profissionais, mostrando apenas o que eles podem ver, como comissão própria.

## Prótese capilar

Registros de prótese têm policy específica: dono/gerente ou o profissional ligado ao caso.

## Dados públicos

A versão atual não concede acesso `anon` diretamente às tabelas. Página pública e agendamento público devem passar pela API, que devolve somente campos seguros.

## Autorização

As policies consultam `business_members` e `auth.uid()`. Não usamos `raw_user_meta_data` como fonte de autorização.

## Storage

O bucket privado `business-assets` usa o primeiro segmento do caminho como UUID da empresa:

```text
<business_id>/clients/<client_id>/reference-01.webp
```

A policy valida se o usuário pertence à empresa indicada no caminho.

## Chaves secretas

Nunca colocar `service_role` ou senha do banco no React/Vite. Segredos ficam apenas no backend/ambiente seguro.
