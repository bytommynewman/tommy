# Tommy

A personal life OS: planner, calendar, habit & recovery tracker, journal, goals, fitness, content pipeline, relationships, an AI therapist-mode chat, and an investing/portfolio section.

Full architecture and build order: see the plan this was built from, or `PROGRESS.md` (added as milestones complete).

## Prerequisites

1. **Supabase project** — create a free project at supabase.com.
   - In the SQL Editor, run each file in `supabase/migrations/` in order (starts with `0001_profiles.sql`).
   - Enable Email/Password auth under Authentication → Providers (on by default).
2. **Environment variables** — copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` — Project Settings → API → Project URL.
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API → anon public key.
3. Later milestones will need additional secrets (Anthropic API key for M9, Finnhub key for M11, SnapTrade Client ID/Consumer Key for M12) — these are set as **Supabase Edge Function secrets**, never in `.env`/the app bundle.

## Running the app

```
nvm use --lts   # or just make sure `node -v` shows a recent LTS
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your iPhone (free, App Store). No Xcode or Apple Developer account needed for development.

## Project structure

- `app/` — Expo Router screens (file-based routing)
- `lib/` — Supabase client, auth/theme providers, query client
- `components/ui/` — shared building blocks (Button, Card, TextField, SegmentedControl, Screen)
- `supabase/migrations/` — SQL schema, run manually via Supabase Studio's SQL Editor
- `supabase/functions/` — Edge Functions (AI chat, market data, brokerage sync)
