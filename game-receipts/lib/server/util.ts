import { randomUUID } from "node:crypto";

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();

/** Errors whose message is safe to show the user. */
export class UserError extends Error {}

export function audit(d: import("../domain").DB, actorId: string, action: string, entity: string, entityId: string, data?: unknown, at = nowIso()) {
  d.audit.push({ id: newId(), at, actorId, action, entity, entityId, data });
}
