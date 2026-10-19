import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { LogoutButton, PlanCard, ProfileForm, UnblockButton } from "./SettingsClient";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireUser();
  const d = db();
  const blocked = d.blocks.filter((b) => b.blockerId === me.id).map((b) => d.users.find((u) => u.id === b.blockedId)!).filter(Boolean);
  const onWaitlist = (plan: string) => d.waitlist.some((w) => w.userId === me.id && w.plan === plan);
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" sub={`Signed in as ${me.email}`} />
      <Card className="p-5"><SectionTitle>Profile & privacy</SectionTitle><ProfileForm displayName={me.displayName} bio={me.bio} leagues={me.favoriteLeagues} isPrivate={me.private} /></Card>
      <section>
        <SectionTitle>Plans</SectionTitle>
        <p className="mb-3 text-sm text-ink-400">You’re on <b className="text-white">Free</b> — core predictions, grading, profile, friends, leaderboards, battles and receipts. Paid plans never change how anything is scored or verified.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <PlanCard plan="pro" name="Game Receipts Pro" price="$5.99/mo (planned)" perks={["Advanced historical comparisons", "Personalized season recaps", "Profile customization", "Extended battle history"]} joined={onWaitlist("pro")} />
          <PlanCard plan="creator" name="Creator League" price="$29/mo (planned)" perks={["Branded league pages", "Embeddable leaderboards", "Advanced member management", "Creator analytics"]} joined={onWaitlist("creator")} />
        </div>
        <p className="mt-2 text-xs text-ink-500">Billing isn’t live yet. Joining the waitlist doesn’t charge you.</p>
      </section>
      <Card className="p-5">
        <SectionTitle>Blocked accounts</SectionTitle>
        {blocked.length ? <ul className="divide-y divide-ink-700/60">{blocked.map((u) => <li key={u.id} className="flex items-center justify-between py-2.5 text-sm"><Link href={`/u/${u.username}`} className="text-white">@{u.username}</Link><UnblockButton userId={u.id} /></li>)}</ul>
          : <p className="text-sm text-ink-400">You haven’t blocked anyone.</p>}
      </Card>
      <Card className="p-5">
        <SectionTitle>Your record</SectionTitle>
        <p className="text-sm text-ink-400">Locked predictions can’t be edited or deleted — that’s the point. You can withdraw a live take (it stays on record and is still graded after a {10}-minute grace window) or post a revision.</p>
        <div className="mt-4 flex flex-wrap gap-2"><Link href="/how-scoring-works" className="text-sm font-semibold text-volt">How grading works</Link>{me.role === "admin" && <Link href="/admin" className="ml-4 text-sm font-semibold text-volt">Admin console</Link>}</div>
      </Card>
      <LogoutButton />
    </div>
  );
}
