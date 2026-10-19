import type { DB, Prediction, Report } from "../../domain";
import { audit, newId, UserError } from "../util";
import { isBlocked, notify } from "./notify";

const userName = (d: DB, id: string) => d.users.find((u) => u.id === id)?.username ?? "someone";

export function follow(d: DB, followerId: string, followeeId: string) {
  if (followerId === followeeId) throw new UserError("You can't follow yourself");
  if (isBlocked(d, followerId, followeeId)) throw new UserError("Unavailable");
  if (d.follows.some((f) => f.followerId === followerId && f.followeeId === followeeId)) return;
  d.follows.push({ followerId, followeeId, createdAt: new Date().toISOString() });
  notify(d, followeeId, "follow", `@${userName(d, followerId)} followed you`, `/u/${userName(d, followerId)}`, followerId);
}

export function unfollow(d: DB, followerId: string, followeeId: string) {
  d.follows = d.follows.filter((f) => !(f.followerId === followerId && f.followeeId === followeeId));
}

export function block(d: DB, blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new UserError("You can't block yourself");
  if (!d.blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId)) d.blocks.push({ blockerId, blockedId, createdAt: new Date().toISOString() });
  d.follows = d.follows.filter((f) => !((f.followerId === blockerId && f.followeeId === blockedId) || (f.followerId === blockedId && f.followeeId === blockerId)));
}

export function unblock(d: DB, blockerId: string, blockedId: string) {
  d.blocks = d.blocks.filter((b) => !(b.blockerId === blockerId && b.blockedId === blockedId));
}

function visiblePrediction(d: DB, userId: string, predictionId: string) {
  const p = d.predictions.find((x) => x.id === predictionId);
  if (!p || p.hidden || isBlocked(d, userId, p.userId)) throw new UserError("Prediction not found");
  return p;
}

export function toggleLike(d: DB, userId: string, predictionId: string) {
  const p = visiblePrediction(d, userId, predictionId);
  const i = d.likes.findIndex((l) => l.userId === userId && l.predictionId === predictionId);
  if (i >= 0) { d.likes.splice(i, 1); return false; }
  d.likes.push({ userId, predictionId, createdAt: new Date().toISOString() });
  notify(d, p.userId, "like", `@${userName(d, userId)} liked your take`, `/p/${p.id}`, userId);
  return true;
}

export function addComment(d: DB, userId: string, predictionId: string, body: string) {
  const p = visiblePrediction(d, userId, predictionId);
  const text = body.trim();
  if (!text) throw new UserError("Comment is empty");
  if (text.length > 500) throw new UserError("Keep it under 500 characters");
  const recent = d.comments.filter((c) => c.userId === userId && Date.now() - new Date(c.createdAt).getTime() < 60_000).length;
  if (recent >= 5) throw new UserError("Slow down — too many comments in a minute");
  const c = { id: newId(), userId, predictionId, body: text, createdAt: new Date().toISOString(), hidden: false };
  d.comments.push(c);
  notify(d, p.userId, "comment", `@${userName(d, userId)}: "${text.slice(0, 60)}"`, `/p/${p.id}`, userId);
  return c;
}

export function voteDebate(d: DB, userId: string, predictionId: string, agree: boolean) {
  const p = visiblePrediction(d, userId, predictionId);
  if (p.kind !== "debate") throw new UserError("Only hot takes take votes");
  d.votes = d.votes.filter((v) => !(v.userId === userId && v.predictionId === predictionId));
  d.votes.push({ userId, predictionId, agree, createdAt: new Date().toISOString() });
}

export function report(d: DB, reporterId: string, targetType: Report["targetType"], targetId: string, reason: string) {
  if (!reason.trim()) throw new UserError("Tell us what's wrong");
  if (d.reports.some((r) => r.reporterId === reporterId && r.targetId === targetId && r.status === "open")) return;
  d.reports.push({ id: newId(), reporterId, targetType, targetId, reason: reason.trim().slice(0, 300), status: "open", createdAt: new Date().toISOString() });
}

export function moderateReport(d: DB, adminId: string, reportId: string, action: "hide" | "dismiss") {
  const r = d.reports.find((x) => x.id === reportId);
  if (!r) throw new UserError("Report not found");
  if (action === "hide") {
    if (r.targetType === "prediction") { const p = d.predictions.find((x) => x.id === r.targetId); if (p) p.hidden = true; }
    if (r.targetType === "comment") { const c = d.comments.find((x) => x.id === r.targetId); if (c) c.hidden = true; }
  }
  r.status = action === "hide" ? "actioned" : "dismissed";
  r.resolvedBy = adminId;
  audit(d, adminId, `report_${action}`, r.targetType, r.targetId, { reportId });
}

// ---------- Feed ----------
export type FeedTab = "following" | "trending" | "resolved" | "friends" | "NFL" | "NBA";
export const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: "following", label: "Following" }, { id: "trending", label: "Trending" }, { id: "resolved", label: "Resolved" },
  { id: "friends", label: "Friends" }, { id: "NFL", label: "NFL" }, { id: "NBA", label: "NBA" },
];

function feedVisible(d: DB, viewerId: string) {
  const following = new Set(d.follows.filter((f) => f.followerId === viewerId).map((f) => f.followeeId));
  const privateUsers = new Set(d.users.filter((u) => u.private).map((u) => u.id));
  return (p: Prediction) =>
    !p.hidden && !p.supersededAt && !(p.withdrawnInGrace) && !isBlocked(d, viewerId, p.userId) &&
    (!privateUsers.has(p.userId) || p.userId === viewerId || following.has(p.userId));
}

export function engagement(d: DB, id: string) {
  return {
    likes: d.likes.filter((l) => l.predictionId === id).length,
    comments: d.comments.filter((c) => c.predictionId === id && !c.hidden).length,
  };
}

export function feed(d: DB, viewerId: string, tab: FeedTab, now = new Date(), limit = 40): Prediction[] {
  const vis = feedVisible(d, viewerId);
  const following = new Set(d.follows.filter((f) => f.followerId === viewerId).map((f) => f.followeeId));
  const followers = new Set(d.follows.filter((f) => f.followeeId === viewerId).map((f) => f.followerId));
  let list = d.predictions.filter(vis);
  const byLock = (a: Prediction, b: Prediction) => b.lockedAt.localeCompare(a.lockedAt);
  switch (tab) {
    case "following": list = list.filter((p) => following.has(p.userId) || p.userId === viewerId).sort(byLock); break;
    case "friends": list = list.filter((p) => following.has(p.userId) && followers.has(p.userId)).sort(byLock); break;
    case "resolved": list = list.filter((p) => p.status === "resolved").sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? "")); break;
    case "NFL": case "NBA": list = list.filter((p) => p.league === tab).sort(byLock); break;
    case "trending": {
      // Engagement with a half-life of 7 days on the most recent activity (lock or resolution).
      const score = (p: Prediction) => {
        const e = engagement(d, p.id);
        const last = Math.max(new Date(p.lockedAt).getTime(), p.resolvedAt ? new Date(p.resolvedAt).getTime() : 0);
        const ageDays = Math.max(0, (now.getTime() - last) / 86_400_000);
        return (1 + e.likes + 2 * e.comments) * Math.pow(0.5, ageDays / 7);
      };
      list = list.map((p) => [p, score(p)] as const).sort((a, b) => b[1] - a[1]).map(([p]) => p);
      break;
    }
  }
  return list.slice(0, limit);
}

export function search(d: DB, viewerId: string, query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return { users: [], predictions: [], questions: [] };
  const vis = feedVisible(d, viewerId);
  return {
    users: d.users.filter((u) => !isBlocked(d, viewerId, u.id) && (u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q))).slice(0, 10),
    predictions: d.predictions.filter((p) => vis(p) && (p.structuredText.toLowerCase().includes(q) || p.originalText.toLowerCase().includes(q))).slice(0, 20),
    questions: d.questions.filter((x) => x.status !== "void" && x.reviewStatus !== "rejected" && x.title.toLowerCase().includes(q)).slice(0, 10),
  };
}

export function markAllRead(d: DB, userId: string) {
  for (const n of d.notifications) if (n.userId === userId) n.read = true;
}
