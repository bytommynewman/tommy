# Who this is for

Context on the owner and his portfolio, so any Claude session starts informed
instead of asking. Everything here is drawn from the four repositories below —
where something isn't settled it says so rather than guessing.

## Tommy Newman — @bytommynewman

Canada (Toronto area — `playd` launches there; `Quit` ships Canadian crisis lines
and defaults to a Canada-Central database region).

**How he works** (his own words, filed in `holdr/brain/00-charter.md` and
`16-team.md`): non-technical, ADHD, moves by vibe and momentum. Give him **one
clear thing at a time**, in plain language. Ship fast and let him react. Don't
hand him a fifteen-item admin list — hand him the next single move.

His zone of genius is **brand and content**, not ops admin. Build him the thing;
don't make him assemble it.

**What this means in practice, and it shows up in every repo:** the docs are
written for a non-coder. `playd/README.md` has an "if you don't code" section and
a glossary. `tommy/NEXT-STEPS.md` and `CONNECT-INSTAGRAM.md` are click-by-click
runbooks that say which button to press on which screen. Match that register —
plain English first, code second, and name the exact UI path for anything he has
to do himself.

## The portfolio

### holdr — the physical product business (`bytommynewman/holdr`)
A royal-blue 3D-printed clip that hangs on a padel court's cage fence and holds a
water bottle and a phone. "Everything in reach."

- **Co-owned with David Newman (his dad)** — a family company, both owners.
  Tommy takes brand, content and product calls; Dad is the operational backbone
  (ops, finance, customer replies). The ownership split is still open.
- **Price: $34.99 USD**, decided 2026-07-26 (raised from $24.99 on comp evidence).
- 10 colourways specced with hexes; **Royal Blue is the live one**, the rest are
  "soon"/waitlist. All 10 have studio shots.
- Mission beyond the one product: the premium courtside organization brand for
  racquet sports — padel leads the identity, tennis and pickleball supply volume.
- **The repo is not code — it's a "Business Brain"**: 21 numbered region files
  under `brain/` (product, market, brand, marketing, money, ops, competitors,
  customers, finance, growth, roadmap, KPIs, suppliers, legal, comms, team,
  content engine, product fidelity, design futures, video engine) plus running
  logs (`sales-log.md`, `content-log.md`, `content-ideas-log.md`) and
  `data.json`, which a 3D visual (`brain-3d.html`) reads. A `holdr-brain` skill
  makes a session load it and act as the holdr operator.
- **The brain's own rule: every new fact gets filed into a region file.** If he
  tells you something about holdr, write it in — don't just reply.
- Open decisions flagged `⚠️ NEEDS TOMMY` / `DECISION FOR TOMMY` are real; don't
  silently resolve them. Live ones include filament (PLA vs PETG), stay-minimal
  vs full court organizer, sales channel, and the ownership split.

### tommy — the personal life OS (this repo, `bytommynewman/tommy`)
Expo Router + Supabase. Navigated as a **golf course**: the home screen is
Scratch, an AI caddie; `course` is an interactive hole navigator where each
section is a hole. Sections: plan, recovery, reflect, life, invest, content.
Real data layers exist for auth, habits/recovery, content and invest; several
screens are still placeholders awaiting later milestones.

### playd — the social golf passport (`bytommynewman/playd`)
Log rounds, rank courses against each other with "would you rather" questions
instead of stars, collect stamps and badges per course/city/country. Deliberately
**not** a GPS rangefinder or strokes-gained app. Monorepo (Expo + Supabase) with
a tested ranking-engine package and OpenGolfAPI course data. The product plan
lives in `docs/` — `PRD.md` first, then `PERSONAS.md`, `LAUNCH.md` (Toronto),
`RISKS.md`.

### Quit — the private quit tracker (`bytommynewman/Quit`)
Off weed. Single user, his own devices, private Supabase project. Day count and
money saved, a craving tool (rate → HALT check → ten-minute timer → re-rate),
nightly check-in, the Cannabis Withdrawal Scale, withdrawal timeline, pre-decided
if→then moves, milestones, crisis lines. No social, no AI, no email. This one is
personal — treat it with care.

## Video and content creation

Two distinct pipelines; don't confuse them.

- **holdr ad/video engine** — the mandate is **10 fresh ad ideas and 10 videos a
  day**. Stills are generated image-to-image in Higgsfield from
  `brain/reference/CANONICAL-real-product-photo.jpg`, then animated with
  Turn-to-video (4s, 9:16). Raw clips land in `ads/videos/raw/`, stitched ones in
  `ads/videos/published/`, both named `YYYY-MM-DD-<format-slug>-vN.mp4`.
  **The non-negotiable rule is product fidelity:** every visual must show the real
  holdr, identical to the reference photo — no text-only renders, no drift in clip
  shape, cup, teardrop cutouts or phone sleeve, and **no hook arching over the top
  wire** (the real part hangs on bottom fins plus a comb tab). Padel scenes only:
  solid perforated padel rackets, never a tennis ball.
- **tommy's content section** — hole 6 in the app. A `content-agent` writes reel
  ideas, `render-reel` auto-cuts uploaded clips into a reel via Shotstack, and
  `ig-sync` pulls real @bytommynewman follower/view/like numbers through the Meta
  API into the stats tab.

## Through-lines worth knowing

- **Every app is Expo + Supabase.** No separate server anywhere. Supabase is
  Postgres + Auth + Edge Functions, and that's the whole backend.
- **Row-level security is the pattern, not an afterthought** — every table carries
  `user_id` with RLS scoped to `auth.uid()`.
- **Docs-first.** Each project leads with plain-English product documents (holdr's
  brain, playd's PRD, Quit's PLAN, tommy's NEXT-STEPS) and the code follows them.
- **An AI operator layer runs through all of it** — the holdr-brain skill, Scratch
  the caddie, the content agent. He builds assistants into his own tools.
- **Golf is the recurring motif** — a whole app about it, and the life OS is
  shaped like a course.
