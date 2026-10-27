# Oddler

Source for the Oddler browser game (Krillion-style "only uncommon answers score"
trivia where rare answers grow a pixel-art axolotl). The live game is built and
hosted on Higgsfield's game platform; this folder is the authoritative copy of
the hand-written parts so they survive outside that sandbox.

- `app/00-header.js`, `app/1*-bank*.js`, `app/20-rules.js` — pieces of the rules
  module. `app/build-logic.sh` concatenates them into `app/logic.js` (the
  platform forbids imports in the rules file) and runs the rule checks with node.
  Bank pieces `10`–`13` are hand-written; `14-bank-auto-*` files are added by the
  12-hourly refresh described in `AUTOGEN.md`.
- `app/client.js`, `app/anchors.js`, `app/index.html` — the screen; `anchors.js` holds the
  part placement and the one creature-drawing function.
- `app/profile.ts`, `app/worker.ts`, `app/backend.patch.py` — the locker: accounts keyed by a
  secret token, profiles in KV, `/api/me`, and the room-side XP/unlock awards
  (the patch script wires room.ts, env.ts, the manifest and wrangler config).
- `app/room.test.ts` — the platform room tests, rewritten for Oddler.
- `app/room.patch.sh` — stamps the room clock onto each action (rules stay pure).
- `design/higgsfield-designs.json` — the Higgsfield generations the art came from.
- `design/krillion-breakdown-plan.md` — the product plan this build follows.
