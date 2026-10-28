"use client";

import { useMemo, useState, useTransition } from "react";
import { Lock, MessageSquarePlus } from "lucide-react";
import { lock } from "@/app/actions";
import type { SubjectLite } from "@/lib/catalog/subjects";
import { officialSource, settleValues, takeTemplates, type TakeTemplate, type TakeValues } from "@/lib/catalog/takes";
import { Spinner } from "../ui/client";
import { btn, inputCls } from "../ui/primitives";
import { DateStamp } from "../app/DateStamp";

/** Builder takes are stated outright, so they're scored as a firm call rather than asking for a confidence number. */
const TAKE_P_YES = 0.75;

/** Ready-made takes for one player or team: pick a take from the dropdown, set its options, place it. */
export function TakeBuilder({ subject }: { subject: SubjectLite }) {
  const templates = useMemo(() => takeTemplates(subject), [subject]);
  const [id, setId] = useState(templates[0]?.id ?? "");
  const t = templates.find((x) => x.id === id) ?? templates[0];
  if (!t) return null;
  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-ink-850 p-4 ring-1 ring-volt/40">
      <label className="block">
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-volt">Pick a take on {subject.name}</span>
        <select value={t.id} onChange={(e) => setId(e.target.value)} className={`${inputCls} py-2.5 text-base font-semibold`}>
          {templates.map((x) => <option key={x.id} value={x.id}>{x.label} — {x.blurb}</option>)}
        </select>
      </label>
      <TakeForm key={t.id} t={t} subject={subject} />
    </div>
  );
}

function TakeForm({ t, subject }: { t: TakeTemplate; subject: SubjectLite }) {
  const [values, setValues] = useState<TakeValues>(() => settleValues(t));
  const [why, setWhy] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const built = t.build(values);

  const place = () => start(async () => {
    setError(null);
    const res = await lock({
      originalText: why.trim() || built.title,
      draft: { league: subject.league, category: built.category, title: built.title, criteria: built.criteria, resolutionSource: officialSource(subject.league), specificity: built.specificity, resolvesBy: built.resolvesBy },
      forecast: { type: "binary", pYes: TAKE_P_YES },
      subject: { type: subject.type, id: subject.id },
    }, "feed");
    if (res?.error) setError(res.error);
  });

  return (
    <div className="space-y-3">
      {t.params(values).length > 0 && (
        <div className={`grid gap-2 ${["", "", "sm:grid-cols-2", "sm:grid-cols-3"][t.params(values).length] ?? "sm:grid-cols-3"}`}>
          {t.params(values).map((p) => (
            <label key={p.key} className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">{p.label}</span>
              <select value={values[p.key]} onChange={(e) => setValues(settleValues(t, { ...values, [p.key]: e.target.value }))} className={`${inputCls} py-2`}>
                {p.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-3 ring-1 ring-ink-700">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-volt">Your take</div>
          <div className="mt-0.5 font-display text-lg font-extrabold italic leading-snug text-white">{built.title}</div>
          <div className="mt-1 text-xs text-ink-400">{built.criteria}</div>
        </div>
        <DateStamp at={built.resolvesBy} label="Resolves by" tone="gold" tilt={5} showTime={false} className="shrink-0" />
      </div>
      {commenting ? (
        <input autoFocus value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} placeholder="Why you’re right" className={`${inputCls} py-2`} aria-label="Comment" />
      ) : (
        <button type="button" onClick={() => setCommenting(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 hover:text-white"><MessageSquarePlus className="size-4" />Add a comment (optional)</button>
      )}
      {error && <p role="alert" className="rounded-xl bg-loss/10 px-3 py-2 text-sm text-loss ring-1 ring-loss/30">{error}</p>}
      <button type="button" disabled={pending} onClick={place} className={btn("primary", "lg", "w-full")}>
        {pending ? <><Spinner />Placing…</> : <><Lock className="size-5" />Place take</>}
      </button>
      <p className="text-center text-[11px] text-ink-500">Locked takes are timestamped and sealed — they can’t be edited or deleted.</p>
    </div>
  );
}
