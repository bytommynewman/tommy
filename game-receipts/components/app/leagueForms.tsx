"use client";

import { useActionState } from "react";
import { joinLeague, newLeague } from "@/app/actions";
import { SubmitButton } from "../ui/client";
import { Field, inputCls } from "../ui/primitives";
import { FormError } from "./forms";

export function JoinLeagueForm({ code = "" }: { code?: string }) {
  const [state, action] = useActionState(joinLeague, undefined);
  return (
    <form action={action} className="flex gap-2">
      <input name="code" defaultValue={code} required placeholder="Invite code" aria-label="Invite code" className={`${inputCls} uppercase`} autoCapitalize="characters" />
      <SubmitButton>Join</SubmitButton>
      <FormError state={state} />
    </form>
  );
}

export function CreateLeagueForm({ questions }: { questions: { id: string; title: string; league: string }[] }) {
  const [state, action] = useActionState(newLeague, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="League name"><input name="name" required minLength={3} maxLength={60} className={inputCls} placeholder="Sunday Sickos" /></Field>
      <Field label="Description"><input name="description" maxLength={280} className={inputCls} placeholder="Season-long picks with the group chat" /></Field>
      <Field label="Visibility">
        <select name="visibility" className={inputCls} defaultValue="private"><option value="private">Private — invite code only</option><option value="public">Public — listed for anyone to join</option></select>
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink-200">League questions <span className="font-normal text-ink-500">(standings use only these; leave empty to use everything)</span></legend>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-ink-900 p-2 ring-1 ring-ink-700">
          {questions.map((q) => (
            <label key={q.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-200 hover:bg-ink-800">
              <input type="checkbox" name="questionIds" value={q.id} className="size-4 accent-[var(--color-volt)]" /><span className="text-xs font-bold text-ink-400">{q.league}</span>{q.title}
            </label>
          ))}
        </div>
      </fieldset>
      <FormError state={state} />
      <SubmitButton className="w-full">Create league</SubmitButton>
    </form>
  );
}
