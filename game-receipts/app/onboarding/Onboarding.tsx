"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { completeOnboarding } from "@/app/actions";
import { FormError } from "@/components/app/forms";
import { SubmitButton } from "@/components/ui/client";
import { btn, Field, inputCls } from "@/components/ui/primitives";

type T = { id: string; league: string; label: string; abbr: string; color: string };
const LEAGUES = [
  { id: "NFL", name: "NFL", note: "Full support" },
  { id: "NBA", name: "NBA", note: "Full support" },
  { id: "NHL", name: "NHL", note: "Early access" },
  { id: "MLB", name: "MLB", note: "Early access" },
];

export function Onboarding({ username, teams }: { username: string; teams: T[] }) {
  const [step, setStep] = useState(0);
  const [leagues, setLeagues] = useState<string[]>(["NFL", "NBA"]);
  const [picked, setPicked] = useState<string[]>([]);
  const [state, action] = useActionState(completeOnboarding, undefined);
  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const steps = ["Leagues", "Teams", "Profile"];

  return (
    <form action={action} className="mt-6">
      <ol className="mb-6 flex gap-2" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-volt" : "bg-ink-700"}`} />
            <div className={`mt-1.5 text-xs font-semibold ${i === step ? "text-white" : "text-ink-500"}`}>{s}</div>
          </li>
        ))}
      </ol>
      {leagues.map((l) => <input key={l} type="hidden" name="leagues" value={l} />)}
      {picked.map((t) => <input key={t} type="hidden" name="teams" value={t} />)}

      <section hidden={step !== 0} className="animate-rise">
        <h1 className="font-display text-3xl font-black uppercase italic text-white">What do you watch?</h1>
        <p className="mt-1 text-sm text-ink-400">We’ll tune your feed and prediction prompts.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {LEAGUES.map((l) => {
            const on = leagues.includes(l.id);
            return (
              <button type="button" key={l.id} aria-pressed={on} onClick={() => toggle(leagues, setLeagues, l.id)}
                className={`relative rounded-2xl p-4 text-left ring-1 transition ${on ? "bg-volt/10 ring-volt" : "bg-ink-850 ring-ink-700 hover:ring-ink-500"}`}>
                <div className="font-display text-2xl font-black italic text-white">{l.name}</div>
                <div className="text-xs text-ink-400">{l.note}</div>
                {on && <Check className="absolute right-3 top-3 size-5 text-volt" />}
              </button>
            );
          })}
        </div>
        <button type="button" disabled={!leagues.length} onClick={() => setStep(1)} className={btn("primary", "lg", "mt-6 w-full")}>Continue</button>
      </section>

      <section hidden={step !== 1} className="animate-rise">
        <h1 className="font-display text-3xl font-black uppercase italic text-white">Your teams</h1>
        <p className="mt-1 text-sm text-ink-400">Optional. Pick as many as you like (up to 12).</p>
        <div className="mt-5 max-h-[52vh] space-y-5 overflow-y-auto pr-1">
          {leagues.map((l) => (
            <div key={l}>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">{l}</div>
              <div className="flex flex-wrap gap-2">
                {teams.filter((t) => t.league === l).map((t) => {
                  const on = picked.includes(t.id);
                  return (
                    <button type="button" key={t.id} aria-pressed={on} onClick={() => (on || picked.length < 12) && toggle(picked, setPicked, t.id)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1 transition ${on ? "bg-white font-semibold text-ink-950 ring-white" : "bg-ink-850 text-ink-200 ring-ink-700 hover:ring-ink-500"}`}>
                      <span className="size-2.5 rounded-full" style={{ background: t.color }} />{t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setStep(0)} className={btn("secondary", "lg")}>Back</button>
          <button type="button" onClick={() => setStep(2)} className={btn("primary", "lg", "flex-1")}>{picked.length ? "Continue" : "Skip"}</button>
        </div>
      </section>

      <section hidden={step !== 2} className="animate-rise space-y-4">
        <div>
          <h1 className="font-display text-3xl font-black uppercase italic text-white">Your profile</h1>
          <p className="mt-1 text-sm text-ink-400">This is what people see on your receipts.</p>
        </div>
        <Field label="Display name"><input className={inputCls} name="displayName" defaultValue={username} maxLength={40} required /></Field>
        <Field label="Username"><input className={inputCls} name="username" defaultValue={username} pattern="[A-Za-z0-9_]{3,20}" required autoCapitalize="none" /></Field>
        <Field label="Bio" hint="Optional, 160 characters."><textarea className={`${inputCls} min-h-20`} name="bio" maxLength={160} placeholder="Lifelong Bills fan. Never wrong, occasionally early." /></Field>
        <FormError state={state} />
        <div className="flex gap-3">
          <button type="button" onClick={() => setStep(1)} className={btn("secondary", "lg")}>Back</button>
          <SubmitButton size="lg" className="flex-1" pendingText="Saving…">Make my first call →</SubmitButton>
        </div>
      </section>
    </form>
  );
}
