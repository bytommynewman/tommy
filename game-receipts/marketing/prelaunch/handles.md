# Handle & domain availability (checked 2026-10-21)

Method: plain `curl` with a desktop-Chrome User-Agent, `whois -h <registry>`, `dig` (NS/A), and the `api.fxtwitter.com` public lookup for X. Nothing was logged into, nothing was created. Platform checks that need a login are marked **unverified**; confirm them in the sign-up flow (the sign-up form says "username not available" in real time).

## Results

| Handle | Instagram | TikTok | YouTube (@handle) | X | Reddit (u/) |
|---|---|---|---|---|---|
| **gamereceipts** | ? unverified (login wall) | ? unverified (bot wall) | **TAKEN** — existing channel "Game Receipts" (`/@GameReceipts`, HTTP 200) | **TAKEN** — @GameReceipts exists (name "Game Receipts", 25 posts, 1 follower, id from 2026). Might already be yours — check | ? unverified (Reddit blocks scripted requests: 403 / "access forbidden") |
| gamereceiptsapp | ? unverified | ? unverified | **free** (404) | **free** (404 "User not found") | ? unverified |
| getgamereceipts | ? unverified | ? unverified | **free** (404) | **free** (404) | ? unverified |
| thegamereceipts | ? unverified | ? unverified | **free** (404) | **free** (404) | ? unverified |
| gamereceipts.app (as a handle) | n/a (dots allowed on IG only) | n/a | free (404) | n/a | n/a |

Confidence: YouTube and X rows = **high** (clear 200 vs 404, X confirmed by two independent lookups). Instagram, TikTok, Reddit = **none**: Instagram serves a generic login page with HTTP 200 for every name (including nonsense ones), its JSON profile API demands login; TikTok serves a WAF challenge page of identical size for every name; Reddit returns a block page / 403 to scripts. Do not treat any of those as "available".

## Domains

| Domain | whois / DNS result | Verdict | Confidence |
|---|---|---|---|
| gamereceipts.com | Verisign: "No match"; no NS/A records | **available** | high |
| gamereceipts.co | .CO registry: "DOMAIN NOT FOUND"; no NS/A | **available** | high |
| gamereceipts.app | Google registry whois host unreachable from here; no NS/A records; RDAP 404 | **probably available** (re-check at a registrar) | medium |
| getgamereceipts.com | Verisign: "No match"; no DNS | available | high |
| gamereceiptsapp.com | Verisign: "No match"; no DNS | available | high |
| thegamereceipts.com | Verisign: "No match"; no DNS | available | high |

Registrars will also tell you about premium pricing; "no match" only means unregistered. Buy nothing until you decide (domains are ~$12/yr .com, ~$14 .app, ~$30 .co).

## Recommendation

`@gamereceipts` is gone on YouTube (and X, unless that X account is yours), so one identical handle everywhere is not possible. Use **@gamereceiptsapp** as the single handle on all five platforms. It is clean, obviously the product, and free on the two platforms we could verify. Fallback order if a platform has it: `getgamereceipts` → `thegamereceipts`.

- **Handle set:** `@gamereceiptsapp` on Instagram, TikTok, YouTube, X; Reddit `u/gamereceiptsapp`. Display name "Game Receipts" everywhere.
- **Domain:** register **gamereceipts.com** (available, matches display name). Optionally also gamereceipts.app and redirect it. Until a domain exists, the waitlist can live on any free static host and the bio link points at that.
- **Before committing:** (1) open the X account @GameReceipts while logged out and see whose it is. If it's Tommy's, then X can be `@GameReceipts` and the others `@gamereceiptsapp`. (2) Try `gamereceipts` first on Instagram, TikTok, Reddit during sign-up; if free there, you may use it on those three and accept the mismatch with YouTube, but a single consistent handle is better for discovery. (3) Create all accounts the same day so nobody squats the set.
