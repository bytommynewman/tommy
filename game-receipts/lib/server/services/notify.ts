import type { DB, NotificationKind } from "../../domain";
import { newId } from "../util";

export function isBlocked(d: DB, a: string, b: string) {
  return d.blocks.some((x) => (x.blockerId === a && x.blockedId === b) || (x.blockerId === b && x.blockedId === a));
}

export function notify(d: DB, userId: string, kind: NotificationKind, text: string, href: string, actorId?: string, at = new Date().toISOString()) {
  if (actorId && (actorId === userId || isBlocked(d, userId, actorId))) return;
  d.notifications.push({ id: newId(), userId, kind, text, href, createdAt: at, read: false, actorId });
}
