# Connecting your Wealthsimple portfolio (one-time setup)

Wealthsimple has no public API, so the app connects through **SnapTrade** — a
brokerage-connection service (free developer tier) that officially supports
Wealthsimple. You create the SnapTrade account; Claude wires everything else.

## What you do (~10 minutes)

1. Go to https://snaptrade.com → **Get started / Sign up** as a developer
   (use tommy_newman@icloud.com).
2. In the SnapTrade dashboard, create an app. Copy two values:
   - **Client ID**
   - **Consumer Key** (this is a secret — treat it like your Anthropic key:
     never paste it into chat, only into the Terminal command below)
3. In Terminal:
   ```
   cd ~/Desktop/coding-projects/my-first-project
   supabase secrets set SNAPTRADE_CLIENT_ID=...paste client id...
   supabase secrets set SNAPTRADE_CONSUMER_KEY=...paste consumer key...
   ```
4. Tell Claude "snaptrade keys are set" — Claude then builds and you deploy a
   `snaptrade-portfolio` function plus a connect button in Invest → Portfolio.
   Tapping it opens SnapTrade's secure page where you log into Wealthsimple
   ONCE; after that the Portfolio tab shows your live holdings, balances, and
   day change. Your Wealthsimple password is never seen by the app or stored
   anywhere — the login happens on SnapTrade's page.

## What you get

- Portfolio tab: total value, day change, per-holding rows (name, quantity,
  value, gain) pulled live from Wealthsimple.
- The same numbers feed Scratch's context later, so the caddie can talk about
  your round AND your portfolio.
