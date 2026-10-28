import { redirect } from "next/navigation";
import { JoinLeagueForm } from "@/components/app/leagueForms";
import { Card } from "@/components/ui/primitives";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const me = await currentUser();
  if (!me) redirect(`/login?next=/join/${encodeURIComponent(code)}`);
  const g = db().groups.find((x) => x.inviteCode === code.toUpperCase());
  return (
    <Card className="mx-auto max-w-md p-6 text-center">
      <div className="text-xs font-bold uppercase tracking-wider text-volt">You’re invited</div>
      <h1 className="mt-1 font-display text-3xl font-black uppercase italic text-white">{g?.name ?? "Unknown league"}</h1>
      {g ? <><p className="mb-5 mt-2 text-sm text-ink-400">{g.description}</p><JoinLeagueForm code={g.inviteCode} /></> : <p className="mt-2 text-sm text-ink-400">That invite code doesn’t match any league.</p>}
    </Card>
  );
}
