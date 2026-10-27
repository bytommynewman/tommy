# Oddler — automatic prompt refresh

Two scheduled tasks run this procedure every 12 hours. The first (a fresh
Claude session) does §0–§3: it adds **100 new prompts** so regular players stop
seeing repeats, and pushes them. The second (the session that holds the
Higgsfield connection) does §4 about 45 minutes later and ships them.
Everything below is self-contained; each task reports at the end.

## 0. Ground rules

- Work on branch `claude/great-meitner-cdyydz` of `bytommynewman/tommy`
  (`git fetch origin claude/great-meitner-cdyydz && git checkout claude/great-meitner-cdyydz && git pull`).
  Never force-push. Never rewrite existing bank files.
- Do not change the rules (`20-rules.js`), the client, or the tests. This task
  only adds a bank piece and retires old auto pieces.
- The live game is Higgsfield website id `397faf4f-fe39-40b0-9bc9-a06b84af8b1a`
  (https://oddler.higgsfield.app). Shipping steps are in §4.
- If anything fails validation, fix the bank piece until `build-logic.sh`
  passes. Never deploy a build whose checks or tests fail.

## 1. Read the current bank

```
oddler/app/00-header.js      # tiers, parts, constants
oddler/app/1*-bank*.js       # bank pieces (hand-written 10–13, auto 14-...)
oddler/app/20-rules.js       # parser — see parseAnswers() and normalize()
oddler/app/build-logic.sh    # concatenates the pieces, runs the checks
```

Collect every existing prompt **id** and **prompt text** across all pieces.
New prompts must not duplicate either (compare case-insensitively, and treat
prompts asking for the same thing in different words as duplicates — "Name a
bird" vs "Name a type of bird").

## 2. Write 100 new prompts

Create ONE new file, `oddler/app/14-bank-auto-<YYYYMMDD>-<HH>.js` (UTC), e.g.
`14-bank-auto-20261028-06.js`, containing exactly:

```js

BANKS.push(
  ["<id>", "<Category>", "<Prompt text>.", "<answers spec>"],
  ...
);
```

Format of one row (see any existing piece for examples):

- `id`: kebab-case, unique, ≤ 40 chars, e.g. `"nba-legend"`.
- `Category`: one of Geography, Science, Space, Body, Animals, Food, Sports,
  Music, Movies, Games, Mythology, History, Things, Tech, Everyday, Words.
- `Prompt text`: an open "Name a …" style prompt with MANY correct answers
  (at least 15 plausible ones). Never a prompt with one right answer.
- `answers spec`: entries separated by `|`; each entry is
  `Name=alias=alias:tier`. Tier is 1–6:
  1 Plain (the first thing anyone says), 2 Too Clever (technically right but
  cheeky/edge-case — use sparingly), 3 Odd-ish, 4 Rare, 5 Deep Cut,
  6 One in an Oddlion (almost nobody says it). Aim per prompt for roughly
  2–4 tier-1, 0–2 tier-2, 4–8 tier-3, 4–8 tier-4, 4–8 tier-5, 4–10 tier-6.
- Include common nicknames/abbreviations/spellings as aliases
  (`United Kingdom=UK=Britain=England:1`). Avoid `:` and `|` inside names.
- 20–40 answers per prompt. Keep every answer factually correct for the
  prompt; when unsure, leave it out.
- Spread categories: no more than 12 prompts in any one category per file;
  include some Canada-flavoured prompts (the players are in Toronto) and keep
  the rest global. Mix eras and difficulty. No politics, no slurs, nothing
  that needs a content warning.

## 3. Validate and trim

```
cd oddler/app && ./build-logic.sh
```

It must end with `ALL LOGIC CHECKS PASSED`. Then enforce the rolling window:
keep only the **5 newest** `14-bank-auto-*.js` files (500 auto prompts) —
`git rm` older ones — and run `./build-logic.sh` again. Also confirm
`wc -c logic.js` is under 900000 bytes; if not, remove the oldest auto file
until it is.

Commit with a message like `Oddler: 100 auto prompts (2026-10-28 06:00 UTC)`
plus the usual attribution lines, and push the branch.

## 4. Ship to the live game (deploy task only)

Use the Higgsfield tools (load them with ToolSearch if deferred):

1. `website_repo_access` with `website_id` above and `operation: "checkout"`
   → `checkout_path`.
2. In `sandbox_exec` (commands are capped at ~60 s each; split long work and
   run tests in the background with `background: true`, polling the log):
   - `export PATH=$HOME/.bun/bin:$PATH; bun --version || (curl -fsSL https://bun.sh/install | bash)`
   - `cd <checkout_path>/app && [ -d node_modules ] || bun install`
   - fetch the freshly pushed rules file from GitHub (public repo):
     `curl -fsSL https://raw.githubusercontent.com/bytommynewman/tommy/<commit-sha>/oddler/app/logic.js -o src/logic.js`
   - `bun run build` (must print `built dist/worker/index.js`)
   - `bun run test` (must print `Tests  N passed`, no failures)
   - `git add -A && git commit -m "Oddler: 100 auto prompts (<date>)"`
3. `website_repo_access` with `operation: "push"` → expect `status: "pushed"`.
4. `deploy_website` (the call may time out client-side; that's fine) then poll
   `website_status` until `production.status` is `deployed`, and confirm with
   `curl -s https://oddler.higgsfield.app/ | grep -c Oddler` from the sandbox.

## 5. Report

End with four lines: the new file name, number of prompts/answers now in the
bank (from build-logic output), test result, and the deploy status. If the
deploy failed, say exactly which step and leave the branch pushed so the next
run can retry.
