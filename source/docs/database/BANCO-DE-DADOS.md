# Arquitetura do banco de dados

## Objetivo

O banco foi desenhado para suportar muitas barbearias no mesmo CYRNEX FLOW sem misturar dados, mantendo espaço para os módulos planejados: agenda, clientes, financeiro, recorrência, lista de espera, loja, prótese capilar, parcerias, página pública e automações.

## Tecnologia-alvo

- PostgreSQL como banco relacional.
- Supabase como plataforma de banco, autenticação e storage.
- Migrations SQL versionadas no projeto.
- RLS (Row Level Security) como segunda barreira de isolamento entre empresas.

## Princípios obrigatórios

1. **Multiempresa desde a base** — registros pertencentes a um estabelecimento carregam `business_id`.
2. **Relacionamentos protegidos** — FKs compostas usam `(business_id, id)` quando um registro aponta para outro registro da mesma empresa. Isso impede, no próprio banco, ligar um cliente de uma barbearia a um atendimento de outra.
3. **Dinheiro nunca usa ponto flutuante** — valores monetários usam `numeric`.
4. **Histórico não depende do cadastro atual** — agendamentos e pedidos guardam snapshots de nome/preço importantes para o passado continuar correto se o cadastro mudar.
5. **Dados derivados não são duplicados sem necessidade** — total gasto, estoque e saldo de pendências são obtidos por views/ledger em vez de serem mantidos manualmente em várias tabelas.
6. **UUIDs em entidades** — evita colisões e funciona bem em ambiente distribuído/multiempresa.
7. **Horários absolutos em `timestamptz`** — agenda guarda instante real; a empresa guarda seu fuso horário separadamente.
8. **Soft archive quando histórico importa** — clientes, produtos e empresas podem ser arquivados sem apagar o passado.
9. **Mudança de schema só via migration** — alteração feita no banco deve ser reproduzível do zero.
10. **Privilégio mínimo** — financeiro é mais restrito que agenda; prótese possui regra mais restrita; auditoria só pode ser escrita pelo backend/service role e lida por owner/manager.

## Banco atual x banco definitivo

A aplicação ainda mantém o adapter JSON como modo local legado para não quebrar o MVP antes de conectarmos um projeto Supabase real.

```text
React
  ↓
Express
  ↓
Database boundary
  ├── JSON adapter (modo legado/local)
  └── PostgreSQL/Supabase (schema definitivo preparado)
```

Quando as credenciais e o ambiente Supabase forem conectados, os módulos serão migrados para repositories PostgreSQL gradualmente. O JSON não é o modelo de produção.

## Grandes áreas do schema

- Core da empresa e onboarding
- Usuários, membros e profissionais
- Clientes, preferências e fotos
- Serviços e adicionais
- Agenda e recorrência
- Lista de espera
- Pagamentos, despesas e contas a receber
- Produtos, pedidos e estoque
- Parcerias
- Orçamentos
- Prótese capilar
- Página pública e mídia
- Mensagens e notificações
- Auditoria
