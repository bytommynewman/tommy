import { NextResponse } from "next/server";
import { subjectsFor } from "@/lib/catalog/subjects";
import { LEAGUES, type League } from "@/lib/catalog/teams";
import { currentUser } from "@/lib/server/auth";

/** Searchable team + player list for the subject picker. Server-side so full rosters never ship in the JS bundle. */
export async function GET(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const league = url.searchParams.get("league") as League;
  if (!LEAGUES.includes(league)) return NextResponse.json({ error: "unknown league" }, { status: 400 });
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const all = subjectsFor(league);
  const hits = q ? all.filter((s) => `${s.name} ${s.meta}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)) : all;
  return NextResponse.json({ total: hits.length, items: hits.slice(0, 80) }, { headers: { "Cache-Control": "private, max-age=60" } });
}
