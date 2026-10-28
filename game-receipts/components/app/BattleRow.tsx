import Link from "next/link";
import type { Battle, DB } from "@/lib/domain";
import { Avatar, Chip } from "../ui/primitives";

export function BattleRow({ d, b, meId }: { d: DB; b: Battle; meId: string }) {
  const q = d.questions.find((x) => x.id === b.questionId)!;
  const ch = d.users.find((u) => u.id === b.challengerId)!;
  const op = d.users.find((u) => u.id === b.opponentId)!;
  const mine = b.challengerId === meId || b.opponentId === meId;
  const tone = b.status === "resolved" ? (b.winnerId === meId ? "volt" : b.winnerId && mine ? "loss" : "default") : b.status === "open" ? "gold" : b.status === "declined" ? "muted" : "default";
  const label = b.status === "resolved" ? (!b.winnerId ? "Push" : mine ? (b.winnerId === meId ? "Won" : "Lost") : `@${d.users.find((u) => u.id === b.winnerId)?.username} won`) : b.status === "open" ? (b.opponentId === meId ? "Respond" : "Awaiting") : b.status === "accepted" ? "Live" : "Declined";
  return (
    <Link href={`/battles/${b.id}`} className="flex items-center gap-3 rounded-2xl bg-ink-850 p-3.5 ring-1 ring-ink-700 hover:ring-ink-500">
      <div className="flex -space-x-2"><Avatar name={ch.displayName} color={ch.avatarColor} src={ch.avatarUrl} size={32} /><Avatar name={op.displayName} color={op.avatarColor} src={op.avatarUrl} size={32} /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">@{ch.username} <span className="text-ink-500">vs</span> @{op.username}</div>
        <div className="truncate text-xs text-ink-400">{q.title}</div>
      </div>
      <Chip tone={tone}>{label}</Chip>
    </Link>
  );
}
