/**
 * The Worker entry — everything that is not a static file lands here.
 *
 * Two jobs: route a WebSocket upgrade to the right room, and serve the small
 * account API the locker uses (`/api/me`, `/api/signup`, `/api/login`,
 * `/api/logout`). Static files (`dist/client`) are served by the platform
 * BEFORE this runs.
 *
 * The `Room` re-export is required: a Durable Object class must be exported from
 * the Worker's entry module or the class does not ship and the deploy fails.
 */

import type { Env } from "./env";
import {
  allUnlocked, bannerUnlocked, cleanLoadout, endSession, levelFor, loadProfile, logIn, publicProfile, resolveToken,
  sanitizeName, saveProfile, signUp, TOKEN_RE,
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

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch { return null; }
}

function tokenOf(request: Request): string | null {
  const token = request.headers.get("x-oddler-token") ?? "";
  return TOKEN_RE.test(token) ? token : null;
}

/** `/api/me` — the caller's locker. GET creates a guest profile on first sight. */
async function handleMe(request: Request, kv: KVNamespace): Promise<Response> {
  const token = tokenOf(request);
  if (!token) return json({ error: "missing or malformed token" }, 401);
  const who = await resolveToken(kv, token);
  const now = Date.now();
  const profile = await loadProfile(kv, who.id, now);

  if (request.method === "GET") {
    if (profile.created === now) await saveProfile(kv, profile);
    return json(publicProfile(profile));
  }
  if (request.method === "PUT") {
    const body = await readBody(request);
    if (!body) return json({ error: "expected a json object" }, 400);
    if ("name" in body) profile.name = sanitizeName(body.name);
    if ("colour" in body) {
      if (!(logic.COLOURS as string[]).includes(body.colour as string)) return json({ error: "unknown colour" }, 400);
      profile.colour = body.colour as string;
    }
    if ("banner" in body) {
      if (typeof body.banner !== "string" || !bannerUnlocked(body.banner, levelFor(profile.xp))) return json({ error: "banner not unlocked" }, 400);
      profile.banner = body.banner;
    }
    if ("loadout" in body) {
      if (!Array.isArray(body.loadout) || body.loadout.length > 24) return json({ error: "bad loadout" }, 400);
      profile.loadout = cleanLoadout(body.loadout, allUnlocked(profile));
    }
    profile.updated = now;
    await saveProfile(kv, profile);
    return json(publicProfile(profile));
  }
  return json({ error: "method not allowed" }, 405);
}

async function handleAuth(path: string, request: Request, kv: KVNamespace): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  const now = Date.now();
  const token = tokenOf(request);
  if (path === "/api/logout") {
    if (token) await endSession(kv, token);
    return json({ ok: true });
  }
  const body = await readBody(request);
  if (!body) return json({ error: "expected a json object" }, 400);
  if (path === "/api/signup") {
    // The guest locker this browser has been using becomes the account's.
    const guestId = token ? (await resolveToken(kv, token)).id : (await resolveToken(kv, "0".repeat(32))).id;
    const r = await signUp(kv, guestId, body.username, body.password, now);
    if (!r.ok) return json({ error: r.error }, r.status);
    return json({ token: r.token, profile: publicProfile(r.profile) });
  }
  if (path === "/api/login") {
    const r = await logIn(kv, body.username, body.password, now);
    if (!r.ok) return json({ error: r.error }, r.status);
    return json({ token: r.token, profile: publicProfile(r.profile) });
  }
  return json({ error: "not found" }, 404);
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

    if (url.pathname.startsWith("/api/")) {
      if (!env.KV) return json({ error: "lockers are not enabled on this deploy" }, 503);
      if (url.pathname === "/api/me") return handleMe(request, env.KV);
      if (["/api/signup", "/api/login", "/api/logout"].includes(url.pathname)) return handleAuth(url.pathname, request, env.KV);
      return json({ error: "not found" }, 404);
    }

    if (request.method === "GET" && request.headers.get("Accept")?.includes("text/html")) {
      return env.ASSETS.fetch(new Request(new URL("/", url), request));
    }
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
