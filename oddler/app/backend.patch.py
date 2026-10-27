#!/usr/bin/env python3
"""Wire the locker into the platform files: KV binding, room enrichment and awards.

Run from the checkout's app/ directory (idempotent: skips edits already present)."""
import json, re, sys, os

app = sys.argv[1] if len(sys.argv) > 1 else "."

def patch(path, old, new, must=True):
    p = os.path.join(app, path); s = open(p).read()
    if new in s: print("already:", path); return
    if old not in s:
        if must: raise SystemExit("anchor missing in " + path + ": " + old[:60])
        print("skip:", path); return
    open(p, "w").write(s.replace(old, new, 1)); print("patched:", path)

# 1. manifest + dev config: a KV namespace for profiles
m = json.load(open(os.path.join(app, "app.manifest.json")))
if not m.get("kv"):
    m["kv"] = True; json.dump(m, open(os.path.join(app, "app.manifest.json"), "w"), indent=2); print("patched: app.manifest.json")
patch("wrangler.jsonc", '''  "durable_objects": {''', '''  // Profiles (the locker). The deploy provisions the real namespace from
  // app.manifest.json; this id only feeds local dev and the test runner.
  "kv_namespaces": [{ "binding": "KV", "id": "oddler-profiles-dev" }],

  "durable_objects": {''')
patch("src/env.ts", '''  /** One Durable Object instance per room — `app.manifest.json` → durableObject. */
  ROOMS: DurableObjectNamespace;''', '''  /** One Durable Object instance per room — `app.manifest.json` → durableObject. */
  ROOMS: DurableObjectNamespace;
  /** Player profiles (the locker) — `app.manifest.json` → kv. */
  KV?: KVNamespace;''')

# 2. room.ts: enrich sit/start with names + loadouts, award at game end
patch("src/room.ts", '''import { parseClientMessage } from "./protocol";''', '''import { parseClientMessage } from "./protocol";
import { awardGame, loadProfile } from "./profile";''')
patch("src/room.ts", '''      // Oddler: the room stamps the clock onto every action. Rules stay pure
      // (time is just an input) and a client cannot claim its own timestamp.
      const action =
        msg.action && typeof msg.action === "object" && !Array.isArray(msg.action)
          ? { ...(msg.action as Record<string, unknown>), at: Date.now() }
          : msg.action;
      const verdict = logic.validateAction(game.state, playerId, action);
      if (!verdict.ok) return this.error(connId, verdict.error ?? "invalid action");
      game.state = logic.applyAction(game.state, playerId, action);
      const end = logic.isGameOver(game.state);''', '''      // Oddler: the room stamps the clock onto every action. Rules stay pure
      // (time is just an input) and a client cannot claim its own timestamp.
      let action =
        msg.action && typeof msg.action === "object" && !Array.isArray(msg.action)
          ? { ...(msg.action as Record<string, unknown>), at: Date.now() }
          : msg.action;
      // The locker is the source of truth for names and what a creature wears:
      // the room looks them up, so a client cannot dress up in parts it lacks.
      action = await this.enrich(action, playerId, game.seats);
      const verdict = logic.validateAction(game.state, playerId, action);
      if (!verdict.ok) return this.error(connId, verdict.error ?? "invalid action");
      const before = game.state as { phase?: string } | null;
      game.state = logic.applyAction(game.state, playerId, action);
      const after = game.state as { phase?: string };
      if (after?.phase === "done" && before?.phase !== "done") await this.award(game.state);
      const end = logic.isGameOver(game.state);''')
patch("src/room.ts", '''  /** Turn-based games schedule no timers; override for real-time loops. */
  private async onWake(): Promise<Dispatchable> {
    return [];
  }''', '''  /** Turn-based games schedule no timers; override for real-time loops. */
  private async onWake(): Promise<Dispatchable> {
    return [];
  }

  // ── the locker (Oddler) ────────────────────────────────────────────────

  /** Attach profile-backed `name` (sit) and `names`/`loadouts` (start) to an action. */
  private async enrich(action: unknown, playerId: string, seats: string[]): Promise<unknown> {
    if (!this.env.KV || !action || typeof action !== "object") return action;
    const a = action as Record<string, unknown>;
    const now = Date.now();
    try {
      if (a.kind === "sit") {
        const p = await loadProfile(this.env.KV, playerId, now);
        return { ...a, name: p.name, banner: p.banner, colour: a.colour ?? p.colour };
      }
      if (a.kind === "start") {
        const ids = seats.length ? seats : [playerId];
        const names: Record<string, string> = {};
        const loadouts: Record<string, string[]> = {};
        const colours: Record<string, string> = {};
        const banners: Record<string, string> = {};
        for (const id of ids) {
          const p = await loadProfile(this.env.KV, id, now);
          names[id] = p.name;
          colours[id] = p.colour;
          banners[id] = p.banner;
          // Only wear what is actually unlocked.
          const { allUnlocked, cleanLoadout } = await import("./profile");
          loadouts[id] = cleanLoadout(p.loadout, allUnlocked(p));
        }
        return { ...a, names, loadouts, colours, banners };
      }
    } catch (err) {
      console.error("profile lookup failed:", err instanceof Error ? err.message : String(err));
    }
    return action;
  }

  /** Credit a finished game to every seated player's locker. */
  private async award(state: unknown): Promise<void> {
    if (!this.env.KV || !state || typeof state !== "object") return;
    const s = state as {
      kind?: string; mode?: string; player?: string; score?: number; earned?: string[];
      players?: string[]; profiles?: Record<string, { pts?: number; earned?: string[] }>;
    };
    const now = Date.now();
    try {
      if (s.kind === "duo" && s.players && s.profiles) {
        for (const id of s.players) {
          const p = s.profiles[id] ?? {};
          await awardGame(this.env.KV, id, { mode: "duo", pts: p.pts ?? 0, earned: p.earned ?? [] }, now);
        }
      } else if (s.player) {
        await awardGame(this.env.KV, s.player, { mode: s.mode ?? "classic", pts: s.score ?? 0, earned: s.earned ?? [] }, now);
      }
    } catch (err) {
      console.error("award failed:", err instanceof Error ? err.message : String(err));
    }
  }''')
# 3. logic.d.ts: the extra exports the locker reads
dts = os.path.join(app, "src/logic.d.ts"); s = open(dts).read()
if "export const PARTS" not in s:
    open(dts, "a").write(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "logic.d.ts.append")).read()); print("patched: src/logic.d.ts")
print("backend patch complete")
