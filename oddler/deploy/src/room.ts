/**
 * `Room` — one multiplayer room, as a Durable Object (standalone copy of the
 * Higgsfield game-kernel room, with Oddler's clock stamping and locker hooks).
 *
 *   in:  {type:"join", playerId} | {type:"action", action} | {type:"reset"}
 *   out: {type:"state", status, seats, you, connected, view, result, meta}
 *        {type:"error", error}
 *
 * Sockets are accepted with `ctx.acceptWebSocket` (hibernation): never keep game
 * state in instance fields — everything lives in `ctx.storage`.
 */

import { DurableObject } from "cloudflare:workers";

import type { Env } from "./env";
import * as logic from "./logic.js";
import { parseClientMessage } from "./protocol";
import { awardGame, loadProfile, allUnlocked, cleanLoadout } from "./profile";

interface Game {
  status: "waiting" | "playing" | "over";
  seats: string[];
  state: unknown;
  result: unknown;
}
type Conns = Record<string, string>;
interface Out { to: string | string[]; data: unknown; }
type Dispatchable = Out[] | { out?: Out[]; wakeIn?: number | null } | void;

export function freshGame(): Game {
  return { status: "waiting", seats: [], state: null, result: null };
}

export function resolveMeta(raw: unknown): { game: string; minPlayers: number; maxPlayers: number } {
  const meta = (raw ?? {}) as Record<string, unknown>;
  const players = Array.isArray(meta.players) ? (meta.players as unknown[]) : [];
  const seats = (value: unknown, fallback: number): number =>
    Number.isInteger(value) && (value as number) >= 1 ? (value as number) : fallback;
  const minPlayers = seats(meta.minPlayers, seats(players[0], 1));
  const maxPlayers = seats(meta.maxPlayers, seats(players[1], minPlayers));
  const named = [meta.game, meta.name, meta.title].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return { game: named ?? "Game", minPlayers, maxPlayers: Math.max(minPlayers, maxPlayers) };
}

const META = resolveMeta(logic.meta);
const PING = "__ping";
const PONG = "__pong";
/** The subprotocol the client offers beside its token; echoed on the upgrade. */
const WS_PROTOCOL = "oddler.v1";

/** What a socket is: its connection id, and the player the Worker resolved. */
interface Who { connId: string; playerId: string; }

export class Room extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  private async load(): Promise<{ game: Game; conns: Conns }> {
    const [game, conns] = await Promise.all([
      this.ctx.storage.get<Game>("game"),
      this.ctx.storage.get<Conns>("conns"),
    ]);
    return { game: game ?? freshGame(), conns: conns ?? {} };
  }

  private async save(game: Game, conns: Conns): Promise<void> {
    await this.ctx.storage.put({ game, conns });
  }

  private broadcast(game: Game, conns: Conns): Out[] {
    const connected = Object.keys(conns).length;
    return Object.entries(conns).map(([connId, playerId]) => ({
      to: connId,
      data: {
        type: "state",
        status: game.status,
        seats: game.seats,
        you: playerId,
        connected,
        view: game.state ? logic.viewFor(game.state, playerId) : null,
        result: game.result,
        meta: META,
      },
    }));
  }

  private error(connId: string, error: string): Out[] {
    return [{ to: connId, data: { type: "error", error } }];
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected a websocket upgrade", { status: 426 });
    }
    // The Worker in front of us has already turned the socket's token into a
    // player id. A socket that arrives without one is not identified, and an
    // unidentified socket never gets a seat.
    const playerId = request.headers.get("x-oddler-player") ?? "";
    if (!playerId) return new Response("unidentified socket", { status: 401 });
    const pair = new WebSocketPair();
    const server = pair[1]!;
    this.ctx.acceptWebSocket(server);
    const connId = crypto.randomUUID().slice(0, 8);
    server.serializeAttachment({ connId, playerId } satisfies Who);
    const offered = (request.headers.get("Sec-WebSocket-Protocol") ?? "").split(",").map((p) => p.trim());
    return new Response(null, {
      status: 101,
      webSocket: pair[0],
      headers: offered.includes(WS_PROTOCOL) ? { "Sec-WebSocket-Protocol": WS_PROTOCOL } : undefined,
    });
  }

  private whoIs(ws: WebSocket): Who | null {
    const att = ws.deserializeAttachment() as Partial<Who> | null;
    return att?.connId && att.playerId ? { connId: att.connId, playerId: att.playerId } : null;
  }

  private connIdOf(ws: WebSocket): string | undefined {
    return this.whoIs(ws)?.connId;
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const who = this.whoIs(ws);
    if (!who) return;
    try {
      // One frame at a time. Between `load` and `save` this handler awaits KV
      // for profiles, and KV is not storage: without the gate a second frame
      // could read the same game, act on it, and overwrite the first's write.
      await this.ctx.blockConcurrencyWhile(async () => {
        await this.dispatch(await this.onMessage(who, raw));
      });
    } catch (err) {
      console.error("room message failed:", err instanceof Error ? err.stack : String(err));
      try {
        ws.send(JSON.stringify({ type: "error", error: "server error" }));
      } catch {
        /* socket already gone */
      }
    }
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    const connId = this.connIdOf(ws);
    if (!connId) return;
    await this.ctx.blockConcurrencyWhile(async () => {
      const { game, conns } = await this.load();
      if (conns[connId] === undefined) return;
      delete conns[connId];
      await this.save(game, conns);
      await this.dispatch(this.broadcast(game, conns));
    });
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  override async alarm(): Promise<void> {
    try {
      await this.dispatch(await this.onWake());
    } catch (err) {
      console.error("room alarm failed:", err instanceof Error ? err.stack : String(err));
    }
  }

  private async onMessage(who: Who, raw: string | ArrayBuffer): Promise<Dispatchable> {
    const connId = who.connId;
    const parsed = parseClientMessage(raw);
    if (!parsed.ok) return this.error(connId, parsed.error);
    const msg = parsed.msg;
    const { game, conns } = await this.load();

    if (msg.type === "join") {
      conns[connId] = who.playerId;
      if (!game.seats.includes(who.playerId) && game.seats.length < META.maxPlayers) {
        game.seats.push(who.playerId);
      }
      if (game.status === "waiting" && game.seats.length >= META.minPlayers) {
        game.state = logic.setup(game.seats);
        game.status = "playing";
      }
      await this.save(game, conns);
      return this.broadcast(game, conns);
    }

    const playerId = conns[connId];
    if (!playerId) return this.error(connId, "join first");

    if (msg.type === "action") {
      if (game.status !== "playing") return this.error(connId, "game is not in progress");
      if (!game.seats.includes(playerId)) return this.error(connId, "spectators cannot act");
      // The room stamps the clock onto every action: rules stay pure and a
      // client cannot claim its own timestamp.
      let action =
        msg.action && typeof msg.action === "object" && !Array.isArray(msg.action)
          ? { ...(msg.action as Record<string, unknown>), at: Date.now() }
          : msg.action;
      action = await this.enrich(action, playerId, game.seats);
      const verdict = logic.validateAction(game.state, playerId, action);
      if (!verdict.ok) return this.error(connId, verdict.error ?? "invalid action");
      const before = game.state as { phase?: string } | null;
      game.state = logic.applyAction(game.state, playerId, action);
      const after = game.state as { phase?: string };
      if (after?.phase === "done" && before?.phase !== "done") await this.award(game.state);
      const end = logic.isGameOver(game.state);
      if (end.over) {
        game.status = "over";
        game.result = end;
      }
      await this.save(game, conns);
      return this.broadcast(game, conns);
    }

    if (!game.seats.includes(playerId)) return this.error(connId, "spectators cannot reset");
    const enough = game.seats.length >= META.minPlayers;
    game.state = enough ? logic.setup(game.seats) : null;
    game.status = enough ? "playing" : "waiting";
    game.result = null;
    await this.save(game, conns);
    return this.broadcast(game, conns);
  }

  private async onWake(): Promise<Dispatchable> {
    return [];
  }

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
        // Daily is once per player, so the answer comes from the caller's own
        // locker — a fresh room, or one whose state was cleared, is not a
        // second go.
        let dailyDone: number | null = null;
        for (const id of ids) {
          const p = await loadProfile(this.env.KV, id, now);
          if (id === playerId) dailyDone = p.dailyDone;
          names[id] = p.name;
          colours[id] = p.colour;
          banners[id] = p.banner;
          loadouts[id] = cleanLoadout(p.loadout, allUnlocked(p));
        }
        if (!ids.includes(playerId)) {
          dailyDone = (await loadProfile(this.env.KV, playerId, now)).dailyDone;
        }
        return { ...a, names, loadouts, colours, banners, dailyDone };
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
      dailyDone?: number | null;
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
        const day = s.mode === "daily" ? s.dailyDone ?? null : null;
        await awardGame(this.env.KV, s.player, { mode: s.mode ?? "classic", pts: s.score ?? 0, earned: s.earned ?? [], day }, now);
      }
    } catch (err) {
      console.error("award failed:", err instanceof Error ? err.message : String(err));
    }
  }

  private async dispatch(res: Dispatchable): Promise<void> {
    if (!res) return;
    const msgs = Array.isArray(res) ? res : (res.out ?? []);
    const wakeIn = Array.isArray(res) ? undefined : res.wakeIn;
    if (msgs.length) {
      const sockets = this.ctx.getWebSockets();
      const byId = new Map<string, WebSocket>();
      for (const s of sockets) {
        const id = this.connIdOf(s);
        if (id) byId.set(id, s);
      }
      for (const m of msgs) {
        if (!m) continue;
        const data = typeof m.data === "string" ? m.data : JSON.stringify(m.data);
        const targets =
          m.to === "*"
            ? sockets
            : Array.isArray(m.to)
              ? m.to.map((id) => byId.get(id)).filter((s): s is WebSocket => Boolean(s))
              : [byId.get(m.to)].filter((s): s is WebSocket => Boolean(s));
        for (const t of targets) {
          try {
            t.send(data);
          } catch {
            /* socket closed mid-fan-out */
          }
        }
      }
    }
    if (wakeIn === null) await this.ctx.storage.deleteAlarm();
    else if (typeof wakeIn === "number") await this.ctx.storage.setAlarm(Date.now() + wakeIn);
  }
}
