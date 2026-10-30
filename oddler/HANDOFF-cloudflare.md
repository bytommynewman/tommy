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
- [ ] First deploy green
- [ ] oddler.app verified

## Known follow-ups (after it is live)

- Server: resolve the player from the token in the worker instead of trusting
  `join.playerId`; serialize room messages with `blockConcurrencyWhile`; keep
  Daily once-per-player in the profile, not the room.
- `oddler/app/14-bank-auto-20261028-17.js` prompts 51–100 are held back on the
  old Higgsfield copy only (its scanner refused them); on Cloudflare all ship.
