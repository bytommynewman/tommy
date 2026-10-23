"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import type { SubjectLite } from "@/lib/catalog/subjects";
import { SubjectAvatar } from "../app/SubjectAvatar";
import { Spinner } from "../ui/client";

export type LeagueTile = { id: string; name: string; art: string | null };

/** League tiles (title over art) → searchable list of every team and player in that league. */
export function SubjectPicker({ leagues, onPick }: { leagues: LeagueTile[]; onPick: (s: SubjectLite) => void }) {
  const [league, setLeague] = useState<LeagueTile | null>(null);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SubjectLite[] | null>(null);
  const [total, setTotal] = useState(0);
  const req = useRef(0);

  useEffect(() => {
    if (!league) return;
    const id = ++req.current;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/subjects?league=${league.id}&q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (id === req.current) { setItems(json.items ?? []); setTotal(json.total ?? 0); }
    }, q ? 150 : 0);
    return () => clearTimeout(t);
  }, [league, q]);

  return (
    <div>
      <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Leagues">
        {leagues.map((l) => {
          const on = league?.id === l.id;
          return (
            <button key={l.id} type="button" role="tab" aria-selected={on} onClick={() => { setLeague(on ? null : l); setQ(""); setItems(null); }}
              className={`relative h-24 w-32 shrink-0 snap-start overflow-hidden rounded-2xl text-left ring-1 transition active:scale-[0.97] ${on ? "ring-2 ring-volt" : "ring-ink-700 hover:ring-ink-500"}`}
              style={{ background: "radial-gradient(120% 100% at 100% 100%, color-mix(in oklab, var(--color-volt) 18%, transparent), var(--color-ink-850))" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative league art */}
              {l.art && <img src={l.art} alt="" aria-hidden className="pointer-events-none absolute -bottom-4 -right-4 size-24 object-contain opacity-80" />}
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
              <span className="absolute left-3 top-2.5 font-display text-2xl font-black italic leading-none tracking-tight text-white drop-shadow">{l.id}</span>
              <span className="absolute bottom-2.5 left-3 text-[11px] font-semibold text-ink-200">{l.name}</span>
            </button>
          );
        })}
      </div>

      {league && (
        <div className="mt-3 overflow-hidden rounded-2xl bg-ink-850 ring-1 ring-ink-700 animate-rise">
          <div className="flex items-center gap-2 border-b border-ink-700 px-3 py-2">
            <button type="button" onClick={() => setLeague(null)} aria-label="Back to leagues" className="text-ink-400 hover:text-white"><ChevronLeft className="size-5" /></button>
            <Search className="size-4 text-ink-400" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${league.id} players & teams…`} aria-label={`Search ${league.id}`}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] text-white outline-none placeholder:text-ink-500" />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="text-ink-400 hover:text-white"><X className="size-4" /></button>}
          </div>
          <ul className="max-h-[46dvh] overflow-y-auto overscroll-contain p-1.5">
            {items === null ? <li className="flex justify-center p-6 text-ink-400"><Spinner /></li>
              : items.length === 0 ? <li className="p-6 text-center text-sm text-ink-400">No match in {league.id}. Try a last name or team.</li>
              : items.map((s) => (
                <li key={s.type + s.id}>
                  <button type="button" onClick={() => onPick(s)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-ink-800 active:bg-ink-750">
                    <SubjectAvatar s={s} size={40} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-white">{s.name}</span><span className="block text-xs text-ink-400">{s.type === "team" ? "Team" : s.meta}</span></span>
                  </button>
                </li>
              ))}
          </ul>
          {items && total > items.length && <div className="border-t border-ink-700 px-3 py-2 text-center text-xs text-ink-500">Showing {items.length} of {total} — search to narrow</div>}
        </div>
      )}
    </div>
  );
}
