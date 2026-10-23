import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Card, Chip, EmptyState, Tabs } from "@/components/ui/primitives";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { outcomeLabel } from "@/lib/server/services/grading";
import { AppealDecision, ModerateButtons, ResolveForm, ReviewButtons } from "./AdminForms";

export const metadata = { title: "Admin" };
const TABS = [{ id: "outcomes", label: "Outcomes" }, { id: "review", label: "Question review" }, { id: "appeals", label: "Appeals" }, { id: "reports", label: "Reports" }, { id: "audit", label: "Audit log" }];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab: raw } = await searchParams;
  const tab = TABS.some((t) => t.id === raw) ? raw! : "outcomes";
  const d = db();
  const name = (id: string) => d.users.find((u) => u.id === id)?.username ?? id;
  const counts: Record<string, number> = {
    review: d.questions.filter((q) => q.reviewStatus === "pending" && q.status !== "void").length,
    appeals: d.appeals.filter((a) => a.status === "open").length,
    reports: d.reports.filter((r) => r.status === "open").length,
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Admin" sub="Outcome verification, disputes and moderation. Every action is audit-logged." />
      <Tabs active={tab} items={TABS.map((t) => ({ ...t, label: counts[t.id] ? `${t.label} (${counts[t.id]})` : t.label, href: `/admin?tab=${t.id}` }))} />

      {tab === "outcomes" && (
        <div className="space-y-3">
          {d.questions.filter((q) => q.status !== "void").sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || a.resolvesBy.localeCompare(b.resolvesBy)).map((q) => {
            const n = d.predictions.filter((p) => p.questionId === q.id && !p.supersededAt).length;
            return (
              <Card key={q.id} data-question={q.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5"><Chip>{q.league}</Chip><Chip tone={q.status === "resolved" ? "volt" : "muted"}>{q.status}</Chip>{q.reviewStatus !== "approved" && <Chip tone="gold">{q.reviewStatus}</Chip>}</div>
                    <div className="mt-1 font-semibold text-white">{q.title}</div>
                    <div className="text-xs text-ink-400">{n} takes · due {fmtDate(q.resolvesBy)}{q.outcome && ` · outcome: ${outcomeLabel(q, q.outcome)}`}</div>
                  </div>
                </div>
                <ResolveForm id={q.id} kind={q.kind} options={q.options?.map((o) => ({ id: o.id, label: o.label }))} correction={q.status === "resolved"} />
              </Card>
            );
          })}
        </div>
      )}

      {tab === "review" && (counts.review ? (
        <div className="space-y-3">{d.questions.filter((q) => q.reviewStatus === "pending" && q.status !== "void").map((q) => (
          <Card key={q.id} className="space-y-2 p-4">
            <div className="flex gap-1.5"><Chip>{q.league}</Chip><Chip tone="muted">{q.category}</Chip><span className="text-xs text-ink-400">by @{name(q.createdBy)}</span></div>
            <div className="font-semibold text-white">{q.title}</div>
            <p className="text-sm text-ink-300">{q.criteria}</p>
            <p className="text-xs text-ink-500">Resolves {fmtDate(q.resolvesBy)} via {q.resolutionSource}. Approve only if objectively verifiable and non-trivial.</p>
            <ReviewButtons id={q.id} />
          </Card>
        ))}</div>
      ) : <EmptyState title="Review queue empty" />)}

      {tab === "appeals" && (counts.appeals ? (
        <div className="space-y-3">{d.appeals.filter((a) => a.status === "open").map((a) => {
          const p = d.predictions.find((x) => x.id === a.predictionId)!;
          return (
            <Card key={a.id} className="p-4">
              <div className="text-xs text-ink-400">@{name(a.userId)} · {fmtDateTime(a.createdAt)}</div>
              <Link href={`/p/${p.id}`} className="mt-1 block font-semibold text-white hover:text-volt">{p.structuredText}</Link>
              <p className="mt-2 rounded-lg bg-ink-900 p-2.5 text-sm text-ink-200">{a.reason}</p>
              <AppealDecision id={a.id} />
            </Card>
          );
        })}</div>
      ) : <EmptyState title="No open appeals" />)}

      {tab === "reports" && (counts.reports ? (
        <div className="space-y-3">{d.reports.filter((r) => r.status === "open").map((r) => {
          const target = r.targetType === "prediction" ? d.predictions.find((x) => x.id === r.targetId)?.structuredText : r.targetType === "comment" ? d.comments.find((x) => x.id === r.targetId)?.body : `@${name(r.targetId)}`;
          return (
            <Card key={r.id} className="space-y-2 p-4">
              <div className="flex gap-1.5"><Chip tone="loss">{r.reason}</Chip><Chip tone="muted">{r.targetType}</Chip><span className="text-xs text-ink-400">by @{name(r.reporterId)}</span></div>
              <p className="text-sm text-ink-200">{target}</p>
              {r.targetType !== "user" && <ModerateButtons id={r.id} />}
            </Card>
          );
        })}</div>
      ) : <EmptyState title="No open reports" />)}

      {tab === "audit" && (
        <Card className="divide-y divide-ink-700/60 font-mono text-xs">
          {[...d.audit].reverse().slice(0, 150).map((a) => (
            <div key={a.id} className="flex gap-3 px-3 py-2"><span className="w-36 shrink-0 text-ink-500">{a.at.slice(0, 19).replace("T", " ")}</span><span className="w-24 shrink-0 truncate text-ink-300">@{name(a.actorId)}</span><span className="text-volt">{a.action}</span><span className="truncate text-ink-400">{a.entity}:{a.entityId.slice(0, 12)}</span></div>
          ))}
        </Card>
      )}
    </div>
  );
}
