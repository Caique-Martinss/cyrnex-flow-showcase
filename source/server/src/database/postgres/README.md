# PostgreSQL repositories

This directory is intentionally reserved for the PostgreSQL implementation.

Rules when connection work begins:

1. One repository per domain, not one giant database file.
2. Parameterized queries only.
3. Every tenant query includes/enforces `business_id`.
4. Transactions for operations that change multiple ledgers/tables.
5. No SQL duplicated in routes/controllers.
6. Prefer generated database types where practical.
7. Never expose database/service-role secrets to the web app.
