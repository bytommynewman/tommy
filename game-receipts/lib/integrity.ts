import { createHash } from "node:crypto";
import type { Prediction } from "./domain";

/**
 * Integrity layer for locked predictions. Each prediction's SHA-256 covers
 * every field fixed at lock time plus the hash of the same user's previous
 * prediction, forming a per-user hash chain: editing or deleting any past
 * receipt breaks every hash after it. This is tamper-evidence inside our own
 * database — it is not a blockchain and is never described as one.
 */
export const GENESIS_HASH = "0".repeat(64);

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export type LockedFields = Pick<
  Prediction,
  | "id" | "userId" | "kind" | "questionId" | "league" | "subject" | "category" | "originalText" | "structuredText" | "criteria"
  | "resolvesBy" | "forecast" | "baselineSnapshot" | "gradingVersion" | "lockedAt" | "chainId" | "revisionOf" | "revisionNumber" | "prevHash"
>;

export function lockedFields(p: LockedFields): LockedFields {
  const { id, userId, kind, questionId, league, subject, category, originalText, structuredText, criteria, resolvesBy, forecast,
    baselineSnapshot, gradingVersion, lockedAt, chainId, revisionOf, revisionNumber, prevHash } = p;
  // `subject` is optional: older receipts without it hash exactly as before (undefined keys are dropped).
  return { id, userId, kind, questionId, league, subject: subject ?? undefined, category, originalText, structuredText, criteria, resolvesBy, forecast,
    baselineSnapshot, gradingVersion, lockedAt, chainId, revisionOf, revisionNumber, prevHash };
}

export function hashPrediction(p: LockedFields): string {
  return createHash("sha256").update(canonicalJson(lockedFields(p))).digest("hex");
}

export function verifyPrediction(p: Prediction): boolean {
  return hashPrediction(p) === p.hash;
}

/** Verify a user's whole chain (predictions sorted by lock order). Returns the first broken id, or null. */
export function verifyChain(preds: Prediction[]): string | null {
  let prev = GENESIS_HASH;
  for (const p of preds) {
    if (p.prevHash !== prev || !verifyPrediction(p)) return p.id;
    prev = p.hash;
  }
  return null;
}
