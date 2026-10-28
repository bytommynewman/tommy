import { randomBytes } from "node:crypto";
import type { DB, Group } from "../../domain";
import { summarise } from "../../scoring";
import { newId, UserError } from "../util";
import { userChains } from "./reputation";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export function createGroup(d: DB, ownerId: string, input: { name: string; description: string; visibility: Group["visibility"]; questionIds: string[] }) {
  const name = input.name.trim();
  if (name.length < 3 || name.length > 60) throw new UserError("League name must be 3–60 characters");
  const owner = d.users.find((u) => u.id === ownerId)!;
  let slug = slugify(name) || "league";
  if (d.groups.some((g) => g.slug === slug)) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  const g: Group = {
    id: newId(), name, slug, description: input.description.trim().slice(0, 280), ownerId,
    inviteCode: randomBytes(4).toString("hex").toUpperCase(), visibility: input.visibility,
    // Branded creator leagues are a paid plan feature (Phase 6); the flag exists in the model now.
    isCreatorLeague: owner.isCreator,
    questionIds: input.questionIds.filter((id) => d.questions.some((q) => q.id === id)),
    createdAt: new Date().toISOString(),
  };
  d.groups.push(g);
  d.groupMembers.push({ groupId: g.id, userId: ownerId, role: "owner", joinedAt: g.createdAt });
  return g;
}

export function joinGroup(d: DB, userId: string, inviteCode: string) {
  const g = d.groups.find((x) => x.inviteCode === inviteCode.trim().toUpperCase());
  if (!g) throw new UserError("Invite code not found");
  if (!d.groupMembers.some((m) => m.groupId === g.id && m.userId === userId)) {
    d.groupMembers.push({ groupId: g.id, userId, role: "member", joinedAt: new Date().toISOString() });
  }
  return g;
}

export function leaveGroup(d: DB, userId: string, groupId: string) {
  const g = d.groups.find((x) => x.id === groupId);
  if (g?.ownerId === userId) throw new UserError("Owners can't leave their own league");
  d.groupMembers = d.groupMembers.filter((m) => !(m.groupId === groupId && m.userId === userId));
}

/** League standings: grade over the league's questions (or all questions if none are pinned). */
export function groupStandings(d: DB, groupId: string) {
  const g = d.groups.find((x) => x.id === groupId)!;
  const qs = new Set(g.questionIds);
  return d.groupMembers
    .filter((m) => m.groupId === groupId)
    .map((m) => {
      const user = d.users.find((u) => u.id === m.userId)!;
      const chains = userChains(d, m.userId, qs.size ? (p) => qs.has(p.questionId!) : undefined);
      const pending = d.predictions.filter((p) => p.userId === m.userId && p.status === "pending" && !p.supersededAt && (!qs.size || qs.has(p.questionId ?? ""))).length;
      return { user, role: m.role, pending, ...summarise(chains, 1) };
    })
    .sort((a, b) => b.grade - a.grade);
}
