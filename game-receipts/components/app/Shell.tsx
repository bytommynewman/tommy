import Link from "next/link";
import { Bell, Search } from "lucide-react";
import type { ReactNode } from "react";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { Lockup } from "../brand/Logo";
import { LinkButton } from "../ui/primitives";
import { BottomNav, SideNav } from "./Nav";

export async function Shell({ children }: { children: ReactNode }) {
  const me = await currentUser();
  const unread = me ? db().notifications.filter((n) => n.userId === me.id && !n.read).length : 0;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link href={me ? "/feed" : "/"} aria-label="Game Receipts home"><Lockup size="sm" /></Link>
          <div className="ml-auto flex items-center gap-1">
            {me ? (
              <>
                <Link href="/search" aria-label="Search" className="flex size-10 items-center justify-center rounded-xl text-ink-300 hover:bg-ink-800 hover:text-white"><Search className="size-5" /></Link>
                <Link href="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative flex size-10 items-center justify-center rounded-xl text-ink-300 hover:bg-ink-800 hover:text-white">
                  <Bell className="size-5" />
                  {unread > 0 && <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-volt px-1 text-[10px] font-bold text-ink-950">{unread > 9 ? "9+" : unread}</span>}
                </Link>
              </>
            ) : (
              <>
                <LinkButton href="/login" variant="ghost" size="sm">Log in</LinkButton>
                <LinkButton href="/signup" size="sm">Join free</LinkButton>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-5xl gap-8 px-4 pb-28 pt-5 md:pb-12">
        {me && <SideNav username={me.username} unread={unread} isAdmin={me.role === "admin"} />}
        <main className="min-w-0 flex-1 md:max-w-2xl">{children}</main>
      </div>
      {me && <BottomNav username={me.username} />}
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-black uppercase italic leading-none tracking-tight text-white">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-ink-400">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
