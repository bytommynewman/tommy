"use client";

import { useActionState, useTransition } from "react";
import { Check } from "lucide-react";
import { joinWaitlist, logout, setBlock, updateProfile } from "@/app/actions";
import { FormError } from "@/components/app/forms";
import { SubmitButton } from "@/components/ui/client";
import { btn, Field, inputCls } from "@/components/ui/primitives";

export function ProfileForm({ displayName, bio, leagues, isPrivate }: { displayName: string; bio: string; leagues: string[]; isPrivate: boolean }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Display name"><input name="displayName" defaultValue={displayName} maxLength={40} required className={inputCls} /></Field>
      <Field label="Bio"><textarea name="bio" defaultValue={bio} maxLength={160} rows={2} className={`${inputCls} resize-none`} /></Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink-200">Leagues</legend>
        <div className="flex flex-wrap gap-2">{["NFL", "NBA", "NHL", "MLB"].map((l) => (
          <label key={l} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink-900 px-3 py-1.5 text-sm ring-1 ring-ink-700 has-checked:bg-volt/10 has-checked:ring-volt">
            <input type="checkbox" name="leagues" value={l} defaultChecked={leagues.includes(l)} className="accent-[var(--color-volt)]" />{l}
          </label>
        ))}</div>
      </fieldset>
      <label className="flex items-start gap-3 rounded-xl bg-ink-900 p-3 ring-1 ring-ink-700">
        <input type="checkbox" name="private" defaultChecked={isPrivate} className="mt-1 size-4 accent-[var(--color-volt)]" />
        <span><span className="block text-sm font-semibold text-white">Private account</span><span className="text-xs text-ink-400">Only followers see your takes in feeds. Leaderboards hide private accounts.</span></span>
      </label>
      <FormError state={state} />
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}

export function PlanCard({ plan, name, price, perks, joined }: { plan: "pro" | "creator"; name: string; price: string; perks: string[]; joined: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col rounded-2xl bg-ink-850 p-4 ring-1 ring-ink-700">
      <div className="font-display text-lg font-black italic text-white">{name}</div>
      <div className="text-sm text-ink-400">{price}</div>
      <ul className="my-3 flex-1 space-y-1">{perks.map((p) => <li key={p} className="flex gap-2 text-sm text-ink-200"><Check className="mt-0.5 size-4 shrink-0 text-volt" />{p}</li>)}</ul>
      <button type="button" disabled={joined || pending} onClick={() => start(() => joinWaitlist(plan))} className={btn(joined ? "secondary" : "primary", "sm")}>{joined ? "On the waitlist ✓" : "Join waitlist"}</button>
    </div>
  );
}

export function UnblockButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} className={btn("ghost", "sm")} onClick={() => start(async () => { await setBlock(userId, false); })}>Unblock</button>;
}

export function LogoutButton() {
  return <form action={logout}><button type="submit" className={btn("danger", "md", "w-full")}>Log out</button></form>;
}
