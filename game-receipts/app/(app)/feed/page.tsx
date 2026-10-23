import Link from "next/link";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/app/Shell";
import { PredictionCard } from "@/components/app/PredictionCard";
import { EmptyState, LinkButton, Tabs } from "@/components/ui/primitives";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { feed, FEED_TABS, type FeedTab } from "@/lib/server/services/social";
import { viewPrediction } from "@/lib/server/views";
import { nowMs } from "@/lib/format";
import { art } from "@/lib/server/art";

export const metadata = { title: "Feed" };

const EMPTY: Record<FeedTab, [string, string]> = {
  following: ["Your feed is quiet", "Follow a few forecasters from the leaderboards, or lock your own take."],
  friends: ["No friends yet", "Friends are people you follow who follow you back."],
  trending: ["Nothing trending", "Be the first to lock a take today."],
  resolved: ["No results yet", "Resolved predictions and their grades will appear here."],
  NFL: ["No NFL takes yet", "Lock the first one."],
  NBA: ["No NBA takes yet", "Lock the first one."],
};

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string; placed?: string }> }) {
  const me = await requireUser();
  const { tab: raw, placed } = await searchParams;
  const tab = (FEED_TABS.some((t) => t.id === raw) ? raw : "following") as FeedTab;
  const d = db();
  const items = feed(d, me.id, tab).map((p) => viewPrediction(d, p, me.id));
  const now = nowMs();
  return (
    <div>
      <PageHeader title="Feed" sub="Takes, receipts and results from your world." />
      {placed && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl bg-volt/10 px-4 py-3 ring-1 ring-volt/40 animate-rise">
          <Lock className="size-5 shrink-0 text-volt" />
          <div className="flex-1 text-sm"><b className="text-white">Take placed.</b> <span className="text-ink-300">Timestamped and sealed — it’s at the top of your feed.</span></div>
          <Link href={`/p/${placed}`} className="text-sm font-semibold text-volt hover:underline">View receipt</Link>
        </div>
      )}
      <Tabs active={tab} items={FEED_TABS.map((t) => ({ id: t.id, label: t.label, href: `/feed?tab=${t.id}` }))} />
      <div className="mt-4 space-y-3">
        {items.length ? items.map((v) => <PredictionCard key={v.p.id} v={v} now={now} />) : (
          <EmptyState art={art("empty-receipt")} title={EMPTY[tab][0]} body={EMPTY[tab][1]} action={<LinkButton href="/create">Lock a take</LinkButton>} />
        )}
      </div>
    </div>
  );
}
