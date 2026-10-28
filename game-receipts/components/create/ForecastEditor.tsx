"use client";

import { useMemo, useState } from "react";
import { Search, Star, X } from "lucide-react";
import type { QuestionLite } from "@/lib/describe";
import type { Forecast } from "@/lib/scoring";

const P = (n: number) => `${Math.round(n)}%`;

function Slider({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <input type="range" className="gr-range" min={min} max={max} step={1} value={value} aria-label={label}
      style={{ ["--fill" as string]: `${fill}%` }} onChange={(e) => onChange(Number(e.target.value))} />
  );
}

export function defaultForecast(q: QuestionLite): Forecast {
  if (q.kind === "binary") return { type: "binary", pYes: 0.65 };
  const top = [...(q.options ?? [])].sort((a, b) => b.baseline - a.baseline)[0];
  return { type: "categorical", primary: { optionId: top.id, p: 0.35 } };
}

export function ForecastEditor({ q, value, onChange }: { q: QuestionLite; value: Forecast; onChange: (f: Forecast) => void }) {
  return value.type === "binary" ? <BinaryEditor q={q} value={value} onChange={onChange} /> : <BallotEditor q={q} value={value} onChange={onChange} />;
}

function BinaryEditor({ q, value, onChange }: { q: QuestionLite; value: Extract<Forecast, { type: "binary" }>; onChange: (f: Forecast) => void }) {
  const yes = value.pYes >= 0.5;
  const conf = Math.round((yes ? value.pYes : 1 - value.pYes) * 100);
  const set = (side: boolean, c: number) => onChange({ type: "binary", pYes: side ? c / 100 : 1 - c / 100 });
  const base = q.baselineYes;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Your side">
        {[true, false].map((s) => (
          <button key={String(s)} type="button" role="radio" aria-checked={yes === s} onClick={() => set(s, conf)}
            className={`h-14 rounded-xl font-display text-2xl font-black uppercase italic ring-1 transition ${yes === s ? (s ? "bg-volt text-ink-950 ring-volt" : "bg-loss text-ink-950 ring-loss") : "bg-ink-900 text-ink-400 ring-ink-700"}`}>
            {s ? "Yes" : "No"}
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-end justify-between">
        <span className="text-sm font-semibold text-ink-200">How sure are you?</span>
        <span className="font-display text-4xl font-black italic tabular-nums text-white">{conf}%</span>
      </div>
      <Slider value={conf} min={51} max={99} onChange={(c) => set(yes, c)} label="Confidence" />
      <div className="mt-1 flex justify-between text-xs text-ink-500"><span>Lean</span><span>Lock of the century</span></div>
      {base !== undefined && q.baselineSource !== "none" && (
        <p className="mt-4 rounded-xl bg-ink-900 px-3 py-2 text-xs text-ink-400 ring-1 ring-ink-700">
          Consensus right now: <b className="text-ink-200">{P(base * 100)} YES</b> (mock baseline). Beating consensus earns prestige; matching it earns none.
        </p>
      )}
      {q.baselineSource === "none" && <p className="mt-4 text-xs text-ink-500">No consensus baseline exists for custom questions; they’re graded against 50/50 and only count toward reputation after moderator approval.</p>}
    </div>
  );
}

function BallotEditor({ q, value, onChange }: { q: QuestionLite; value: Extract<Forecast, { type: "categorical" }>; onChange: (f: Forecast) => void }) {
  const [picking, setPicking] = useState<"primary" | "dark" | null>(null);
  const [query, setQuery] = useState("");
  const opts = useMemo(() => [...(q.options ?? [])].sort((a, b) => b.baseline - a.baseline), [q.options]);
  const label = (id: string) => opts.find((o) => o.id === id)?.label ?? id;
  const base = (id: string) => opts.find((o) => o.id === id)?.baseline ?? 0;
  const p1 = Math.round(value.primary.p * 100);
  const p2 = value.darkHorse ? Math.round(value.darkHorse.p * 100) : 0;
  const field = 100 - p1 - p2;
  const setP1 = (n: number) => {
    const dh = value.darkHorse ? { ...value.darkHorse, p: Math.min(value.darkHorse.p, n / 100, (99 - n) / 100) } : undefined;
    onChange({ type: "categorical", primary: { ...value.primary, p: n / 100 }, ...(dh ? { darkHorse: { ...dh, p: Math.max(0.01, dh.p) } } : {}) });
  };
  const setP2 = (n: number) => value.darkHorse && onChange({ ...value, darkHorse: { ...value.darkHorse, p: n / 100 } });
  const choose = (id: string) => {
    if (picking === "primary") {
      const dh = value.darkHorse?.optionId === id ? undefined : value.darkHorse;
      onChange({ type: "categorical", primary: { optionId: id, p: value.primary.p }, ...(dh ? { darkHorse: dh } : {}) });
    } else if (picking === "dark" && id !== value.primary.optionId) {
      const p = Math.min(0.1, value.primary.p, 0.99 - value.primary.p);
      onChange({ ...value, darkHorse: { optionId: id, p: Math.max(0.01, p) } });
    }
    setPicking(null); setQuery("");
  };
  const filtered = opts.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-ink-900 p-4 ring-1 ring-volt/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-volt">Primary pick</span>
          <span className="text-xs text-ink-500">consensus {P(base(value.primary.optionId) * 100)}</span>
        </div>
        <button type="button" onClick={() => setPicking("primary")} aria-label={`Change primary pick (${label(value.primary.optionId)})`} className="mt-1 flex w-full items-baseline gap-2 text-left font-display text-2xl font-black italic text-white hover:text-volt"><span className="min-w-0 truncate">{label(value.primary.optionId)}</span><span className="shrink-0 font-sans text-xs font-semibold not-italic text-ink-500">Change</span></button>
        <div className="mt-3 flex items-center gap-3"><Slider value={p1} min={5} max={95} onChange={setP1} label="Primary pick confidence" /><span className="w-12 text-right font-display text-xl font-black italic tabular-nums">{p1}%</span></div>
      </div>

      {value.darkHorse ? (
        <div className="rounded-2xl bg-ink-900 p-4 ring-1 ring-gold/40">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gold"><Star className="size-3.5 fill-current" />Dark horse</span>
            <button type="button" onClick={() => onChange({ type: "categorical", primary: value.primary })} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-white" aria-label="Remove dark horse"><X className="size-3.5" />Remove</button>
          </div>
          <button type="button" onClick={() => setPicking("dark")} aria-label={`Change dark horse (${label(value.darkHorse.optionId)})`} className="mt-1 flex w-full items-baseline gap-2 text-left font-display text-2xl font-black italic text-white hover:text-gold"><span className="min-w-0 truncate">{label(value.darkHorse.optionId)}</span><span className="shrink-0 font-sans text-xs font-semibold not-italic text-ink-500">Change</span></button>
          <div className="mt-3 flex items-center gap-3"><Slider value={p2} min={1} max={Math.max(1, Math.min(p1, 99 - p1))} onChange={setP2} label="Dark horse confidence" /><span className="w-12 text-right font-display text-xl font-black italic tabular-nums">{p2}%</span></div>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking("dark")} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gold/40 py-4 text-sm font-semibold text-gold hover:bg-gold/5">
          <Star className="size-4" />Add a dark horse
        </button>
      )}

      <div className="rounded-xl bg-ink-900 px-3 py-2.5 text-xs text-ink-400 ring-1 ring-ink-700">
        <div className="mb-1.5 flex h-2 overflow-hidden rounded-full">
          <div className="bg-volt" style={{ width: `${p1}%` }} /><div className="bg-gold" style={{ width: `${p2}%` }} /><div className="flex-1 bg-ink-600" />
        </div>
        <b className="text-ink-200">{field}% on the rest of the field</b>, spread across every other candidate by consensus — so a long shot that hits still earns you a little, and nobody can hide in a lump “field” pick.
      </div>

      {picking && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Choose a candidate" onClick={() => setPicking(null)}>
          <div className="max-h-[80dvh] w-full overflow-hidden rounded-t-3xl bg-ink-850 ring-1 ring-ink-700 sm:max-w-md sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-ink-700 p-3">
              <Search className="size-4 text-ink-400" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${picking === "dark" ? "dark horse" : "primary pick"}…`} className="flex-1 bg-transparent py-1.5 text-white outline-none placeholder:text-ink-500" />
              <button type="button" onClick={() => setPicking(null)} aria-label="Close" className="text-ink-400 hover:text-white"><X className="size-5" /></button>
            </div>
            <ul className="max-h-[60dvh] overflow-y-auto p-2">
              {filtered.map((o) => {
                const disabled = picking === "dark" && o.id === value.primary.optionId;
                return (
                  <li key={o.id}>
                    <button type="button" disabled={disabled} onClick={() => choose(o.id)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-ink-800 disabled:opacity-40">
                      <span className="font-semibold text-white">{o.label}</span>
                      <span className="font-mono text-xs text-ink-400">consensus {(o.baseline * 100).toFixed(o.baseline < 0.1 ? 1 : 0)}%</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
