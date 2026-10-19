# Game Receipts

**Call it. Lock it. Prove it.** A mobile-first sports prediction and social competition app: lock timestamped, tamper-evident predictions, get graded by a transparent deterministic engine, and build a permanent reputation.

## Run it

```bash
cd game-receipts
npm install
npm run dev            # http://localhost:3000
```

The first run creates `.data/db.json` with demo data. Demo login (dev only): `demo@demo.gamereceipts.dev` / `receipts-demo`. Admin: `admin@demo.gamereceipts.dev` / same password. To reset everything, delete `.data/`.

| Command | What it does |
|---|---|
| `npm test` | Vitest: scoring engine, integrity, services, AI structurer (32 tests) |
| `npm run typecheck` / `npm run lint` | TypeScript strict and ESLint |
| `npm run build` | Production build |
| `npm run smoke` | Playwright end-to-end run against a running server on a **fresh** `.data/` (`BASE_URL=…`, `-- --shots <dir>` saves screenshots) |

## Architecture

- **Next.js 16 App Router + Tailwind v4.** Server Components read data, and Server Actions (`app/actions.ts`) handle mutations. Cache Components is disabled because nearly every screen is per-user.
- **`lib/scoring/`** holds the pure, versioned grading engine (`GR-2026.1`): Brier accuracy, Take Prestige, reputation shrinkage, and battles. It has no I/O and is fully unit-tested.
- **`lib/integrity.ts`** gives each receipt a SHA-256 hash, chained per user. This makes the store tamper-evident; it is not a blockchain.
- **`lib/server/services/`** holds the domain logic as functions over a `DB` value: predictions, grading, social, battles, groups, and reputation.
- **`lib/server/db.ts`** is the **mock persistence adapter**: a JSON file with atomic writes. Production targets the Postgres schema in `supabase/migrations/`.
- **`lib/ai/`** contains the prediction structurer. The default is a free, deterministic rules engine. A Claude adapter turns on with `AI_PROVIDER=anthropic`. The AI only proposes wording; it never decides outcomes or scores.
- **`lib/catalog/`** is mock sports reference data (teams, players, questions). Nothing is connected to a live or licensed feed.

## Database (production target)

`supabase/migrations/0001_game_receipts.sql` contains the full schema with RLS on every table. Receipts can only be created through `lock_prediction()`, which sets the server timestamp, snapshots the baseline, chains the hash, and enforces one live take per question. A trigger makes locked fields immutable and blocks deletes, even for the service role.

Test the migration against a local Postgres:

```bash
psql -f supabase/tests/auth_stub.sql -f supabase/migrations/0001_game_receipts.sql -f supabase/tests/receipts_test.sql
```
