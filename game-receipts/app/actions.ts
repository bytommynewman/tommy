"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z, ZodError } from "zod";
import { structureTake } from "@/lib/ai";
import { LEAGUES, TEAMS } from "@/lib/catalog/teams";
import type { Evidence, User } from "@/lib/domain";
import type { Forecast, Outcome } from "@/lib/scoring";
import { endSession, requireAdmin, requireUser, startSession } from "@/lib/server/auth";
import { avatarFileFromUrl, avatarUrlFor, processAvatar, removeAvatarFile, saveAvatar } from "@/lib/server/avatars";
import { db, mutate } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import * as accounts from "@/lib/server/services/accounts";
import { createBattle, respondBattle } from "@/lib/server/services/battles";
import { resolveQuestion, voidQuestion } from "@/lib/server/services/grading";
import { createGroup, joinGroup, leaveGroup } from "@/lib/server/services/groups";
import { notify } from "@/lib/server/services/notify";
import { lockPrediction, revisePrediction, withdrawPrediction, type LockInput } from "@/lib/server/services/predictions";
import { DraftQuestionSchema, openQuestions } from "@/lib/server/services/questions";
import * as social from "@/lib/server/services/social";
import { audit, newId, UserError } from "@/lib/server/util";

export type ActionState = { error?: string; ok?: boolean; message?: string } | undefined;

function fail(e: unknown): ActionState {
  if (e instanceof UserError) return { error: e.message };
  if (e instanceof ZodError) return { error: e.issues[0]?.message ?? "Invalid input" };
  throw e;
}

const USERNAME = { parse: (v: unknown) => accounts.validateUsername(v) };
const PASSWORD = z.string().min(8, "Password must be at least 8 characters").max(200);
const EMAIL = z.string().trim().toLowerCase().email("Enter a valid email");
const ForecastSchema: z.ZodType<Forecast> = z.union([
  z.object({ type: z.literal("binary"), pYes: z.number() }),
  z.object({
    type: z.literal("categorical"),
    primary: z.object({ optionId: z.string(), p: z.number() }),
    darkHorse: z.object({ optionId: z.string(), p: z.number() }).optional(),
  }),
]);

// ---------------- Auth ----------------
export async function signup(_: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const email = EMAIL.parse(fd.get("email"));
    const username = USERNAME.parse(fd.get("username"));
    const password = PASSWORD.parse(fd.get("password"));
    id = mutate((d) => {
      if (d.users.some((u) => u.email === email)) throw new UserError("An account with that email already exists");
      if (accounts.usernameTaken(d, username)) throw new UserError("That username is taken");
      const palette = accounts.AVATAR_COLORS;
      const user: User = {
        id: newId(), email, username, displayName: username, passwordHash: hashPassword(password), bio: "",
        avatarColor: palette[Math.floor(Math.random() * palette.length)], favoriteLeagues: [], favoriteTeams: [],
        role: "user", plan: "free", onboarded: false, isCreator: false, createdAt: new Date().toISOString(), private: false,
      };
      d.users.push(user);
      audit(d, user.id, "signup", "user", user.id);
      return user.id;
    });
  } catch (e) { return fail(e); }
  await startSession(id);
  redirect("/onboarding");
}

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = email ? db().users.find((u) => u.email === email && !u.deletedAt) : undefined;
  if (!user || !verifyPassword(password, user.passwordHash)) return { error: "Email or password is incorrect" };
  await startSession(user.id);
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? (next as "/feed") : "/feed");
}

export async function logout() {
  await endSession();
  redirect("/");
}

export async function completeOnboarding(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser({ allowUnonboarded: true });
  try {
    const username = USERNAME.parse(fd.get("username"));
    const displayName = z.string().trim().min(1, "Add a display name").max(40).parse(fd.get("displayName"));
    const bio = z.string().trim().max(160).parse(fd.get("bio") ?? "");
    const leagues = fd.getAll("leagues").map(String).filter((l) => (LEAGUES as string[]).includes(l));
    if (!leagues.length) throw new UserError("Pick at least one league");
    const teams = fd.getAll("teams").map(String).filter((t) => TEAMS.some((x) => x.id === t)).slice(0, 12);
    mutate((d) => {
      if (accounts.usernameTaken(d, username, me.id)) throw new UserError("That username is taken");
      const u = d.users.find((x) => x.id === me.id)!;
      Object.assign(u, { username, displayName, bio, favoriteLeagues: leagues, favoriteTeams: teams, onboarded: true });
    });
  } catch (e) { return fail(e); }
  redirect("/create?first=1");
}

// ---------------- Predictions ----------------
export async function structure(text: string) {
  await requireUser();
  const t = text.trim().slice(0, 500);
  if (t.length < 4) return { error: "Give us a little more to work with", suggestions: [], provider: "" };
  const d = db();
  const qs = openQuestions(d).map((q) => ({ id: q.id, league: q.league, category: q.category, kind: q.kind, title: q.title, options: q.options?.map((o) => ({ id: o.id, label: o.label })) }));
  const { provider, suggestions } = await structureTake(t, { now: new Date(), openQuestions: qs });
  return { provider, suggestions };
}

const LockSchema = z.object({
  originalText: z.string().min(1).max(500),
  questionId: z.string().optional(),
  draft: DraftQuestionSchema.optional(),
  forecast: ForecastSchema.optional(),
  debate: z.object({ league: z.enum(LEAGUES as [string, ...string[]]).nullable() }).optional(),
  subject: z.object({ type: z.enum(["player", "team"]), id: z.string().max(120) }).nullable().optional(),
});

export async function lock(input: unknown, dest?: "feed"): Promise<ActionState> {
  const me = await requireUser();
  let id: string;
  try {
    const parsed = LockSchema.parse(input) as LockInput;
    id = mutate((d) => lockPrediction(d, me.id, parsed)).id;
  } catch (e) { return fail(e); }
  revalidatePath("/feed");
  redirect(dest === "feed" ? `/feed?placed=${id}` : `/p/${id}?locked=1`);
}

export async function revise(predictionId: string, forecast: unknown, note: string): Promise<ActionState> {
  const me = await requireUser();
  let id: string;
  try {
    const f = ForecastSchema.parse(forecast);
    id = mutate((d) => revisePrediction(d, me.id, predictionId, f, note)).id;
  } catch (e) { return fail(e); }
  redirect(`/p/${id}?locked=1`);
}

export async function withdraw(predictionId: string): Promise<ActionState> {
  const me = await requireUser();
  try { mutate((d) => withdrawPrediction(d, me.id, predictionId)); } catch (e) { return fail(e); }
  revalidatePath(`/p/${predictionId}`);
  return { ok: true };
}

export async function appeal(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  try {
    const predictionId = String(fd.get("predictionId"));
    const reason = z.string().trim().min(10, "Explain what's wrong (10+ characters)").max(600).parse(fd.get("reason"));
    mutate((d) => {
      const p = d.predictions.find((x) => x.id === predictionId);
      if (!p || p.userId !== me.id || p.status !== "resolved") throw new UserError("Only your resolved predictions can be appealed");
      if (d.appeals.some((a) => a.predictionId === predictionId && a.status === "open")) throw new UserError("You already have an open appeal on this");
      d.appeals.push({ id: newId(), predictionId, userId: me.id, reason, status: "open", createdAt: new Date().toISOString() });
      audit(d, me.id, "appeal", "prediction", predictionId);
    });
  } catch (e) { return fail(e); }
  revalidatePath(`/p/${fd.get("predictionId")}`);
  return { ok: true, message: "Appeal submitted. A reviewer will check the evidence." };
}

// ---------------- Social ----------------
export async function toggleLike(predictionId: string) {
  const me = await requireUser();
  try { mutate((d) => social.toggleLike(d, me.id, predictionId)); } catch (e) { return fail(e); }
  revalidatePath(`/p/${predictionId}`);
}

export async function addComment(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const pid = String(fd.get("predictionId"));
  try { mutate((d) => social.addComment(d, me.id, pid, String(fd.get("body") ?? ""))); } catch (e) { return fail(e); }
  revalidatePath(`/p/${pid}`);
  return { ok: true };
}

export async function vote(predictionId: string, agree: boolean) {
  const me = await requireUser();
  try { mutate((d) => social.voteDebate(d, me.id, predictionId, agree)); } catch (e) { return fail(e); }
  revalidatePath(`/p/${predictionId}`);
}

export async function setFollow(userId: string, on: boolean) {
  const me = await requireUser();
  try { mutate((d) => (on ? social.follow(d, me.id, userId) : social.unfollow(d, me.id, userId))); } catch (e) { return fail(e); }
  revalidatePath("/", "layout");
}

export async function setBlock(userId: string, on: boolean) {
  const me = await requireUser();
  try { mutate((d) => (on ? social.block(d, me.id, userId) : social.unblock(d, me.id, userId))); } catch (e) { return fail(e); }
  revalidatePath("/", "layout");
}

export async function report(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  try {
    const type = z.enum(["prediction", "comment", "user"]).parse(fd.get("targetType"));
    mutate((d) => social.report(d, me.id, type, String(fd.get("targetId")), String(fd.get("reason") ?? "")));
  } catch (e) { return fail(e); }
  return { ok: true, message: "Thanks — our moderators will take a look." };
}

export async function markNotificationsRead() {
  const me = await requireUser();
  mutate((d) => social.markAllRead(d, me.id));
  revalidatePath("/", "layout");
}

// ---------------- Battles & leagues ----------------
export async function challenge(targetId: string, forecast: unknown, message: string): Promise<ActionState> {
  const me = await requireUser();
  let id: string;
  try {
    const f = forecast ? ForecastSchema.parse(forecast) : null;
    id = mutate((d) => createBattle(d, me.id, targetId, f, message)).id;
  } catch (e) { return fail(e); }
  redirect(`/battles/${id}`);
}

export async function answerBattle(battleId: string, accept: boolean) {
  const me = await requireUser();
  try { mutate((d) => respondBattle(d, me.id, battleId, accept)); } catch (e) { return fail(e); }
  revalidatePath(`/battles/${battleId}`);
}

export async function newLeague(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  let slug: string;
  try {
    slug = mutate((d) => createGroup(d, me.id, {
      name: String(fd.get("name") ?? ""), description: String(fd.get("description") ?? ""),
      visibility: fd.get("visibility") === "public" ? "public" : "private", questionIds: fd.getAll("questionIds").map(String),
    })).slug;
  } catch (e) { return fail(e); }
  redirect(`/leagues/${slug}`);
}

export async function joinLeague(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  let slug: string;
  try { slug = mutate((d) => joinGroup(d, me.id, String(fd.get("code") ?? ""))).slug; } catch (e) { return fail(e); }
  redirect(`/leagues/${slug}`);
}

export async function exitLeague(groupId: string) {
  const me = await requireUser();
  try { mutate((d) => leaveGroup(d, me.id, groupId)); } catch (e) { return fail(e); }
  redirect("/leagues");
}

// ---------------- Settings ----------------
export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  try {
    const input = {
      displayName: z.string().trim().min(1, "Add a display name").max(40).parse(fd.get("displayName")),
      bio: z.string().trim().max(160, "Bio is 160 characters max").parse(fd.get("bio") ?? ""),
      location: z.string().trim().max(40, "Location is 40 characters max").parse(fd.get("location") ?? ""),
      website: z.string().trim().max(200, "That link is too long").parse(fd.get("website") ?? ""),
      avatarColor: String(fd.get("avatarColor") ?? me.avatarColor),
      leagues: fd.getAll("leagues").map(String),
      teams: fd.getAll("teams").map(String),
    };
    mutate((d) => accounts.updateProfileDetails(d, me.id, input));
  } catch (e) { return fail(e); }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved" };
}

export async function updatePrivacy(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const isPrivate = fd.get("private") === "on";
  mutate((d) => { d.users.find((u) => u.id === me.id)!.private = isPrivate; });
  revalidatePath("/", "layout");
  return { ok: true, message: isPrivate ? "Account is now private" : "Account is now public" };
}

export async function uploadAvatar(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  let file: string | null = null;
  try {
    const f = fd.get("avatar");
    if (!(f instanceof File) || f.size === 0) throw new UserError("Choose an image first");
    if (f.size > 8 * 1024 * 1024) throw new UserError("Image is too large (max 8 MB)");
    file = saveAvatar(me.id, await processAvatar(Buffer.from(await f.arrayBuffer())));
    const old = mutate((d) => accounts.setAvatar(d, me.id, avatarUrlFor(file!)));
    const oldFile = avatarFileFromUrl(old);
    if (oldFile && oldFile !== file) removeAvatarFile(oldFile);
  } catch (e) { return fail(e); }
  revalidatePath("/", "layout");
  return { ok: true, message: "Photo updated" };
}

export async function removeAvatar(): Promise<ActionState> {
  const me = await requireUser();
  const old = mutate((d) => accounts.setAvatar(d, me.id, undefined));
  removeAvatarFile(avatarFileFromUrl(old));
  revalidatePath("/", "layout");
  return { ok: true, message: "Photo removed" };
}

export async function changeUsername(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  try { mutate((d) => accounts.changeUsername(d, me.id, fd.get("username"))); } catch (e) { return fail(e); }
  revalidatePath("/", "layout");
  return { ok: true, message: "Username changed. Your old profile link will redirect." };
}

export async function changeEmail(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  try {
    const email = EMAIL.parse(fd.get("email"));
    mutate((d) => accounts.changeEmail(d, me.id, email, String(fd.get("password") ?? "")));
  } catch (e) { return fail(e); }
  revalidatePath("/settings");
  return { ok: true, message: "Email updated" };
}

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  try { mutate((d) => accounts.changePassword(d, me.id, String(fd.get("current") ?? ""), String(fd.get("next") ?? ""), String(fd.get("confirm") ?? ""))); } catch (e) { return fail(e); }
  return { ok: true, message: "Password updated" };
}

export async function deleteAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  try {
    const { avatarUrl } = mutate((d) => accounts.deleteAccount(d, me.id, String(fd.get("username") ?? ""), String(fd.get("password") ?? "")));
    removeAvatarFile(avatarFileFromUrl(avatarUrl));
  } catch (e) { return fail(e); }
  await endSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function joinWaitlist(plan: "pro" | "creator") {
  const me = await requireUser();
  mutate((d) => { if (!d.waitlist.some((w) => w.userId === me.id && w.plan === plan)) d.waitlist.push({ userId: me.id, plan, createdAt: new Date().toISOString() }); });
  revalidatePath("/settings");
}

// ---------------- Admin ----------------
export async function adminResolve(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const questionId = String(fd.get("questionId"));
    const q = db().questions.find((x) => x.id === questionId);
    if (!q) throw new UserError("Question not found");
    const raw = String(fd.get("outcome") ?? "");
    if (!raw) throw new UserError("Choose the outcome");
    const outcome: Outcome = q.kind === "binary" ? { type: "binary", yes: raw === "yes" } : { type: "categorical", optionId: raw };
    const evidence: Evidence[] = [{ source: String(fd.get("source") ?? "").trim(), url: String(fd.get("url") ?? "").trim(), note: String(fd.get("note") ?? "").trim() }];
    mutate((d) => resolveQuestion(d, admin.id, questionId, outcome, evidence));
  } catch (e) { return fail(e); }
  revalidatePath("/", "layout");
  return { ok: true, message: "Resolved and graded." };
}

export async function adminVoid(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const reason = z.string().trim().min(5, "Give a reason").parse(fd.get("reason"));
    mutate((d) => voidQuestion(d, admin.id, String(fd.get("questionId")), reason));
  } catch (e) { return fail(e); }
  revalidatePath("/", "layout");
  return { ok: true, message: "Voided." };
}

export async function adminReviewQuestion(questionId: string, approve: boolean) {
  const admin = await requireAdmin();
  mutate((d) => {
    const q = d.questions.find((x) => x.id === questionId);
    if (!q) return;
    if (approve) q.reviewStatus = "approved";
    else voidQuestion(d, admin.id, questionId, "Rejected in review: not objectively verifiable or not meaningful");
    audit(d, admin.id, approve ? "question_approve" : "question_reject", "question", questionId);
  });
  revalidatePath("/admin");
}

export async function adminDecideAppeal(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const status = z.enum(["upheld", "overturned"]).parse(fd.get("status"));
    const response = z.string().trim().min(5, "Write a response for the user").max(600).parse(fd.get("response"));
    mutate((d) => {
      const a = d.appeals.find((x) => x.id === fd.get("appealId"));
      if (!a || a.status !== "open") throw new UserError("Appeal not found");
      Object.assign(a, { status, response, resolvedAt: new Date().toISOString(), resolvedBy: admin.id });
      notify(d, a.userId, "appeal", status === "overturned" ? `Appeal accepted: ${response}` : `Appeal reviewed — outcome stands: ${response}`, `/p/${a.predictionId}`);
      audit(d, admin.id, `appeal_${status}`, "prediction", a.predictionId, { response });
    });
  } catch (e) { return fail(e); }
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminModerate(reportId: string, action: "hide" | "dismiss") {
  const admin = await requireAdmin();
  mutate((d) => social.moderateReport(d, admin.id, reportId, action));
  revalidatePath("/admin");
}
