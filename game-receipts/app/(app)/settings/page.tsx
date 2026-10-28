import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { TEAMS, teamLabel } from "@/lib/catalog/teams";
import { usernameCooldownEnds } from "@/lib/server/services/accounts";
import { DeleteForm, DownloadData, EmailForm, PasswordForm, PhotoForm, PrivacyForm, ProfileForm, UsernameForm } from "./AccountForms";
import { LogoutButton, PlanCard, UnblockButton } from "./SettingsClient";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireUser();
  const d = db();
  const blocked = d.blocks.filter((b) => b.blockerId === me.id).map((b) => d.users.find((u) => u.id === b.blockedId)!).filter(Boolean);
  const teamOptions = TEAMS.map((t) => ({ id: t.id, league: t.league, label: teamLabel(t) }));
  const onWaitlist = (plan: string) => d.waitlist.some((w) => w.userId === me.id && w.plan === plan);
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" sub={`Signed in as ${me.email}`} />
      <Card className="space-y-6 p-5">
        <SectionTitle>Profile</SectionTitle>
        <PhotoForm name={me.displayName} color={me.avatarColor} src={me.avatarUrl} />
        <hr className="border-ink-700/60" />
        <UsernameForm username={me.username} lockedUntil={usernameCooldownEnds(me)?.toISOString()} />
        <hr className="border-ink-700/60" />
        <ProfileForm displayName={me.displayName} bio={me.bio} location={me.location ?? ""} website={me.website ?? ""} color={me.avatarColor} leagues={me.favoriteLeagues} teams={me.favoriteTeams} teamOptions={teamOptions} />
      </Card>
      <Card className="p-5"><SectionTitle>Privacy</SectionTitle><PrivacyForm isPrivate={me.private} /></Card>
      <Card className="space-y-6 p-5"><SectionTitle>Account</SectionTitle><EmailForm email={me.email} /><hr className="border-ink-700/60" /><PasswordForm /></Card>
      <Card className="p-5">
        <SectionTitle>Your data</SectionTitle>
        <p className="mb-3 text-sm text-ink-400">A JSON file with your profile, predictions, comments and follows.</p>
        <DownloadData />
      </Card>
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
      <Card className="border-loss/30 p-5 ring-loss/30">
        <SectionTitle>Danger zone</SectionTitle>
        <p className="mb-4 text-sm text-ink-400">Deleting your account removes your email, password, photo, bio and links, and your follows, likes and blocks. Locked predictions are permanent public records, so they stay, shown as <b className="text-ink-200">Deleted user</b>. This can’t be undone.</p>
        <DeleteForm username={me.username} />
      </Card>
    </div>
  );
}
