# Running Oddler on your own Cloudflare account (custom domain)

Higgsfield's hosting has no custom-domain option, so moving the address away
from oddler.higgsfield.app means running the same Worker on your own Cloudflare
account. Nothing in the game changes: it is one Cloudflare Worker, one Durable
Object class (`Room`) and one KV namespace (lockers), plus static files.

## What you do once (about 15 minutes)

1. **Buy the domain.** `oddler.app` was unregistered on 2026-10-28 (so were
   oddler.gg, oddler.io, oddler.fun, playoddler.com). Simplest is Cloudflare
   Registrar: dash.cloudflare.com → Domain Registration → Register → oddler.app
   (about US$14/yr). Buying it there makes DNS automatic. If you buy elsewhere,
   add the site to Cloudflare afterwards and switch the nameservers.
2. **Plan.** The Workers Free plan covers Durable Objects (SQLite-backed) and KV
   at this game's scale. Upgrade to Workers Paid (US$5/mo) only if usage grows.
3. **API token.** dash.cloudflare.com → My Profile → API Tokens → Create Token →
   template "Edit Cloudflare Workers". Add two permissions to it:
   *Account → Workers KV Storage → Edit* and *Zone → DNS → Edit* (zone: oddler.app).
   Copy the token once; note your **Account ID** (dashboard sidebar).
4. **Give GitHub the token.** On github.com open bytommynewman/tommy →
   Settings → Secrets and variables → Actions → New repository secret. Add
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

That is all. The workflow `.github/workflows/oddler-deploy.yml` deploys on every
push to `claude/great-meitner-cdyydz` that touches `oddler/`, on GitHub's
machines, so updates go live without using any Claude tokens. You can also run
it by hand from the repo's Actions tab.

## What the deploy does

- Assembles the app from this repo: rules (`oddler/app/logic.js`), client
  (`client.js`, `index.html`, `anchors.js`), the room/worker sources under
  `oddler/deploy/src`, and the art pulled from the live site.
- Builds the Worker with esbuild (`npm run build` here).
- `wrangler kv namespace create oddler-profiles` → paste the id into
  `wrangler.jsonc`.
- `wrangler deploy` → publishes with the custom domain route `oddler.app`.
- Verifies: play a solo game and a Duo room against the new address.

The existing oddler.higgsfield.app keeps running; player lockers do not move
across automatically (they live in Higgsfield's KV). Ask if you want a one-time
export/import of lockers at switch-over.
