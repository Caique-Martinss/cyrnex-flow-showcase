# CYRNEX FLOW — Full Source Code

This folder contains the public source snapshot of **CYRNEX FLOW V11.7.2 RC1**.

CYRNEX FLOW is a full-stack SaaS platform for appointment-based businesses, initially focused on barbershops. The codebase includes the customer-facing application, backend API, PostgreSQL/Supabase migrations, quality gates, deployment blueprint, and selected technical documentation.

## Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database / BaaS:** PostgreSQL, Supabase
- **Security:** Supabase Auth, authorization, RLS, server-side validation
- **Infrastructure:** Render
- **Quality:** TypeScript checks, structural checks, product-specific regression gates

## Repository layout

```text
server/      Backend API and business rules
web/         React frontend
supabase/    PostgreSQL migrations, RLS and database setup
scripts/     Automated quality and validation gates
docs/        Selected technical documentation
.github/     CI workflow
render.yaml  Deployment blueprint
```

## Local development

1. Copy `.env.example` to `.env`.
2. Fill only the environment values required for your local setup.
3. Install dependencies from the project root.
4. Run the development command defined in `package.json`.

```bash
npm install
npm run dev
```

The project expects Node.js and the dependencies declared in the repository. Supabase/PostgreSQL is used for the production-oriented data layer; local development paths may use the project's development adapter depending on configuration.

## Security note

No real credentials are included in this public snapshot. Environment secrets such as `SUPABASE_SECRET_KEY`, SMTP credentials, production URLs, passwords and tokens must be configured outside Git and must never be committed.

## Status

**V11.7.2 RC1 — pre-staging / E2E preparation.**

This is a release-candidate source snapshot and should not be described as a production-final release.

## Showcase

For screenshots and the portfolio overview, see the root of the public `cyrnex-flow-showcase` repository.
