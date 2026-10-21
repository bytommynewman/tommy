import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Link2, MapPin, Settings } from "lucide-react";
import { SubjectAvatar } from "@/components/app/SubjectAvatar";
import { GradeBadge } from "@/components/app/GradeBadge";
import { BlockButton, FollowButton } from "@/components/app/interactive";
import { PredictionCard } from "@/components/app/PredictionCard";
import { ReportButton } from "@/components/app/detail";
import { Avatar, Card, Chip, EmptyState, LinkButton, SectionTitle, Stat, Tabs } from "@/components/ui/primitives";
import { teamById, teamLabel } from "@/lib/catalog/teams";
import { currentUser } from "@/lib/server/auth";
import { marketingCapture } from "@/lib/marketing";
import { db } from "@/lib/server/db";
import { userByFormerName } from "@/lib/server/services/accounts";
import { isBlocked } from "@/lib/server/services/notify";
import { battleRecord, userReputation } from "@/lib/server/services/reputation";
import { userByName, viewPrediction } from "@/lib/server/views";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

const TABS = [{ id: "pending", label: "Pending" }, { id: "resolved", label: "Resolved" }, { id: "takes", label: "Hot takes" }, { id: "all", label: "All" }];

export default async function ProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.id === rawTab) ? rawTab! : "pending";
  const me = await currentUser();
  const d = db();
  const u = userByName(d, username);
  if (!u) { const old = userByFormerName(d, username); if (old) redirect(`/u/${old.username}${rawTab ? `?tab=${rawTab}` : ""}`); notFound(); }
  const blockedByMe = !!me && d.blocks.some((b) => b.blockerId === me.id && b.blockedId === u.id);
  if (me && !blockedByMe && isBlocked(d, me.id, u.id)) notFound();
  const isMe = me?.id === u.id;
  const following = !!me && d.follows.some((f) => f.followerId === me.id && f.followeeId === u.id);
  const canSee = !u.private || isMe || following;
  const rep = userReputation(d, u.id);
  const rec = battleRecord(d, u.id);
  const followers = d.follows.filter((f) => f.followeeId === u.id).length;
  const followingCount = d.follows.filter((f) => f.followerId === u.id).length;
  const preds = d.predictions
    .filter((p) => p.userId === u.id && !p.supersededAt && (!p.hidden || isMe) && !p.withdrawnInGrace)
    .filter((p) => tab === "all" || (tab === "pending" ? p.status === "pending" && p.kind === "graded" : tab === "resolved" ? p.status === "resolved" : p.kind === "debate"))
    .sort((a, b) => (b.resolvedAt ?? b.lockedAt).localeCompare(a.resolvedAt ?? a.lockedAt));

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-volt/20 via-ink-800 to-ink-850" style={{ backgroundColor: u.avatarColor + "22" }} />
        <div className="-mt-10 px-5 pb-5">
          <div className="flex items-end gap-3">
            <div className="rounded-full ring-4 ring-ink-850"><Avatar name={u.displayName} color={u.avatarColor} src={u.avatarUrl} size={80} /></div>
            <div className="ml-auto flex items-center gap-2 pb-1">
              {isMe ? <LinkButton href="/settings" variant="secondary" size="sm"><Settings className="size-4" />Edit</LinkButton>
                : me ? <><FollowButton userId={u.id} following={following} /><BlockButton userId={u.id} blocked={blockedByMe} /></>
                : <LinkButton href={`/login?next=/u/${u.username}`} size="sm">Follow</LinkButton>}
            </div>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 font-display text-2xl font-black italic text-white">{u.displayName}{u.isCreator && <Chip tone="volt">Creator</Chip>}{u.seed && !marketingCapture() && <Chip tone="muted">Demo</Chip>}</h1>
              <div className="text-sm text-ink-400">@{u.username}</div>
              {u.bio && <p className="mt-2 text-sm text-ink-200">{u.bio}</p>}
              <div className="mt-2 flex gap-4 text-sm"><span><b className="text-white">{followers}</b> <span className="text-ink-400">followers</span></span><span><b className="text-white">{followingCount}</b> <span className="text-ink-400">following</span></span></div>
              {(u.location || u.website) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-300">
                  {u.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-ink-400" />{u.location}</span>}
                  {u.website && <a href={u.website} target="_blank" rel="nofollow noopener ugc" className="inline-flex min-w-0 items-center gap-1 font-semibold text-volt hover:underline"><Link2 className="size-3.5 shrink-0" /><span className="truncate">{u.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span></a>}
                </div>
              )}
              {u.favoriteTeams.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{u.favoriteTeams.map((t) => { const team = teamById(t); return team ? <Chip key={t} className="normal-case tracking-normal"><SubjectAvatar s={{ type: "team", name: teamLabel(team), mark: team.abbr, color: team.color, imageUrl: team.imageUrl }} size={16} />{teamLabel(team)}</Chip> : null; })}</div>}
            </div>
            <Link href={`/u/${u.username}/reputation`} aria-label="Reputation breakdown"><GradeBadge grade={rep.overall.grade} letter={rep.overall.letter} ranked={rep.overall.ranked} size="lg" /></Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="All-time" value={rep.overall.ranked ? rep.overall.letter : "—"} sub={rep.overall.ranked ? `grade ${rep.overall.grade}` : `${rep.overall.resolved}/5 to rank`} accent />
        <Stat label="This month" value={rep.monthly.resolved ? rep.monthly.grade.toFixed(0) : "—"} sub={`${rep.monthly.resolved} resolved`} />
        <Stat label="Hit rate" value={rep.overall.hitRate !== null ? `${rep.overall.hitRate.toFixed(0)}%` : "—"} sub={`${rep.totals.correct}/${rep.totals.resolved} correct`} />
        <Stat label="Battles" value={`${rec.wins}-${rec.losses}`} sub={rec.pushes ? `${rec.pushes} push` : "W-L"} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-400">
        <span><b className="text-white">{rep.totals.total}</b> predictions</span>
        <span><b className="text-white">{rep.totals.pending}</b> pending</span>
        <span><b className="text-white">{rep.totals.resolved}</b> resolved</span>
        {rep.byLeague[0] && <span>Strongest: <b className="text-volt">{rep.byLeague[0].league}</b></span>}
        <Link href={`/u/${u.username}/reputation`} className="ml-auto font-semibold text-volt">Full breakdown →</Link>
      </div>

      {canSee && rep.best.length > 0 && (
        <section>
          <SectionTitle>Best calls</SectionTitle>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {rep.best.map((p) => (
              <Link key={p.id} href={`/r/${p.id}`} className="w-64 shrink-0 snap-start rounded-2xl bg-gradient-to-b from-ink-800 to-ink-850 p-4 ring-1 ring-ink-700 hover:ring-volt">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{p.league} · {new Date(p.lockedAt).getUTCFullYear()}</div>
                <div className="mt-1 line-clamp-3 text-sm font-semibold text-white">{p.structuredText}</div>
                <div className="mt-3 flex items-end justify-between"><span className="text-xs text-ink-400">Prestige</span><span className="font-display text-3xl font-black italic text-volt">{p.score!.prestige.toFixed(0)}</span></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <Tabs active={tab} items={TABS.map((t) => ({ ...t, href: `/u/${u.username}?tab=${t.id}` }))} />
        <div className="mt-4 space-y-3">
          {!canSee ? <EmptyState title="Private account" body="Follow to see their predictions." />
            : preds.length ? preds.map((p) => <PredictionCard key={p.id} v={viewPrediction(d, p, me?.id ?? null)} />)
            : <EmptyState title="Nothing here yet" body={isMe ? "Lock a take and it’ll live here forever." : undefined} action={isMe ? <LinkButton href="/create">Lock a take</LinkButton> : undefined} />}
        </div>
      </section>
      {me && !isMe && <ReportButton targetType="user" targetId={u.id} />}
    </div>
  );
}
