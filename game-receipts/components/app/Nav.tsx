"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, Plus, Swords, Trophy, User, Users } from "lucide-react";

const items = (username: string) => [
  { href: "/feed", label: "Feed", icon: Home, match: ["/feed"] },
  { href: "/leaderboards", label: "Ranks", icon: Trophy, match: ["/leaderboards"] },
  { href: "/create", label: "Lock it", icon: Plus, match: ["/create"], primary: true },
  { href: "/battles", label: "Battles", icon: Swords, match: ["/battles", "/leagues"] },
  { href: `/u/${username}`, label: "Profile", icon: User, match: [`/u/${username}`, "/settings"] },
];

export function BottomNav({ username }: { username: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700/70 bg-ink-950/90 backdrop-blur-xl md:hidden" style={{ paddingBottom: "var(--safe-bottom)" }}>
      <div className="mx-auto flex max-w-xl items-stretch justify-around px-2">
        {items(username).map((it) => {
          const active = it.match.some((m) => path.startsWith(m));
          const Icon = it.icon;
          if (it.primary) {
            return (
              <Link key={it.href} href={it.href} aria-label="Lock a prediction" className="-mt-5 flex flex-col items-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-volt text-ink-950 shadow-[0_0_28px_-4px_var(--color-volt)] ring-4 ring-ink-950 transition active:scale-95"><Icon className="size-7" strokeWidth={2.6} /></span>
              </Link>
            );
          }
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={`flex min-w-14 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${active ? "text-white" : "text-ink-500"}`}>
              <Icon className={`size-5 ${active ? "text-volt" : ""}`} />{it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav({ username, unread, isAdmin }: { username: string; unread: number; isAdmin: boolean }) {
  const path = usePathname();
  const all = [
    ...items(username).filter((i) => !i.primary),
    { href: "/leagues", label: "Leagues", icon: Users, match: ["/leagues"] },
    { href: "/notifications", label: unread ? `Alerts (${unread})` : "Alerts", icon: Bell, match: ["/notifications"] },
  ];
  return (
    <nav aria-label="Primary" className="sticky top-20 hidden w-52 shrink-0 flex-col gap-1 self-start md:flex">
      <Link href="/create" className="mb-3 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-volt font-bold text-ink-950 shadow-[0_0_24px_-6px_var(--color-volt)] hover:bg-volt-bright">
        <Plus className="size-5" strokeWidth={2.6} />Lock a take
      </Link>
      {all.map((it) => {
        const active = it.match.some((m) => path.startsWith(m)) && !(it.href === "/battles" && path.startsWith("/leagues"));
        const Icon = it.icon;
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-ink-800 text-white" : "text-ink-400 hover:bg-ink-850 hover:text-white"}`}>
            <Icon className={`size-5 ${active ? "text-volt" : ""}`} />{it.label}
          </Link>
        );
      })}
      {isAdmin && <Link href="/admin" className="mt-4 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-500 hover:text-white">Admin console</Link>}
    </nav>
  );
}
