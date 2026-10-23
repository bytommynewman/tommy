"use client";

import { useActionState, useState, useTransition } from "react";
import { adminDecideAppeal, adminModerate, adminResolve, adminReviewQuestion, adminVoid } from "@/app/actions";
import { FormError } from "@/components/app/forms";
import { SubmitButton } from "@/components/ui/client";
import { btn, inputCls } from "@/components/ui/primitives";

export function ResolveForm({ id, kind, options, correction }: { id: string; kind: "binary" | "categorical"; options?: { id: string; label: string }[]; correction?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(adminResolve, undefined);
  const [vstate, vaction] = useActionState(adminVoid, undefined);
  if (state?.ok || vstate?.ok) return <FormError state={state?.ok ? state : vstate} />;
  if (!open) return <button type="button" className={btn(correction ? "ghost" : "secondary", "sm")} onClick={() => setOpen(true)}>{correction ? "Correct outcome" : "Resolve"}</button>;
  return (
    <div className="mt-3 space-y-3 rounded-xl bg-ink-900 p-3 ring-1 ring-ink-700">
      <form action={action} className="space-y-2">
        <input type="hidden" name="questionId" value={id} />
        <select name="outcome" required className={inputCls} defaultValue="" aria-label="Outcome">
          <option value="" disabled>Official outcome…</option>
          {kind === "binary" ? <><option value="yes">YES</option><option value="no">NO</option></> : options?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="source" required placeholder="Source (e.g. NBA.com)" className={inputCls} />
          <input name="url" type="url" required placeholder="https://… evidence URL" className={inputCls} />
        </div>
        <input name="note" required placeholder="What the source confirms" className={inputCls} />
        <FormError state={state} />
        <div className="flex gap-2"><button type="button" className={btn("ghost", "sm")} onClick={() => setOpen(false)}>Cancel</button><SubmitButton size="sm">{correction ? "Apply correction & regrade" : "Resolve & grade"}</SubmitButton></div>
      </form>
      {!correction && (
        <form action={vaction} className="flex gap-2 border-t border-ink-700 pt-3">
          <input type="hidden" name="questionId" value={id} />
          <input name="reason" required placeholder="Void reason (event cancelled, ambiguous…)" className={`${inputCls} py-2 text-sm`} />
          <SubmitButton size="sm" variant="danger">Void</SubmitButton>
          <FormError state={vstate} />
        </form>
      )}
    </div>
  );
}

export function ReviewButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button type="button" disabled={pending} className={btn("primary", "sm")} onClick={() => start(() => adminReviewQuestion(id, true))}>Approve</button>
      <button type="button" disabled={pending} className={btn("danger", "sm")} onClick={() => start(() => adminReviewQuestion(id, false))}>Reject</button>
    </div>
  );
}

export function AppealDecision({ id }: { id: string }) {
  const [state, action] = useActionState(adminDecideAppeal, undefined);
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="appealId" value={id} />
      <textarea name="response" required minLength={5} rows={2} placeholder="Response to the user" className={`${inputCls} resize-none text-sm`} />
      <FormError state={state} />
      <div className="flex gap-2">
        <SubmitButton size="sm" variant="secondary" name="status" value="upheld">Uphold outcome</SubmitButton>
        <SubmitButton size="sm" name="status" value="overturned">Accept appeal</SubmitButton>
      </div>
      <p className="text-xs text-ink-500">Accepting doesn’t change scores by itself — correct the question’s outcome in Outcomes to regrade everyone deterministically.</p>
    </form>
  );
}

export function ModerateButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button type="button" disabled={pending} className={btn("danger", "sm")} onClick={() => start(() => adminModerate(id, "hide"))}>Hide content</button>
      <button type="button" disabled={pending} className={btn("ghost", "sm")} onClick={() => start(() => adminModerate(id, "dismiss"))}>Dismiss</button>
    </div>
  );
}
