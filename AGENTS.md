# AGENTS.md

## Cursor Cloud specific instructions

Saveon (`family-fin`) is a single full-stack **Next.js 14 (App Router)** app in Ukrainian for family savings/investment analytics. Frontend + API routes run in one process; data is stored in **PostgreSQL** via **Prisma**. There is no monorepo, no separate backend, and no automated test suite. Standard commands live in `package.json` scripts.

### Services & standard commands
- Dev server: `npm run dev` → serves on `http://localhost:3000` (binds `0.0.0.0`). This is the only service.
- Lint: `npm run lint`. Production build check: `npm run build`.
- DB GUI (optional): `npm run db:studio` (Prisma Studio on :5555).
- External HTTP APIs (NBU rates, CNN/alternative.me Fear & Greed, Google News RSS) are called server-side and degrade gracefully — they are NOT required for core flows.

### PostgreSQL (required, must be started each session)
- PostgreSQL 16 is installed locally. It is NOT auto-started on boot — start it with: `sudo pg_ctlcluster 16 main start`.
- Local role/db used by `.env`: role `saveon` / password `saveon`, database `family_fin`.
- The `.env` file (gitignored) is already present with `DATABASE_URL` (local Postgres) and a dev `SESSION_SECRET`. Recreate it if missing:
  - `DATABASE_URL="postgresql://saveon:saveon@localhost:5432/family_fin?schema=public"`
  - `SESSION_SECRET` must be ≥32 chars.

### IMPORTANT gotcha: use `prisma db push`, NOT `prisma migrate deploy`
- The committed SQL files in `prisma/migrations/` are **SQLite-format** (`DATETIME`, inline `PRIMARY KEY`) left over from a SQLite origin, but `schema.prisma` and `migration_lock.toml` declare **PostgreSQL**. `prisma migrate deploy` / `npm run db:migrate` therefore FAIL with `type "datetime" does not exist`.
- `schema.prisma` is the source of truth. Sync the DB with: `npx prisma db push` (then `npm run db:seed`). Do not rely on the migration files against Postgres.
- Note: `npm run run` chains `prisma migrate deploy`, so it will fail for the same reason — start the app manually instead.

### Seed / login
- `npm run db:seed` creates a demo user. Login: `demo@family.fin` / `demo123`.
- In non-production, `?preview=1` bypasses auth (`src/middleware.ts`).
