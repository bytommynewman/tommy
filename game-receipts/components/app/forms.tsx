"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type ActionState } from "@/app/actions";
import { SubmitButton } from "../ui/client";
import { Field, inputCls } from "../ui/primitives";

export function FormError({ state }: { state: ActionState }) {
  if (!state?.error && !state?.message) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`rounded-xl px-3 py-2 text-sm ${state.error ? "bg-loss/10 text-loss ring-1 ring-loss/30" : "bg-volt/10 text-volt ring-1 ring-volt/30"}`}>
      {state.error ?? state.message}
    </p>
  );
}

export function LoginForm({ next, demo }: { next?: string; demo?: boolean }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email"><input className={inputCls} name="email" type="email" autoComplete="email" required defaultValue={demo ? "demo@demo.gamereceipts.dev" : undefined} /></Field>
      <Field label="Password"><input className={inputCls} name="password" type="password" autoComplete="current-password" required defaultValue={demo ? "receipts-demo" : undefined} /></Field>
      <FormError state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Logging in…">Log in</SubmitButton>
      <p className="text-center text-sm text-ink-400">New here? <Link href="/signup" className="font-semibold text-volt">Create an account</Link></p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signup, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email"><input className={inputCls} name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Username" hint="3–20 letters, numbers or underscores. This is your public handle.">
        <input className={inputCls} name="username" autoComplete="username" required pattern="[A-Za-z0-9_]{3,20}" autoCapitalize="none" />
      </Field>
      <Field label="Password" hint="At least 8 characters."><input className={inputCls} name="password" type="password" autoComplete="new-password" required minLength={8} /></Field>
      <FormError state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Creating…">Create account</SubmitButton>
      <p className="text-center text-xs text-ink-500">Free forever for core predictions. No wagering, no real money.</p>
      <p className="text-center text-sm text-ink-400">Already locked in? <Link href="/login" className="font-semibold text-volt">Log in</Link></p>
    </form>
  );
}
