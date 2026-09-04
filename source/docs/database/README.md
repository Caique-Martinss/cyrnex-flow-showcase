# Banco de dados — índice

A partir da v0.5.0, o banco relacional é tratado como parte central da arquitetura do CYRNEX FLOW.

## Fonte oficial

A definição executável do banco vive somente em `supabase/migrations/`.

Não mantenha uma segunda cópia do schema em outro arquivo SQL. A documentação explica o modelo; as migrations são a fonte de verdade.

## Documentos

- `BANCO-DE-DADOS.md` — visão geral e princípios.
- `MODELO-RELACIONAL.md` — relacionamentos principais.
- `DICIONARIO-DE-DADOS.md` — função de cada tabela.
- `SEGURANCA-E-RLS.md` — isolamento por empresa e permissões.
- `MIGRACOES-E-AMBIENTES.md` — como alterar o banco sem bagunçar produção.
- `BACKUP-E-RECUPERACAO.md` — estratégia de backup e restauração.
- `DECISOES-DE-MODELAGEM.md` — decisões importantes e por quê.
- `MIGRACAO-DO-JSON.md` — caminho seguro do MVP atual para PostgreSQL.
- `MAPEAMENTO-ONBOARDING.md` — destino de cada configuração no banco definitivo.
- `RELATORIO-DE-QUALIDADE.md` — verificações e limites da versão.
- `SCHEMA-MANIFEST.json` — inventário que também é lido pelo verificador automático.

## Regra principal

Nenhuma tabela, coluna, índice, enum, policy ou função deve ser criada manualmente em produção sem uma migration versionada no repositório.
