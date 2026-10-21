import { describe, expect, it } from "vitest";
import type { DB, User } from "../../domain";
import { AVATAR_FILE } from "../avatars";
import { hashPassword, verifyPassword } from "../password";
import { buildSeed } from "../seed";
import { UserError } from "../util";
import { addComment, toggleLike, follow, block } from "./social";
import * as acc from "./accounts";

const PW = "correct-horse-1";
function setup() {
  const d: DB = buildSeed();
  const mk = (id: string, username: string): User => ({
    id, email: `${username}@x.test`, username, displayName: username, passwordHash: hashPassword(PW), bio: "hi", avatarColor: "#22E58A",
    favoriteLeagues: ["NBA"], favoriteTeams: [], role: "user", plan: "free", onboarded: true, isCreator: false, createdAt: "2026-01-01T00:00:00Z", private: false,
    avatarUrl: `/api/avatar/${id}-abcdef012345.webp`, location: "Ithaca", website: "https://example.com/",
  });
  const a = mk("u-a", "alice"), b = mk("u-b", "bobby");
  d.users.push(a, b);
  return { d, a, b };
}
const T = new Date("2026-10-20T00:00:00Z");

describe("username validation", () => {
  it("normalizes case and enforces 3-20 [a-z0-9_]", () => {
    expect(acc.validateUsername("  Cool_Name1 ")).toBe("cool_name1");
    for (const bad of ["ab", "a".repeat(21), "has space", "dash-ed", "émile", ""]) expect(() => acc.validateUsername(bad)).toThrow(UserError);
  });
  it("blocks reserved words in any case", () => {
    for (const r of ["admin", "Settings", "API", "login", "deleted_abc"]) expect(() => acc.validateUsername(r)).toThrow(/isn’t available/);
  });
  it("existing demo handles (other than the admin account) are valid", () => {
    for (const u of buildSeed().users.filter((x) => x.username !== "admin")) expect(() => acc.validateUsername(u.username)).not.toThrow();
  });
});

describe("changeUsername", () => {
  it("changes, records the old handle and the change time", () => {
    const { d, a } = setup();
    acc.changeUsername(d, a.id, "Alice_New", T);
    expect(a.username).toBe("alice_new");
    expect(a.previousUsernames).toEqual(["alice"]);
    expect(a.usernameChangedAt).toBe(T.toISOString());
    expect(acc.userByFormerName(d, "ALICE")?.id).toBe(a.id);
  });
  it("is case-insensitively unique, including retired handles of others", () => {
    const { d, a, b } = setup();
    expect(() => acc.changeUsername(d, a.id, "BOBBY", T)).toThrow(/taken/);
    acc.changeUsername(d, b.id, "bobby_2", T);
    expect(() => acc.changeUsername(d, a.id, "bobby", T)).toThrow(/taken/);
  });
  it("allows once per 30 days", () => {
    const { d, a } = setup();
    acc.changeUsername(d, a.id, "alice_two", T);
    expect(() => acc.changeUsername(d, a.id, "alice_three", new Date(T.getTime() + 29 * 86_400_000))).toThrow(/once every 30 days/);
    acc.changeUsername(d, a.id, "alice_three", new Date(T.getTime() + 30 * 86_400_000));
    expect(a.previousUsernames).toEqual(["alice", "alice_two"]);
  });
  it("lets you go back to a handle you retired, and rejects no-op / reserved", () => {
    const { d, a } = setup();
    expect(() => acc.changeUsername(d, a.id, "ALICE", T)).toThrow(/already/);
    expect(() => acc.changeUsername(d, a.id, "admin", T)).toThrow(UserError);
    acc.changeUsername(d, a.id, "alice_two", T);
    acc.changeUsername(d, a.id, "alice", new Date(T.getTime() + 31 * 86_400_000));
    expect(a.previousUsernames).toEqual(["alice_two"]);
  });
});

describe("email and password", () => {
  it("email change needs the password and a unique address", () => {
    const { d, a } = setup();
    expect(() => acc.changeEmail(d, a.id, "new@x.test", "wrong")).toThrow(/incorrect/);
    expect(() => acc.changeEmail(d, a.id, "BOBBY@x.test".toLowerCase(), PW)).toThrow(/already exists/);
    acc.changeEmail(d, a.id, "new@x.test", PW);
    expect(a.email).toBe("new@x.test");
  });
  it("password change checks current, length and confirmation", () => {
    const { d, a } = setup();
    expect(() => acc.changePassword(d, a.id, "nope", "newpassword1", "newpassword1")).toThrow(/incorrect/);
    expect(() => acc.changePassword(d, a.id, PW, "short", "short")).toThrow(/8 characters/);
    expect(() => acc.changePassword(d, a.id, PW, "newpassword1", "different1")).toThrow(/match/);
    acc.changePassword(d, a.id, PW, "newpassword1", "newpassword1");
    expect(verifyPassword("newpassword1", a.passwordHash)).toBe(true);
    expect(verifyPassword(PW, a.passwordHash)).toBe(false);
  });
});

describe("profile details", () => {
  const base = { displayName: "A", bio: "", location: "", website: "", avatarColor: acc.AVATAR_COLORS[1], leagues: ["NBA", "NFL"], teams: [] as string[] };
  it("accepts only http(s) links and normalizes them", () => {
    expect(acc.normalizeWebsite("example.com/me")).toBe("https://example.com/me");
    expect(acc.normalizeWebsite("")).toBe("");
    expect(acc.normalizeWebsite("https://user:pw@example.com/x")).toBe("https://example.com/x");
    for (const bad of ["javascript:alert(1)", "ftp://example.com", "data:text/html,x", "https://nodot"]) expect(() => acc.normalizeWebsite(bad)).toThrow(UserError);
  });
  it("limits teams to 5 and to favorite leagues, rejects unknown colors", () => {
    const { d, a } = setup();
    const nba = d.users.length && ["nba-lal", "nba-bos", "nba-nyk", "nba-gsw", "nba-mia", "nba-chi"];
    expect(() => acc.updateProfileDetails(d, a.id, { ...base, teams: nba as string[] })).toThrow(/up to 5/);
    acc.updateProfileDetails(d, a.id, { ...base, teams: ["nba-lal", "nfl-buf", "mlb-nyy", "nope"], leagues: ["NBA", "NFL"] });
    expect(a.favoriteTeams).toEqual(["nba-lal", "nfl-buf"]);
    expect(() => acc.updateProfileDetails(d, a.id, { ...base, avatarColor: "#123456" })).toThrow(/swatch/);
  });
});

describe("delete account (anonymize)", () => {
  function populated() {
    const s = setup();
    const { d, a, b } = s;
    const pred = d.predictions.find((p) => p.userId !== a.id && p.userId !== b.id)!;
    follow(d, a.id, b.id); follow(d, b.id, a.id); block(d, a.id, "seed-darkhorse_dana");
    toggleLike(d, a.id, pred.id); addComment(d, a.id, pred.id, "my comment");
    const own = structuredClone(pred); own.id = "mine-1"; own.userId = a.id; d.predictions.push(own);
    d.notifications.push({ id: "n1", userId: b.id, kind: "follow", text: "x", href: "/", createdAt: T.toISOString(), read: false, actorId: a.id });
    return { ...s, own };
  }
  it("requires the typed username and password", () => {
    const { d, a } = populated();
    expect(() => acc.deleteAccount(d, a.id, "wrong", PW, T)).toThrow(/Type your username/);
    expect(() => acc.deleteAccount(d, a.id, "alice", "bad", T)).toThrow(/incorrect/);
    expect(a.deletedAt).toBeUndefined();
  });
  it("anonymizes the user, keeps predictions, clears the social graph, returns the avatar to delete", () => {
    const { d, a, own } = populated();
    const r = acc.deleteAccount(d, a.id, "@Alice", PW, T);
    expect(AVATAR_FILE.test(r.avatarUrl!.replace("/api/avatar/", ""))).toBe(true);
    expect(a).toMatchObject({ displayName: "Deleted user", email: "", passwordHash: "", bio: "", deletedAt: T.toISOString() });
    expect(a.username).toMatch(/^deleted-[a-z0-9]+$/);
    for (const k of ["avatarUrl", "location", "website", "previousUsernames"] as const) expect(a[k]).toBeUndefined();
    expect(d.predictions.find((p) => p.id === own.id)?.userId).toBe(a.id);
    expect(d.follows.some((f) => f.followerId === a.id || f.followeeId === a.id)).toBe(false);
    expect(d.blocks.some((x) => x.blockerId === a.id)).toBe(false);
    expect(d.likes.some((l) => l.userId === a.id)).toBe(false);
    expect(d.notifications.some((n) => n.actorId === a.id)).toBe(false);
    expect(d.comments.some((c) => c.userId === a.id)).toBe(true);
    // the deleted account can't be used: no login by email, no further account actions
    expect(d.users.some((u) => u.email === "alice@x.test")).toBe(false);
    expect(() => acc.changeEmail(d, a.id, "z@x.test", PW)).toThrow(UserError);
  });
  it("export never leaks the password hash", () => {
    const { d, a } = populated();
    const out = acc.exportUserData(d, a.id, T);
    expect(JSON.stringify(out)).not.toContain("scrypt$");
    expect(out.predictions.every((p) => p.userId === a.id)).toBe(true);
    expect(out.comments.length).toBe(1);
  });
});

describe("avatar file names", () => {
  it("accepts generated names and rejects traversal", () => {
    expect(AVATAR_FILE.test("u-a-abcdef012345.webp")).toBe(true);
    for (const bad of ["../db.json", "..%2Fx-abcdef012345.webp", "a/b-abcdef012345.webp", "x-abcdef012345.png", ".webp", "a.b-abcdef012345.webp"]) expect(AVATAR_FILE.test(bad)).toBe(false);
  });
});
