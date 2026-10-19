import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReceiptCard } from "@/components/receipt/ReceiptCard";
import { CopyButton } from "@/components/ui/client";
import { LinkButton } from "@/components/ui/primitives";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { AWARD_LABEL } from "@/lib/server/services/grading";
import { viewPrediction } from "@/lib/server/views";
import { ShareActions } from "./ShareActions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = db().predictions.find((x) => x.id === id);
  if (!p || p.hidden) return { title: "Receipt" };
  const u = db().users.find((x) => x.id === p.userId);
  const title = `@${u?.username} called it: ${p.structuredText}`.slice(0, 90);
  return { title, openGraph: { title, images: [{ url: `/r/${p.id}/image`, width: 1200, height: 630 }] }, twitter: { card: "summary_large_image", title, images: [`/r/${p.id}/image`] } };
}

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params;
  const d = db();
  const p = d.predictions.find((x) => x.id === id);
  if (!p || p.hidden) notFound();
  const me = await currentUser();
  const q = p.questionId ? d.questions.find((x) => x.id === p.questionId) : null;
  const award = q?.awards ? (Object.entries(q.awards) as [keyof typeof AWARD_LABEL, string][]).find(([, pid]) => pid === p.id)?.[0] : undefined;
  const u = d.users.find((x) => x.id === p.userId)!;
  return (
    <div className="space-y-8 py-4">
      <ReceiptCard v={viewPrediction(d, p, me?.id ?? null)} award={award ? AWARD_LABEL[award] : undefined} />
      <div className="mx-auto max-w-sm space-y-3">
        <ShareActions id={p.id} text={`I called it on Game Receipts: ${p.structuredText}`} username={u.username} />
        <div className="flex gap-2">
          <CopyButton text={`/r/${p.id}`} />
          <LinkButton href={`/p/${p.id}`} variant="secondary" className="flex-1">View full record</LinkButton>
        </div>
        {!me && <LinkButton href="/signup" className="w-full" size="lg">Start your own receipts</LinkButton>}
      </div>
    </div>
  );
}
