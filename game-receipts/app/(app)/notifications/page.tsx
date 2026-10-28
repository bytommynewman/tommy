import Link from "next/link";
import { Bell, Heart, MessageCircle, Receipt, Scale, Swords, UserPlus, Gavel } from "lucide-react";
import { PageHeader } from "@/components/app/Shell";
import { EmptyState } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/format";
import type { NotificationKind } from "@/lib/domain";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { MarkRead } from "./MarkRead";
import { art } from "@/lib/server/art";

export const metadata = { title: "Notifications" };
const ICON: Record<NotificationKind, typeof Bell> = { follow: UserPlus, like: Heart, comment: MessageCircle, battle: Swords, resolved: Scale, receipt: Receipt, appeal: Gavel, development: Bell };

export default async function NotificationsPage() {
  const me = await requireUser();
  const items = db().notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  const unread = items.some((n) => !n.read);
  return (
    <div>
      <PageHeader title="Alerts" sub="Results, receipts, battles and people. No manufactured noise." action={unread ? <MarkRead /> : undefined} />
      {items.length ? (
        <ul className="space-y-2">
          {items.map((n) => {
            const Icon = ICON[n.kind];
            return (
              <li key={n.id}>
                <Link href={n.href as "/feed"} className={`flex items-start gap-3 rounded-2xl p-3.5 ring-1 transition hover:ring-ink-500 ${n.read ? "bg-ink-900 ring-ink-800" : "bg-ink-850 ring-volt/30"}`}>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${n.kind === "receipt" ? "bg-volt text-ink-950" : "bg-ink-800 text-ink-200"}`}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className={`text-sm ${n.read ? "text-ink-300" : "font-semibold text-white"}`}>{n.text}</p><p className="text-xs text-ink-500">{timeAgo(n.createdAt)}</p></div>
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-volt" aria-label="Unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState art={art("empty-bell")} title="All quiet" body="You’ll hear about results, receipts, battles and new followers here." />}
    </div>
  );
}
