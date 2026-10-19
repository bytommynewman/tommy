"use client";

import { useTransition } from "react";
import { exitLeague } from "@/app/actions";
import { btn } from "@/components/ui/primitives";

export function LeaveLeague({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} className={btn("ghost", "sm", "ml-auto")} onClick={() => confirm("Leave this league?") && start(async () => { await exitLeague(id); })}>Leave</button>;
}
