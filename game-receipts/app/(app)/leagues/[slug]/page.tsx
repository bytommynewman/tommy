import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeBadge } from "@/components/app/GradeBadge";
import { JoinLeagueForm } from "@/components/app/leagueForms";
import { Avatar, Card, Chip, SectionTitle } from "@/components/ui/primitives";
import { CopyButton } from "@/components/ui/client";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { groupStandings } from "@/lib/server/services/groups";
import { LeaveLeague } from "./LeaveLeague";

export default async function LeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await requireUser();
  const d = db();
  const g = d.groups.find((x) => x.slug === slug);
  if (!g) notFound();
  const member = d.groupMembers.find((m) => m.groupId === g.id && m.userId === me.id);
  if (!member && g.visibility === "private") notFound();
  const standings = groupStandings(d, g.id);
  const owner = d.users.find((u) => u.id === g.ownerId)!;
  const qs = g.questionIds.map((id) => d.questions.find((q) => q.id === id)!).filter(Boolean);
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-volt/20 to-transparent p-5">
          <div className="flex flex-wrap gap-1.5">{g.isCreatorLeague && <Chip tone="volt">Creator league</Chip>}<Chip tone="muted">{g.visibility}</Chip></div>
          <h1 className="mt-2 font-display text-3xl font-black uppercase italic leading-none text-white">{g.name}</h1>
          <p className="mt-1 text-sm text-ink-300">{g.description}</p>
          <p className="mt-2 text-xs text-ink-400">Run by <Link href={`/u/${owner.username}`} className="font-semibold text-white">@{owner.username}</Link> · {standings.length} members</p>
        </div>
        {member ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-700/60 p-4">
            <span className="text-sm text-ink-400">Invite code <b className="font-mono text-white">{g.inviteCode}</b></span>
            <CopyButton text={`/join/${g.inviteCode}`} label="Copy invite link" />
            {member.role !== "owner" && <LeaveLeague id={g.id} />}
          </div>
        ) : <div className="border-t border-ink-700/60 p-4"><JoinLeagueForm code={g.visibility === "public" ? g.inviteCode : ""} /></div>}
      </Card>
      <section>
        <SectionTitle>Standings</SectionTitle>
        <Card className="divide-y divide-ink-700/60">
          {standings.map((r, i) => (
            <Link key={r.user.id} href={`/u/${r.user.username}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-ink-800/50 ${r.user.id === me.id ? "bg-volt/5" : ""}`}>
              <span className="w-6 text-center font-display font-black italic text-ink-300">{i + 1}</span>
              <Avatar name={r.user.displayName} color={r.user.avatarColor} src={r.user.avatarUrl} size={34} />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{r.user.displayName}{r.role === "owner" && <span className="ml-1.5 text-xs text-volt">host</span>}</div><div className="text-xs text-ink-400">{r.resolved} resolved · {r.pending} pending</div></div>
              <GradeBadge grade={r.grade} letter={r.letter} ranked={r.resolved > 0} size="sm" />
            </Link>
          ))}
        </Card>
      </section>
      {qs.length > 0 && (
        <section>
          <SectionTitle>League questions</SectionTitle>
          <div className="space-y-2">{qs.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-3 rounded-xl bg-ink-850 px-4 py-3 ring-1 ring-ink-700">
              <div className="min-w-0"><div className="text-[11px] font-bold uppercase text-ink-400">{q.league}</div><div className="truncate text-sm font-semibold text-white">{q.title}</div></div>
              {q.status === "open" ? <Link href={`/create?q=${q.id}`} className="shrink-0 text-sm font-semibold text-volt">Lock pick →</Link> : <Chip tone="muted">{q.status}</Chip>}
            </div>
          ))}</div>
        </section>
      )}
    </div>
  );
}
