# Supabase / PostgreSQL

Este diretório contém a infraestrutura versionada do banco definitivo.

- `config.toml` — configuração local.
- `migrations/` — schema e segurança, aplicados em ordem.
- `seed.sql` — dados fictícios de desenvolvimento.

## Teste local

```powershell
npx.cmd supabase start
npx.cmd supabase db reset
```

Depois rode:

```powershell
npm.cmd run check:database
```

Se o projeto remoto usar outra versão major do PostgreSQL, ajuste `db.major_version` em `config.toml` para a mesma versão antes de trabalhar com diffs/migrations.
