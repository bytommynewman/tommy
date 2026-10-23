import type { DB } from "../../domain";
import type { Forecast } from "../../scoring";
import { audit, newId, UserError } from "../util";
import { notify } from "./notify";
import { activeOnQuestion, lockPrediction } from "./predictions";
import { getQuestion } from "./questions";

/** Two forecasts clash if they back different sides/picks. */
export function opposing(a: Forecast, b: Forecast) {
  if (a.type === "binary" && b.type === "binary") return (a.pYes >= 0.5) !== (b.pYes >= 0.5);
  if (a.type === "categorical" && b.type === "categorical") return a.primary.optionId !== b.primary.optionId;
  return false;
}

/**
 * Challenge another user's live take. The challenger locks (or reuses) their own
 * opposing take on the same question, so both sides share identical resolution criteria.
 */
export function createBattle(d: DB, challengerId: string, targetPredictionId: string, forecast: Forecast | null, message: string, now = new Date()) {
  const target = d.predictions.find((p) => p.id === targetPredictionId);
  if (!target || target.kind !== "graded" || target.status !== "pending" || target.supersededAt || target.withdrawnAt) throw new UserError("That take can't be challenged");
  if (target.userId === challengerId) throw new UserError("You can't battle yourself");
  const q = getQuestion(d, target.questionId!)!;
  const existing = d.battles.find((b) => b.questionId === q.id && b.status !== "declined" &&
    [b.challengerId, b.opponentId].includes(challengerId) && [b.challengerId, b.opponentId].includes(target.userId));
  if (existing) throw new UserError("You two already have a battle on this");
  let mine = activeOnQuestion(d, challengerId, q.id);
  if (!mine) {
    if (!forecast) throw new UserError("Lock your side first");
    mine = lockPrediction(d, challengerId, { originalText: message || `Challenging @${d.users.find((u) => u.id === target.userId)?.username}`, questionId: q.id, forecast }, now);
  }
  if (!opposing(mine.forecast!, target.forecast!)) throw new UserError("Your take has to oppose theirs to start a battle");
  const b = {
    id: newId(), questionId: q.id, challengerId, opponentId: target.userId, challengerPredictionId: mine.id,
    opponentPredictionId: target.id, message: message.trim().slice(0, 200), status: "open" as const, winnerId: null,
    createdAt: now.toISOString(), resolvedAt: null,
  };
  d.battles.push(b);
  const cname = d.users.find((u) => u.id === challengerId)?.username;
  notify(d, target.userId, "battle", `@${cname} challenged your take on "${q.title}"`, `/battles/${b.id}`, challengerId, now.toISOString());
  audit(d, challengerId, "battle_create", "battle", b.id, undefined, now.toISOString());
  return b;
}

export function respondBattle(d: DB, userId: string, battleId: string, accept: boolean) {
  const b = d.battles.find((x) => x.id === battleId);
  if (!b || b.opponentId !== userId) throw new UserError("Battle not found");
  if (b.status !== "open") throw new UserError("This battle was already answered");
  b.status = accept ? "accepted" : "declined";
  const oname = d.users.find((u) => u.id === userId)?.username;
  notify(d, b.challengerId, "battle", accept ? `@${oname} accepted your battle. It's on.` : `@${oname} declined your battle.`, `/battles/${b.id}`, userId);
  return b;
}
