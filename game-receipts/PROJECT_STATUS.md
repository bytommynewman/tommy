# PROJECT_STATUS — Game Receipts

_Last updated: 2026-10-19._ Location: `game-receipts/` inside the `bytommynewman/tommy` repo, branch `claude/modest-fermi-nxrjy8`. It should move to its own repo.

## Done (Phases 1–5 MVP, running locally)
- **Foundation:** Next 16 + TS strict + Tailwind v4. Dark design system (`app/globals.css` tokens, `components/ui/`), brand (`public/brand/`, `app/icon.svg`), signed-cookie auth (scrypt), onboarding (leagues, teams, profile), and a responsive shell (bottom nav on mobile, side nav on desktop).
- **Predictions:** five structured categories plus hot takes (debates). Award ballots with primary pick and dark horse, where the remainder is spread over the field by baseline. AI-assisted structuring (rules engine). A review screen covers exact text, criteria, deadline, source, and rubric. Locking is server-side with a timestamp, a baseline snapshot, and a per-user SHA-256 hash chain. Users can revise (time-weighted chain) and withdraw (10-minute grace void; after that it is still graded).
- **Scoring:** deterministic `GR-2026.1`. Accuracy = 100·(1−Brier/2). Prestige = 55% relative accuracy, 20% boldness, 15% timing, 10% specificity. Reputation is shrunk toward 36 with k=8. Sample minimums apply (5 all-time, 3 monthly/league). There is a daily lock cap, receipt awards (earliest, most impressive, best calibrated), and a full score breakdown UI plus the `/how-scoring-works` page.
- **Resolution/admin:** resolve with mandatory evidence URL, correct outcome (deterministic regrade), void, approve or reject user-drafted questions, appeals, report moderation, and an audit log.
- **Social:** follow, block, like, comment, debate votes, feed tabs (Following / Trending / Resolved / Friends / NFL / NBA), search, notifications, private accounts.
- **Competition:** take battles (challenge, accept/decline, auto-resolve), leaderboards (all-time, monthly, friends, NFL, NBA, category, head-to-head, best calls), and leagues (create, invite code or link, standings, creator-league flag).
- **Receipts:** share page `/r/[id]`, PNG export `/r/[id]/image` (1200×630 and `?format=story` 1080×1920), Web Share API, X intent, OG metadata, verification link.
- **Prod DB:** `supabase/migrations/0001_game_receipts.sql` (RLS, immutability trigger, `lock_prediction`/`withdraw_prediction`/`join_group` RPCs, indexes). It is verified on Postgres 16 by `supabase/tests/receipts_test.sql`.
- **Tests:** 32 vitest tests, the SQL behavioral tests, and the Playwright E2E (`npm run smoke`), which passes the full flow including admin resolve and grade.

- **Mobile/app (round 2):** fixed horizontal overflow that made iOS Safari zoom out and shrink the app. The E2E test now fails on any overflow. Added safe-area padding, crossfade route transitions (React `<ViewTransition>`), and an installable PWA: manifest, app icons made from the official uploaded logo (`public/icons/`, `app/apple-icon.png`, emblem favicon `app/icon.png`), a service worker with offline fallback (production only), and an install prompt. Added a Capacitor iOS/Android shell (`capacitor.config.ts`, see `NATIVE.md`).

- **Round 3:** the official uploaded logo is now the app icon, the home-screen icon, the PWA icons, the share images, and (as an emblem crop) the favicon and header mark. Leagues NCAAF and NCAAB were added, with CFP and NCAA tournament markets. The create flow opens with league tiles (title over art), each leading to a searchable list of every team and player. A take saves its `subject` (part of the sealed hash), and the subject's photo or logo shows on cards, detail pages and receipts, falling back to a team-colour monogram. The roster sync supports SportsDataIO (licensed) or ESPN (dev). 11 Higgsfield art assets are generated and wired in (`art()` returns null until `npm run art:fetch` has been run), covering heroes, league art, empty states and the story background.

## Key decisions
- The local JSON store is a mock adapter, so the app runs with zero credentials. Supabase is the production target; the schema is written but **not wired into the app yet**.
- Sports data is a mock catalog. Resolved demo questions use real 2024-25 outcomes with illustrative baselines. Seed takes carry `seed: true` and show a "Demo" badge because their timestamps are back-dated.
- User-drafted questions use a 50/50 baseline and count toward reputation only after admin approval. This prevents farming trivial questions.
- Battle winner = higher time-weighted accuracy; a gap under 0.5 is a push.
- Free to play. Paid plans are a waitlist only, and plans never affect scoring.

## Pending / next
1. **Supabase wiring:** replace `lib/server/db.ts` and the services with Supabase queries and RPCs, move auth to Supabase Auth, and run grading as a service-role job. Needs project credentials.
2. **Licensed sports data adapter**, plus automated "possibly settled" detection queued for human review.
3. Stripe subscriptions (Phase 6), creator-league branding, and embeddable cards.
4. Run `npx cap add ios` on a Mac and commit `ios/`; App Store submission needs a deployed URL. Push notifications.
7. On the Mac mini, run `npm run art:fetch` (Higgsfield art; the cloud env can't reach its CDN) and `npm run roster:sync`, then commit `public/art/` and `lib/catalog/generated/rosters.json`.
8. Licensed photos need a SportsDataIO subscription that includes headshots. Set `SPORTSDATAIO_KEY` and re-run the sync. The ESPN source is for dev only.
5. Tune the letter-grade scale with real data. Today everyone sits near C because grades are shrunk toward consensus (36).
6. Light mode, account deletion and export flow, rate limiting at the edge, and a proper admin role assignment UI.

## Known issues
- Prestige typically spans about 25–75, so the headline numbers read low. Weights and normalisation need validation with users.
- The DB uses a single-process file store and is not safe for multi-instance deploys. That is by design for dev.
- `npm run smoke` mutates data (resolves the Leafs question), so run it on a fresh `.data/`.
- `npm start` (production mode) requires `SESSION_SECRET`, and seeds no demo users unless `GR_SEED_DEMO=1`.
