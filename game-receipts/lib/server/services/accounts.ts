import { LEAGUES, TEAMS, type League } from "../../catalog/teams";
import type { DB, User } from "../../domain";
import { hashPassword, verifyPassword } from "../password";
import { audit, UserError } from "../util";

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const USERNAME_COOLDOWN_DAYS = 30;
export const AVATAR_COLORS = ["#22E58A", "#5B8CFF", "#FF6B5B", "#F5C542", "#B57BFF", "#3DD6D0", "#FF9F43", "#FF5FA2"];
/** Handles that collide with routes or look official. */
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "system", "support", "help", "staff", "moderator", "mod", "official", "security", "team",
  "settings", "api", "login", "logout", "signup", "register", "onboarding", "feed", "create", "search", "leaderboards", "leagues",
  "battles", "notifications", "admin", "about", "terms", "privacy", "null", "undefined", "me", "you", "gamereceipts", "game_receipts",
  "receipts", "deleted", "anonymous",
]);

/** Normalizes and validates a handle; throws UserError. Shared by signup, onboarding and username changes. */
export function validateUsername(raw: unknown): string {
  const name = String(raw ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(name)) throw new UserError("Username: 3–20 letters, numbers or underscores");
  if (RESERVED_USERNAMES.has(name) || name.startsWith("deleted_") || name.startsWith("deleted-")) throw new UserError("That username isn’t available");
  return name;
}

const lower = (s: string) => s.toLowerCase();
/** Taken = someone's current handle, or a handle another account retired (so old links can't be hijacked). */
export function usernameTaken(d: DB, name: string, exceptUserId?: string): boolean {
  const n = lower(name);
  return d.users.some((u) => u.id !== exceptUserId && (lower(u.username) === n || (u.previousUsernames ?? []).some((p) => lower(p) === n)));
}

export function usernameCooldownEnds(u: Pick<User, "usernameChangedAt">): Date | null {
  if (!u.usernameChangedAt) return null;
  const end = new Date(new Date(u.usernameChangedAt).getTime() + USERNAME_COOLDOWN_DAYS * 86_400_000);
  return end.getTime() > Date.now() ? end : null;
}

export function changeUsername(d: DB, userId: string, raw: unknown, now = new Date()) {
  const u = getUser(d, userId);
  const name = validateUsername(raw);
  if (name === lower(u.username)) throw new UserError("That’s already your username");
  if (u.usernameChangedAt && new Date(u.usernameChangedAt).getTime() + USERNAME_COOLDOWN_DAYS * 86_400_000 > now.getTime()) {
    const left = Math.ceil((new Date(u.usernameChangedAt).getTime() + USERNAME_COOLDOWN_DAYS * 86_400_000 - now.getTime()) / 86_400_000);
    throw new UserError(`You can change your username once every ${USERNAME_COOLDOWN_DAYS} days — try again in ${left} day${left === 1 ? "" : "s"}`);
  }
  if (usernameTaken(d, name, userId)) throw new UserError("That username is taken");
  const old = u.username;
  u.previousUsernames = [...(u.previousUsernames ?? []).filter((p) => lower(p) !== name), old];
  u.username = name;
  u.usernameChangedAt = now.toISOString();
  audit(d, userId, "username_change", "user", userId, { from: old, to: name }, now.toISOString());
  return u;
}

export const userByCurrentName = (d: DB, username: string) => d.users.find((u) => !u.deletedAt && lower(u.username) === lower(username));
export const userByFormerName = (d: DB, username: string) => d.users.find((u) => !u.deletedAt && (u.previousUsernames ?? []).some((p) => lower(p) === lower(username)));

function getUser(d: DB, id: string): User {
  const u = d.users.find((x) => x.id === id && !x.deletedAt);
  if (!u) throw new UserError("Account not found");
  return u;
}

function checkPassword(u: User, password: string) {
  if (!u.passwordHash || !verifyPassword(password, u.passwordHash)) throw new UserError("Your current password is incorrect");
}

export function changeEmail(d: DB, userId: string, rawEmail: string, password: string) {
  const u = getUser(d, userId);
  checkPassword(u, password);
  const email = rawEmail.trim().toLowerCase();
  if (email === u.email) throw new UserError("That’s already your email");
  if (d.users.some((x) => x.id !== userId && x.email === email)) throw new UserError("An account with that email already exists");
  u.email = email;
  audit(d, userId, "email_change", "user", userId);
}

export function changePassword(d: DB, userId: string, current: string, next: string, confirm: string) {
  const u = getUser(d, userId);
  checkPassword(u, current);
  if (next.length < 8) throw new UserError("New password must be at least 8 characters");
  if (next !== confirm) throw new UserError("New passwords don’t match");
  if (next === current) throw new UserError("Choose a password you haven’t used here");
  u.passwordHash = hashPassword(next);
  audit(d, userId, "password_change", "user", userId);
}

export interface ProfileDetailsInput { displayName: string; bio: string; location: string; website: string; avatarColor: string; leagues: string[]; teams: string[] }

/** Accepts http(s) only, normalizes via URL, strips credentials. Empty string clears it. */
export function normalizeWebsite(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  let url: URL;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`); } catch { throw new UserError("Enter a valid link, like https://example.com"); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new UserError("Links must start with http:// or https://");
  if (!url.hostname.includes(".")) throw new UserError("Enter a valid link, like https://example.com");
  url.username = ""; url.password = "";
  const out = url.toString();
  if (out.length > 200) throw new UserError("That link is too long (max 200 characters)");
  return out;
}

export function updateProfileDetails(d: DB, userId: string, input: ProfileDetailsInput) {
  const u = getUser(d, userId);
  if (!AVATAR_COLORS.includes(input.avatarColor)) throw new UserError("Pick one of the colour swatches");
  const leagues = input.leagues.filter((l): l is League => (LEAGUES as string[]).includes(l));
  const favoriteLeagues = leagues.length ? leagues : u.favoriteLeagues;
  const teams = [...new Set(input.teams)].filter((t) => TEAMS.some((x) => x.id === t && favoriteLeagues.includes(x.league)));
  if (teams.length > 5) throw new UserError("Pick up to 5 favorite teams");
  Object.assign(u, {
    displayName: input.displayName, bio: input.bio, location: input.location || undefined, website: normalizeWebsite(input.website) || undefined,
    avatarColor: input.avatarColor, favoriteLeagues, favoriteTeams: teams,
  });
}

/** Clears the avatar; returns the file to delete from disk after the DB write commits. */
export function setAvatar(d: DB, userId: string, url: string | undefined): string | undefined {
  const u = getUser(d, userId);
  const old = u.avatarUrl;
  u.avatarUrl = url;
  if (!url) delete u.avatarUrl;
  return old;
}

/**
 * Locked predictions are permanent public records, so deletion anonymizes instead of removing rows:
 * the account stops being usable and identifiable, its social graph goes away, its predictions stay under "Deleted user".
 */
export function anonymizeUser(d: DB, userId: string, now = new Date()): { avatarUrl?: string } {
  const u = d.users.find((x) => x.id === userId);
  if (!u) throw new UserError("Account not found");
  const prevAvatar = u.avatarUrl;
  const short = userId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  Object.assign(u, {
    username: `deleted-${short}`, displayName: "Deleted user", email: "", passwordHash: "", bio: "", private: false,
    favoriteLeagues: [], favoriteTeams: [], role: "user", plan: "free", isCreator: false, deletedAt: now.toISOString(),
  });
  for (const k of ["avatarUrl", "location", "website", "usernameChangedAt", "previousUsernames"] as const) delete u[k];
  d.follows = d.follows.filter((f) => f.followerId !== userId && f.followeeId !== userId);
  d.blocks = d.blocks.filter((b) => b.blockerId !== userId && b.blockedId !== userId);
  d.likes = d.likes.filter((l) => l.userId !== userId);
  d.votes = d.votes.filter((v) => v.userId !== userId);
  d.notifications = d.notifications.filter((n) => n.userId !== userId && n.actorId !== userId);
  d.groupMembers = d.groupMembers.filter((m) => m.userId !== userId);
  d.waitlist = d.waitlist.filter((w) => w.userId !== userId);
  audit(d, userId, "account_delete", "user", userId, undefined, now.toISOString());
  return { avatarUrl: prevAvatar };
}

export function deleteAccount(d: DB, userId: string, typedUsername: string, password: string, now = new Date()) {
  const u = getUser(d, userId);
  if (typedUsername.trim().toLowerCase().replace(/^@/, "") !== lower(u.username)) throw new UserError("Type your username exactly to confirm");
  checkPassword(u, password);
  return anonymizeUser(d, userId, now);
}

/** Everything we hold about a user, for the "download my data" export. Never includes the password hash. */
export function exportUserData(d: DB, userId: string, now = new Date()) {
  const u = getUser(d, userId);
  const { passwordHash: _ph, ...profile } = u; void _ph;
  const name = (id: string) => d.users.find((x) => x.id === id)?.username ?? null;
  return {
    exportedAt: now.toISOString(),
    profile,
    predictions: d.predictions.filter((p) => p.userId === userId),
    comments: d.comments.filter((c) => c.userId === userId),
    following: d.follows.filter((f) => f.followerId === userId).map((f) => ({ username: name(f.followeeId), since: f.createdAt })),
    followers: d.follows.filter((f) => f.followeeId === userId).map((f) => ({ username: name(f.followerId), since: f.createdAt })),
    blocked: d.blocks.filter((b) => b.blockerId === userId).map((b) => ({ username: name(b.blockedId), since: b.createdAt })),
    likes: d.likes.filter((l) => l.userId === userId),
    battles: d.battles.filter((b) => b.challengerId === userId || b.opponentId === userId),
  };
}
