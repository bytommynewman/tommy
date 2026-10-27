/**
 * Player accounts: a locker per person.
 *
 * An account is a secret token the browser keeps. Its SHA-256 (first 16 hex
 * chars) is the public player id used in rooms, so partners see the id but
 * never the token. Profiles live in KV under that id: name, colour, what has
 * been unlocked, what is worn, XP and bests. Rooms award XP and unlocks at the
 * end of a game (server side — the client only ever asks to wear things).
 */

import * as logic from "./logic.js";

export interface Profile {
  id: string;
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

type Part = { id: string; slot: string; tier: number; level?: number };
const PARTS = logic.PARTS as Part[];
const SLOT_CAP = logic.SLOT_CAP as Record<string, number>;
const COLOURS = logic.COLOURS as string[];
const PART_BY_ID = new Map(PARTS.map((p) => [p.id, p]));

export const TOKEN_RE = /^[a-f0-9]{32,64}$/;
export const NAME_MAX = 16;
/** XP a game pays on top of its points, just for finishing. */
export const GAME_XP = 20;

export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

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

export function freshProfile(id: string, now: number): Profile {
  return { id, name: "", colour: "pink", loadout: [], unlocked: [], xp: 0, games: 0, best: {}, created: now, updated: now };
}

export async function loadProfile(kv: KVNamespace, id: string, now: number): Promise<Profile> {
  const stored = await kv.get<Partial<Profile>>("profile:" + id, "json");
  const base = freshProfile(id, now);
  if (!stored) return base;
  return {
    ...base,
    ...stored,
    id,
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

/** The shape the client sees. Never includes the token (we never had it). */
export function publicProfile(p: Profile) {
  const level = levelFor(p.xp);
  const owned = allUnlocked(p);
  return {
    id: p.id,
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

export interface GameResult {
  mode: string;
  pts: number;
  earned: string[];
}

/** Credit one finished game to one player. Returns what changed, for the client's fanfare. */
export async function awardGame(kv: KVNamespace, id: string, result: GameResult, now: number) {
  const p = await loadProfile(kv, id, now);
  const before = levelFor(p.xp);
  const beforeOwned = allUnlocked(p);
  p.xp += Math.max(0, Math.floor(result.pts)) + GAME_XP;
  p.games += 1;
  for (const partId of result.earned) {
    if (PART_BY_ID.has(partId) && !p.unlocked.includes(partId)) p.unlocked.push(partId);
  }
  if (result.mode !== "practice") p.best[result.mode] = Math.max(p.best[result.mode] ?? 0, result.pts);
  p.updated = now;
  await saveProfile(kv, p);
  const afterOwned = allUnlocked(p);
  return {
    xpGained: p.xp - (p.xp - result.pts - GAME_XP),
    levelBefore: before,
    levelAfter: levelFor(p.xp),
    newUnlocks: [...afterOwned].filter((x) => !beforeOwned.has(x)),
  };
}
