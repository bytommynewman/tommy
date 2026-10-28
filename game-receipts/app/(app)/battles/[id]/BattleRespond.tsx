"use client";

import { useTransition } from "react";
import { answerBattle } from "@/app/actions";
import { btn } from "@/components/ui/primitives";

export function BattleRespond({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => { await answerBattle(id, false); })} className={btn("secondary", "lg", "flex-1")}>Decline</button>
      <button type="button" disabled={pending} onClick={() => start(async () => { await answerBattle(id, true); })} className={btn("primary", "lg", "flex-1")}>Accept battle</button>
    </div>
  );
}
