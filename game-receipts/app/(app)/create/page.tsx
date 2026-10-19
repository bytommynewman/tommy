import Link from "next/link";
import { CreateFlow } from "@/components/create/CreateFlow";
import { SectionTitle } from "@/components/ui/primitives";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { openQuestions, toLite } from "@/lib/server/services/questions";
import { LEAGUE_NAME, LEAGUES } from "@/lib/catalog/teams";
import { art, type ArtName } from "@/lib/server/art";

export const metadata = { title: "Lock a take" };

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ q?: string; first?: string }> }) {
  const me = await requireUser();
  const { q, first } = await searchParams;
  const d = db();
  const open = openQuestions(d).filter((x) => x.reviewStatus === "approved");
  const active = d.predictions.filter((p) => p.userId === me.id && p.status === "pending" && !p.supersededAt && !p.withdrawnAt && p.questionId).map((p) => p.questionId!);
  const favs = new Set(me.favoriteLeagues);
  const ART: Record<string, ArtName> = { NFL: "league-nfl", NCAAF: "league-nfl", NBA: "league-nba", NCAAB: "league-nba", NHL: "league-nhl", MLB: "league-mlb" };
  const leagueTiles = [...LEAGUES]
    .sort((a, b) => Number(favs.has(b)) - Number(favs.has(a)))
    .map((l) => ({ id: l, name: LEAGUE_NAME[l], art: art(ART[l]) }));
  const markets = [...open].sort((a, b) => Number(favs.has(b.league)) - Number(favs.has(a.league)));
  return (
    <div className="space-y-10">
      <CreateFlow key={q ?? "free"} questions={open.map(toLite)} activeQuestionIds={active} initialQuestionId={q} first={first === "1"} leagueTiles={leagueTiles} />
      {!q && (
        <section>
          <SectionTitle>Or jump into a live market</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {markets.map((m) => {
              const mine = active.includes(m.id);
              return (
                <Link key={m.id} href={`/create?q=${m.id}`} aria-disabled={mine}
                  className={`rounded-xl bg-ink-850 px-4 py-3 ring-1 ring-ink-700 transition hover:ring-volt ${mine ? "pointer-events-none opacity-50" : ""}`}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{m.league} · {m.kind === "categorical" ? "Ballot" : "Yes / No"}{mine && " · you’re in"}</div>
                  <div className="mt-0.5 font-semibold leading-snug text-white">{m.title}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
