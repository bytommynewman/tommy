"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Flag, Swords } from "lucide-react";
import { addComment, appeal, challenge, report, revise, withdraw } from "@/app/actions";
import type { QuestionLite } from "@/lib/describe";
import type { Forecast } from "@/lib/scoring";
import { defaultForecast, ForecastEditor } from "../create/ForecastEditor";
import { SubmitButton, Spinner } from "../ui/client";
import { btn, inputCls } from "../ui/primitives";
import { FormError } from "./forms";

export function OwnerActions({ predictionId, q, current, graceLeftMin }: { predictionId: string; q: QuestionLite; current: Forecast; graceLeftMin: number }) {
  const [mode, setMode] = useState<"idle" | "revise" | "withdraw">("idle");
  const [f, setF] = useState<Forecast>(current);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (mode === "revise") return (
    <div className="space-y-4">
      <p className="text-sm text-ink-400">A revision is a new, timestamped receipt. The original stays on record, and your final score is time-weighted across both — so late flips can’t erase an early miss.</p>
      <ForecastEditor q={q} value={f} onChange={setF} />
      <input className={inputCls} placeholder="What changed? (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <p role="alert" className="text-sm text-loss">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={btn("secondary")} onClick={() => setMode("idle")}>Cancel</button>
        <button type="button" disabled={pending} className={btn("primary", "md", "flex-1")} onClick={() => start(async () => { const r = await revise(predictionId, f, note); if (r?.error) setError(r.error); })}>
          {pending ? <Spinner /> : null}Lock revision
        </button>
      </div>
    </div>
  );
  if (mode === "withdraw") return (
    <div className="space-y-3">
      <p className="text-sm text-ink-300">
        {graceLeftMin > 0
          ? <>You’re inside the {Math.ceil(graceLeftMin)}-minute grace window: withdrawing now voids this take entirely.</>
          : <>Grace window has passed. The take will be labelled <b>withdrawn</b> but stays on your record and <b>is still graded</b> — withdrawing can’t hide a miss.</>}
      </p>
      {error && <p role="alert" className="text-sm text-loss">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={btn("secondary")} onClick={() => setMode("idle")}>Keep it</button>
        <button type="button" disabled={pending} className={btn("danger", "md", "flex-1")} onClick={() => start(async () => { const r = await withdraw(predictionId); if (r?.error) setError(r.error); else setMode("idle"); })}>Withdraw</button>
      </div>
    </div>
  );
  return (
    <div className="flex gap-2">
      <button type="button" className={btn("secondary", "md", "flex-1")} onClick={() => setMode("revise")}>Post a revision</button>
      <button type="button" className={btn("ghost")} onClick={() => setMode("withdraw")}>Withdraw</button>
    </div>
  );
}

export function ChallengeBox({ targetId, q, targetForecast, mine, opponent }: { targetId: string; q: QuestionLite; targetForecast: Forecast; mine: Forecast | null; opponent: string }) {
  const [open, setOpen] = useState(false);
  const opposite: Forecast = targetForecast.type === "binary"
    ? { type: "binary", pYes: targetForecast.pYes >= 0.5 ? 0.3 : 0.7 }
    : (() => { const d = defaultForecast(q) as Extract<Forecast, { type: "categorical" }>; const alt = (q.options ?? []).filter((o) => o.id !== targetForecast.primary.optionId).sort((a, b) => b.baseline - a.baseline)[0]; return { ...d, primary: { optionId: alt.id, p: 0.35 } }; })();
  const [f, setF] = useState<Forecast>(mine ?? opposite);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={btn("secondary", "md", "w-full")}><Swords className="size-4" />Challenge @{opponent}</button>;
  return (
    <div className="space-y-4">
      {mine ? <p className="text-sm text-ink-400">You’ll battle with your existing live take on this question. It has to oppose theirs.</p>
        : <><p className="text-sm text-ink-400">Lock your opposing side. Same question, same criteria — the more accurate forecast wins.</p><ForecastEditor q={q} value={f} onChange={setF} /></>}
      <input className={inputCls} placeholder="Trash talk (optional)" maxLength={200} value={msg} onChange={(e) => setMsg(e.target.value)} />
      {error && <p role="alert" className="text-sm text-loss">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={btn("secondary")} onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" disabled={pending} className={btn("primary", "md", "flex-1")} onClick={() => start(async () => { const r = await challenge(targetId, mine ? null : f, msg); if (r?.error) setError(r.error); })}>
          {pending ? <Spinner /> : <Swords className="size-4" />}Send challenge
        </button>
      </div>
      <p className="text-xs text-ink-500">Battles are for bragging rights.</p>
    </div>
  );
}

export function CommentForm({ predictionId }: { predictionId: string }) {
  const [state, action] = useActionState(addComment, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="predictionId" value={predictionId} />
      <textarea name="body" required maxLength={500} rows={2} placeholder="Add to the debate…" className={`${inputCls} resize-none`} />
      <FormError state={state?.error ? state : undefined} />
      <div className="flex justify-end"><SubmitButton size="sm">Post</SubmitButton></div>
    </form>
  );
}

export function ReportButton({ targetType, targetId }: { targetType: "prediction" | "comment" | "user"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(report, undefined);
  if (state?.ok) return <span className="text-xs text-ink-400">Reported. Thanks.</span>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-white"><Flag className="size-3.5" />Report</button>;
  return (
    <form action={action} className="mt-2 flex w-full gap-2">
      <input type="hidden" name="targetType" value={targetType} /><input type="hidden" name="targetId" value={targetId} />
      <select name="reason" className={`${inputCls} py-2 text-sm`} defaultValue="Harassment or abuse" aria-label="Reason">
        {["Harassment or abuse", "Spam", "Hate speech", "Misleading or impersonation", "Other"].map((r) => <option key={r}>{r}</option>)}
      </select>
      <SubmitButton size="sm" variant="danger">Send</SubmitButton>
      <FormError state={state} />
    </form>
  );
}

export function AppealForm({ predictionId }: { predictionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(appeal, undefined);
  if (state?.ok) return <FormError state={state} />;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-ink-400 underline-offset-2 hover:text-white hover:underline">Dispute this outcome</button>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="predictionId" value={predictionId} />
      <textarea name="reason" required minLength={10} maxLength={600} rows={3} className={`${inputCls} resize-none`} placeholder="What’s wrong with the resolution? Link a source if you can." />
      <FormError state={state} />
      <SubmitButton size="sm" variant="secondary">Submit appeal</SubmitButton>
    </form>
  );
}
