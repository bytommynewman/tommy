# Handoff: put Oddler live on oddler.app

For a Claude session running on Tommy's Mac (Claude Desktop app, with the
built-in browser or Claude in Chrome). Tommy already bought **oddler.app** on
Cloudflare.

Repo: https://github.com/bytommynewman/tommy, branch `claude/great-meitner-cdyydz`.
Game source: `oddler/app/`. Cloudflare deploy: `oddler/deploy/` (see its
README). Auto-deploy: `.github/workflows/oddler-deploy.yml` runs on every push
to that branch that touches `oddler/`, and skips until the two secrets exist.

## Steps

1. **Cloudflare API token** (browser, Tommy signed in to Cloudflare):
   https://dash.cloudflare.com/profile/api-tokens → Create Token → template
   "Edit Cloudflare Workers" → add permissions *Account · Workers KV Storage ·
   Edit* and *Zone · DNS · Edit*, zone resources *Specific zone → oddler.app* →
   Continue → Create Token. Note the **Account ID** (domain Overview page,
   right column).
2. **GitHub secrets** (browser, Tommy signed in to GitHub):
   https://github.com/bytommynewman/tommy/settings/secrets/actions/new — add
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never write the token
   anywhere else (no files, no chat, no commits).
3. **First deploy:** make a real one-line change under `oddler/` (for example
   tick the "Secrets added" box below), commit, push to
   `claude/great-meitner-cdyydz`. Watch the `oddler-deploy` run at
   https://github.com/bytommynewman/tommy/actions and fix any failure.
4. **Verify:** https://oddler.app loads, a Classic round starts, an answer
   grades, and a Duo room code works between two tabs.

## Status

- [x] Secrets added
- [x] First deploy green
- [x] oddler.app verified

Two things the first run needed, both now fixed or done once:

- `oddler/deploy/package.json` pinned `@cloudflare/workers-types` to v4, which
  wrangler 4 no longer accepts as a peer; bumped to v5.
- Cloudflare refused the publish until the account had a workers.dev subdomain.
  Opening Workers & Pages in the dashboard created it (`tommy-newman.workers.dev`).

## Server hardening — done 2026-10-29

- The socket's player is resolved from the token in the Worker. The browser
  offers it as a `t.<token>` subprotocol (a socket carries no headers, and a
  query string would be logged); the Worker passes `x-oddler-player` to the
  room, which ignores whatever the `join` frame claims. No token → 401.
  **A tab running the old cached `client.js` cannot connect: reload it.**
- Both socket handlers run inside `blockConcurrencyWhile`, so two frames can no
  longer read the same game and overwrite each other across a KV await.
- Daily is once per player: the day lives in the locker (`profile.dailyDone`),
  the room attaches it to `start`, and the rules refuse on that. A fresh room
  code is no longer a second go.

## Known follow-ups

- `oddler/app/14-bank-auto-20261028-17.js` prompts 51–100 are held back on the
  old Higgsfield copy only (its scanner refused them); on Cloudflare all ship.
- The Daily card on the home screen reads the locker, but a brand-new room
  still shows it unplayed until you try — the refusal is correct, the card is
  a beat behind.
