import Link from "next/link";
import { GradeBadge } from "@/components/app/GradeBadge";
import { PageHeader } from "@/components/app/Shell";
import { Avatar, Card, Chip, EmptyState, Tabs } from "@/components/ui/primitives";
import { MIN_RESOLVED_ALL_TIME, MIN_RESOLVED_MONTHLY, periodKey } from "@/lib/scoring";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { headToHeadBoard, leaderboard, periodsWithData, topCalls, type BoardKind } from "@/lib/server/services/reputation";

export const metadata = { title: "Leaderboards" };

const BOARDS = [
  { id: "all", label: "All-time" }, { id: "monthly", label: "Monthly" }, { id: "friends", label: "Friends" },
  { id: "NFL", label: "NFL" }, { id: "NBA", label: "NBA" }, { id: "h2h", label: "Head-to-head" }, { id: "calls", label: "Best calls" },
];
const CATS = [{ id: "", label: "All categories" }, { id: "award", label: "Awards" }, { id: "team", label: "Team" }, { id: "trade", label: "Trades" }, { id: "breakout", label: "Breakouts" }, { id: "comparison", label: "H2H stats" }];

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ board?: string; period?: string; cat?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const board = BOARDS.some((b) => b.id === sp.board) ? sp.board! : "all";
  const d = db();
  const periods = periodsWithData(d);
  const period = sp.period && /^\d{4}-\d{2}$/.test(sp.period) ? sp.period : periods[0] ?? periodKey(new Date().toISOString());
  const cat = CATS.some((c) => c.id === sp.cat) ? sp.cat! : "";
  const q = (o: Record<string, string>) => "/leaderboards?" + new URLSearchParams({ board, ...(cat ? { cat } : {}), ...o }).toString();

  return (
    <div>
      <PageHeader title="Leaderboards" sub="Ranked by shrunk average Take Prestige. Volume alone never wins." />
      <Tabs active={board} items={BOARDS.map((b) => ({ ...b, href: `/leaderboards?board=${b.id}` }))} />

      {board === "monthly" && periods.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">{periods.slice(0, 8).map((p) => <Link key={p} href={q({ period: p })} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${p === period ? "bg-volt text-ink-950" : "bg-ink-850 text-ink-300 ring-1 ring-ink-700"}`}>{p}</Link>)}</div>
      )}
      {["all", "monthly", "friends", "NFL", "NBA"].includes(board) && (
        <div className="mt-3 flex flex-wrap gap-1.5">{CATS.map((c) => <Link key={c.id} href={q({ cat: c.id, ...(board === "monthly" ? { period } : {}) })} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${c.id === cat ? "bg-white text-ink-950" : "bg-ink-850 text-ink-400 ring-1 ring-ink-700"}`}>{c.label}</Link>)}</div>
      )}

      <div className="mt-4">
        {board === "h2h" ? <H2H /> : board === "calls" ? <Calls /> : <Board kind={board as BoardKind} viewerId={me.id} period={period} cat={cat} />}
      </div>
    </div>
  );

  function H2H() {
    const rows = headToHeadBoard(d);
    if (!rows.length) return <EmptyState title="No battles settled yet" body="Challenge someone’s take to get on this board." />;
    return <Card className="divide-y divide-ink-700/60">{rows.map((r, i) => <Row key={r.user.id} rank={i + 1} u={r.user} me={r.user.id === me.id} right={<span className="font-display text-xl font-black italic tabular-nums text-white">{r.wins}-{r.losses}{r.pushes ? `-${r.pushes}` : ""}</span>} />)}</Card>;
  }

  function Calls() {
    const calls = topCalls(d, 15);
    return (
      <div className="space-y-2">{calls.map((p, i) => {
        const u = d.users.find((x) => x.id === p.userId)!;
        return (
          <Link key={p.id} href={`/r/${p.id}`} className="flex items-center gap-3 rounded-2xl bg-ink-850 p-3 ring-1 ring-ink-700 hover:ring-volt">
            <span className="w-6 text-center font-display font-black italic text-ink-400">{i + 1}</span>
            <Avatar name={u.displayName} color={u.avatarColor} size={36} />
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{p.structuredText}</div><div className="text-xs text-ink-400">@{u.username} · {p.league}</div></div>
            <span className="font-display text-2xl font-black italic text-volt">{p.score!.prestige.toFixed(0)}</span>
          </Link>
        );
      })}</div>
    );
  }
}

function Board({ kind, viewerId, period, cat }: { kind: BoardKind; viewerId: string; period: string; cat: string }) {
  const d = db();
  const rows = leaderboard(d, kind, viewerId, { period, category: cat || undefined });
  const min = kind === "all" ? MIN_RESOLVED_ALL_TIME : kind === "friends" ? 1 : MIN_RESOLVED_MONTHLY;
  if (!rows.length) return <EmptyState title="No graded forecasters yet" body={kind === "friends" ? "Follow people to compare records." : "Resolved predictions will show up here."} />;
  let rank = 0;
  return (
    <>
      <Card className="divide-y divide-ink-700/60">
        {rows.map((r) => {
          if (r.ranked) rank++;
          return <Row key={r.user.id} rank={r.ranked ? rank : null} u={r.user} me={r.user.id === viewerId}
            sub={`${r.resolved} resolved · ${r.hitRate?.toFixed(0) ?? "—"}% hit · acc ${r.meanAccuracy?.toFixed(0) ?? "—"}`}
            right={<GradeBadge grade={r.grade} letter={r.letter} ranked={r.ranked} size="sm" />} />;
        })}
      </Card>
      <p className="mt-3 text-xs text-ink-500">Ranking needs at least {min} resolved prediction{min === 1 ? "" : "s"} in scope; others are listed unranked. Grades are shrunk toward consensus level so small samples can’t top the board.</p>
    </>
  );
}

function Row({ rank, u, right, sub, me }: { rank: number | null; u: { username: string; displayName: string; avatarColor: string; isCreator: boolean }; right: React.ReactNode; sub?: string; me: boolean }) {
  return (
    <Link href={`/u/${u.username}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-ink-800/50 ${me ? "bg-volt/5" : ""}`}>
      <span className={`w-7 text-center font-display text-lg font-black italic ${rank === 1 ? "text-gold" : rank ? "text-ink-300" : "text-ink-600"}`}>{rank ?? "–"}</span>
      <Avatar name={u.displayName} color={u.avatarColor} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white"><span className="truncate">{u.displayName}</span>{me && <Chip tone="volt" className="shrink-0">You</Chip>}{u.isCreator && <Chip className="shrink-0">Creator</Chip>}</div>
        <div className="truncate text-xs text-ink-400">{sub ?? `@${u.username}`}</div>
      </div>
      {right}
    </Link>
  );
}
