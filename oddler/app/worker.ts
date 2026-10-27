/**
 * The Worker entry — everything that is not a static file lands here.
 *
 * Two jobs: route a WebSocket upgrade to the right room, and serve the small
 * account API (`/api/me`) the locker uses. Static files (`dist/client`) are
 * served by the platform BEFORE this runs.
 *
 * The `Room` re-export is required: a Durable Object class must be exported from
 * the Worker's entry module or the class does not ship and the deploy fails.
 */

import type { Env } from "./env";
import {
  allUnlocked, cleanLoadout, hashToken, loadProfile, publicProfile, sanitizeName, saveProfile, TOKEN_RE,
} from "./profile";
import { Room } from "./room";
import * as logic from "./logic.js";

export { Room };

const WS_PREFIX = "/ws";
const ROOM_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DEFAULT_ROOM = "main";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

/**
 * `/api/me` — the caller's locker. The token travels in a header, never a URL,
 * so it stays out of logs and history. GET creates the profile on first sight.
 */
async function handleMe(request: Request, env: Env): Promise<Response> {
  if (!env.KV) return json({ error: "lockers are not enabled on this deploy" }, 503);
  const token = request.headers.get("x-oddler-token") ?? "";
  if (!TOKEN_RE.test(token)) return json({ error: "missing or malformed token" }, 401);
  const id = await hashToken(token);
  const now = Date.now();
  const profile = await loadProfile(env.KV, id, now);

  if (request.method === "GET") {
    if (!profile.created || profile.created === now) await saveProfile(env.KV, profile);
    return json(publicProfile(profile));
  }
  if (request.method === "PUT") {
    let body: Record<string, unknown>;
    try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "invalid json" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "expected an object" }, 400);
    if ("name" in body) profile.name = sanitizeName(body.name);
    if ("colour" in body) {
      if (!(logic.COLOURS as string[]).includes(body.colour as string)) return json({ error: "unknown colour" }, 400);
      profile.colour = body.colour as string;
    }
    if ("loadout" in body) {
      if (!Array.isArray(body.loadout) || body.loadout.length > 24) return json({ error: "bad loadout" }, 400);
      profile.loadout = cleanLoadout(body.loadout, allUnlocked(profile));
    }
    profile.updated = now;
    await saveProfile(env.KV, profile);
    return json(publicProfile(profile));
  }
  return json({ error: "method not allowed" }, 405);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === WS_PREFIX || url.pathname.startsWith(WS_PREFIX + "/")) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("expected a websocket upgrade", { status: 426 });
      }
      const raw = url.pathname.slice(WS_PREFIX.length).replace(/^\/+/, "");
      const room = raw === "" ? DEFAULT_ROOM : raw;
      if (!ROOM_RE.test(room)) {
        return new Response("invalid room name", { status: 400 });
      }
      const id = env.ROOMS.idFromName(room);
      return env.ROOMS.get(id).fetch(request);
    }

    if (url.pathname === "/api/me") return handleMe(request, env);

    if (request.method === "GET" && request.headers.get("Accept")?.includes("text/html")) {
      return env.ASSETS.fetch(new Request(new URL("/", url), request));
    }
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
