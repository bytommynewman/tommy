"use client";

import { useTransition } from "react";
import { markNotificationsRead } from "@/app/actions";
import { btn } from "@/components/ui/primitives";

export function MarkRead() {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} className={btn("secondary", "sm")} onClick={() => start(() => markNotificationsRead())}>Mark all read</button>;
}
