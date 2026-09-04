# Database boundary

Application modules must import persistence functions/repositories through this folder, never from a concrete adapter scattered across the codebase.

## Current runtime

`index.ts` points to `adapters/fileDatabase.ts` so the existing MVP keeps working without requiring a remote database.

## Definitive schema

The production model is defined in `../../../supabase/migrations/`.

When PostgreSQL is connected, add repositories under `postgres/` and switch the boundary gradually. Do not make feature modules depend directly on Supabase/`pg` APIs.

## Generated types

`generated/` is reserved for database types produced from the running Supabase schema. Generated code should not be hand-edited.
