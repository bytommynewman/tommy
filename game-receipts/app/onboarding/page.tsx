import { Lockup } from "@/components/brand/Logo";
import { requireUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { Onboarding } from "./Onboarding";
import { TEAMS, teamLabel } from "@/lib/catalog/teams";

export const metadata = { title: "Set up" };

export default async function OnboardingPage() {
  const me = await requireUser({ allowUnonboarded: true });
  if (me.onboarded) redirect("/feed");
  const teams = TEAMS.map((t) => ({ id: t.id, league: t.league, label: teamLabel(t), abbr: t.abbr, color: t.color }));
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-5 py-6">
      <Lockup size="sm" />
      <Onboarding username={me.username} teams={teams} />
    </div>
  );
}
