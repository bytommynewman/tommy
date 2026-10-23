"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { joinWaitlist, logout, setBlock } from "@/app/actions";
import { btn } from "@/components/ui/primitives";

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
