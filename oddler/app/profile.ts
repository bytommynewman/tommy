/**
 * Player accounts and lockers.
 *
 * Every browser starts as a guest: it holds a random secret token whose hash
 * is its player id, and a locker lives in KV under that id. Signing up turns
 * the current guest locker into an account locker (nothing is lost); logging
 * in on another device points that device at the account's locker. Sessions
 * are random tokens stored in KV with an expiry; the client sends whichever
 * token it holds in `x-oddler-token` and the server works out who it is.
 *
 * Rooms award XP and unlocks at the end of a game (server side) — the client
 * only ever asks to wear things.
 */

import * as logic from "./logic.js";

export interface Profile {
  id: string;
  username: string | null;  // set once the locker belongs to an account
  name: string;
  colour: string;
  loadout: string[];   // part ids currently worn
  unlocked: string[];  // part ids earned in games (level rewards are implied by xp)
  xp: number;
  games: number;
  best: Record<string, number>;
  created: number;
  updated: number;
}

interface Account {
  username: string;     // as typed (display); the KV key uses the lowercase form
  salt: string;
  hash: string;
  iterations: number;
  profileId: string;
  created: number;
}

type Part = { id: string; slot: string; tier: number; level?: number };
const PARTS = logic.PARTS as Part[];
const SLOT_CAP = logic.SLOT_CAP as Record<string, number>;
const COLOURS = logic.COLOURS as string[];
const PART_BY_ID = new Map(PARTS.map((p) => [p.id, p]));

export const TOKEN_RE = /^[a-f0-9]{32,64}$/;
export const USERNAME_RE = /^[a-z0-9_]{3,16}$/;
export const PASSWORD_MIN = 6;
export const NAME_MAX = 16;
/** XP a game pays on top of its points, just for finishing. */
export const GAME_XP = 20;
const SESSION_TTL = 90 * 24 * 3600;      // seconds
const PBKDF2_ITERATIONS = 100_000;       // the Workers runtime cap
const LOGIN_FAILS_MAX = 10;              // per username per 15 minutes

// ── crypto helpers ─────────────────────────────────────────────────────────

const enc = new TextEncoder();
function hex(buf: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}
/** A guest's player id: the first 16 hex chars of its token's hash. */
export async function hashToken(token: string): Promise<string> {
  return (await sha256(token)).slice(0, 16);
}
export function randomToken(): string {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}
async function derive(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations }, key, 256);
  return hex(bits);
}
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── levels and parts ───────────────────────────────────────────────────────

/** Level 1 at 0 xp; each level needs 150 × (n-1)² — a good classic run is one early level. */
export function levelFor(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 150)) + 1;
}
export function xpForLevel(level: number): number {
  return 150 * (level - 1) ** 2;
}
/** Parts the level alone unlocks (accessories carry a `level`). */
export function levelUnlocks(level: number): string[] {
  return PARTS.filter((p) => p.level !== undefined && p.level <= level).map((p) => p.id);
}
export function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[^\p{L}\p{N} _.'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}
/** Everything this profile may wear right now. */
export function allUnlocked(p: Profile): Set<string> {
  return new Set([...p.unlocked, ...levelUnlocks(levelFor(p.xp))]);
}
/** Keep only known, unlocked parts, within each slot's capacity, in the given order. */
export function cleanLoadout(raw: unknown, owned: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const used: Record<string, number> = {};
  for (const id of raw) {
    if (typeof id !== "string" || out.includes(id)) continue;
    const part = PART_BY_ID.get(id);
    if (!part || !owned.has(id)) continue;
    const n = used[part.slot] ?? 0;
    if (n >= (SLOT_CAP[part.slot] ?? 1)) continue;
    used[part.slot] = n + 1;
    out.push(id);
    if (out.length >= 24) break;
  }
  return out;
}

// ── profiles ───────────────────────────────────────────────────────────────

export function freshProfile(id: string, now: number): Profile {
  return { id, username: null, name: "", colour: "pink", loadout: [], unlocked: [], xp: 0, games: 0, best: {}, created: now, updated: now };
}

export async function loadProfile(kv: KVNamespace, id: string, now: number): Promise<Profile> {
  const stored = await kv.get<Partial<Profile>>("profile:" + id, "json");
  const base = freshProfile(id, now);
  if (!stored) return base;
  return {
    ...base,
    ...stored,
    id,
    username: typeof stored.username === "string" ? stored.username : null,
    name: sanitizeName(stored.name),
    colour: COLOURS.includes(stored.colour as string) ? (stored.colour as string) : "pink",
    loadout: Array.isArray(stored.loadout) ? stored.loadout.filter((x) => typeof x === "string") : [],
    unlocked: Array.isArray(stored.unlocked) ? stored.unlocked.filter((x) => typeof x === "string") : [],
    xp: Number.isFinite(stored.xp) ? Math.max(0, stored.xp as number) : 0,
    games: Number.isFinite(stored.games) ? (stored.games as number) : 0,
    best: stored.best && typeof stored.best === "object" ? (stored.best as Record<string, number>) : {},
  };
}

export async function saveProfile(kv: KVNamespace, p: Profile): Promise<void> {
  await kv.put("profile:" + p.id, JSON.stringify(p));
}

/** The shape the client sees. Never includes tokens or password material. */
export function publicProfile(p: Profile) {
  const level = levelFor(p.xp);
  const owned = allUnlocked(p);
  return {
    id: p.id,
    username: p.username,
    name: p.name,
    colour: p.colour,
    loadout: cleanLoadout(p.loadout, owned),
    xp: p.xp,
    level,
    levelXp: xpForLevel(level),
    nextLevelXp: xpForLevel(level + 1),
    games: p.games,
    best: p.best,
    catalogue: PARTS.map((part) => ({
      id: part.id, slot: part.slot, tier: part.tier,
      level: part.level ?? null,
      unlocked: owned.has(part.id),
      earned: p.unlocked.includes(part.id),
    })),
  };
}

// ── identity: who does this token belong to? ───────────────────────────────

/**
 * A token is either a session (account) or a guest secret. Sessions are
 * looked up by the hash of the token, so KV never holds a usable token.
 */
export async function resolveToken(kv: KVNamespace, token: string): Promise<{ id: string; username: string | null }> {
  const digest = await sha256(token);
  const session = await kv.get<{ id: string; username: string }>("session:" + digest, "json");
  if (session && typeof session.id === "string") return { id: session.id, username: session.username ?? null };
  return { id: digest.slice(0, 16), username: null };
}

async function createSession(kv: KVNamespace, id: string, username: string): Promise<string> {
  const token = randomToken();
  await kv.put("session:" + (await sha256(token)), JSON.stringify({ id, username }), { expirationTtl: SESSION_TTL });
  return token;
}

export async function endSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete("session:" + (await sha256(token)));
}

export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase();
  return USERNAME_RE.test(u) ? u : null;
}

/**
 * Sign up. The caller's current (guest) locker becomes the account's locker
 * when it has anything in it, so progress made before signing up is kept.
 */
export async function signUp(kv: KVNamespace, guestId: string, rawUser: unknown, password: unknown, now: number)
  : Promise<{ ok: true; token: string; profile: Profile } | { ok: false; status: number; error: string }> {
  const username = normalizeUsername(rawUser);
  if (!username) return { ok: false, status: 400, error: "username: 3–16 letters, numbers or _" };
  if (typeof password !== "string" || password.length < PASSWORD_MIN) return { ok: false, status: 400, error: `password: at least ${PASSWORD_MIN} characters` };
  if (password.length > 128) return { ok: false, status: 400, error: "password too long" };
  if (await kv.get("account:" + username)) return { ok: false, status: 409, error: "that username is taken" };

  const guest = await loadProfile(kv, guestId, now);
  if (guest.username) return { ok: false, status: 409, error: "this locker already belongs to an account — log out first" };
  const profile = guest;
  profile.username = username;
  if (!profile.name) profile.name = sanitizeName(username);
  profile.updated = now;

  const salt = randomToken();
  const account: Account = {
    username, salt, iterations: PBKDF2_ITERATIONS,
    hash: await derive(password, salt, PBKDF2_ITERATIONS),
    profileId: profile.id, created: now,
  };
  await kv.put("account:" + username, JSON.stringify(account));
  await saveProfile(kv, profile);
  const token = await createSession(kv, profile.id, username);
  return { ok: true, token, profile };
}

export async function logIn(kv: KVNamespace, rawUser: unknown, password: unknown, now: number)
  : Promise<{ ok: true; token: string; profile: Profile } | { ok: false; status: number; error: string }> {
  const username = normalizeUsername(rawUser);
  if (!username || typeof password !== "string") return { ok: false, status: 400, error: "username and password required" };
  const failKey = "fail:" + username;
  const fails = Number((await kv.get(failKey)) ?? 0);
  if (fails >= LOGIN_FAILS_MAX) return { ok: false, status: 429, error: "too many tries — wait 15 minutes" };
  const account = await kv.get<Account>("account:" + username, "json");
  const okPassword = account ? sameHex(await derive(password, account.salt, account.iterations), account.hash) : false;
  if (!account || !okPassword) {
    await kv.put(failKey, String(fails + 1), { expirationTtl: 15 * 60 });
    return { ok: false, status: 401, error: "wrong username or password" };
  }
  const profile = await loadProfile(kv, account.profileId, now);
  if (!profile.username) { profile.username = username; await saveProfile(kv, profile); }
  const token = await createSession(kv, profile.id, username);
  return { ok: true, token, profile };
}

// ── awards ─────────────────────────────────────────────────────────────────

export interface GameResult {
  mode: string;
  pts: number;
  earned: string[];
}

/** Credit one finished game to one player. */
export async function awardGame(kv: KVNamespace, id: string, result: GameResult, now: number) {
  const p = await loadProfile(kv, id, now);
  const before = levelFor(p.xp);
  const beforeOwned = allUnlocked(p);
  const gained = Math.max(0, Math.floor(result.pts)) + GAME_XP;
  p.xp += gained;
  p.games += 1;
  for (const partId of result.earned) {
    if (PART_BY_ID.has(partId) && !p.unlocked.includes(partId)) p.unlocked.push(partId);
  }
  if (result.mode !== "practice") p.best[result.mode] = Math.max(p.best[result.mode] ?? 0, result.pts);
  p.updated = now;
  await saveProfile(kv, p);
  const afterOwned = allUnlocked(p);
  return { xpGained: gained, levelBefore: before, levelAfter: levelFor(p.xp), newUnlocks: [...afterOwned].filter((x) => !beforeOwned.has(x)) };
}
