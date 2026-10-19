"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Flame, Lock, Sparkles, Wand2 } from "lucide-react";
import { lock, structure } from "@/app/actions";
import type { Suggestion } from "@/lib/ai/types";
import { describeForecast, type QuestionLite } from "@/lib/describe";
import { CATEGORY_LABEL } from "@/lib/domain";
import type { Forecast } from "@/lib/scoring";
import { Spinner } from "../ui/client";
import { btn, Chip, inputCls } from "../ui/primitives";
import { defaultForecast, ForecastEditor } from "./ForecastEditor";

type Step = "say" | "pick" | "set" | "review";
type Target = { suggestion: Suggestion; q: QuestionLite | null };

const EXAMPLES = ["Wemby wins MVP this year", "The Leafs are going to have a crazy good season", "Giannis gets traded to the Knicks", "Drake Maye throws for 4,500 yards", "Jokic will have more rebounds than Wemby"];
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function draftToLite(s: Suggestion): QuestionLite {
  const d = s.draft!;
  return { id: "draft", league: d.league, category: d.category, kind: "binary", title: d.title, criteria: d.criteria, resolutionSource: d.resolutionSource, resolvesBy: d.resolvesBy, baselineYes: 0.5, baselineSource: "none" };
}

export function CreateFlow({ questions, activeQuestionIds, initialQuestionId, first }: { questions: QuestionLite[]; activeQuestionIds: string[]; initialQuestionId?: string; first?: boolean }) {
  const initialQ = questions.find((q) => q.id === initialQuestionId) ?? null;
  const [step, setStep] = useState<Step>(initialQ ? "set" : "say");
  const [text, setText] = useState(initialQ ? "" : "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [provider, setProvider] = useState("");
  const [target, setTarget] = useState<Target | null>(initialQ ? { q: initialQ, suggestion: { key: initialQ.id, kind: "existing", questionId: initialQ.id, league: initialQ.league as Suggestion["league"], category: initialQ.category as Suggestion["category"], statement: initialQ.title, rationale: "" } } : null);
  const [forecast, setForecast] = useState<Forecast | null>(initialQ ? defaultForecast(initialQ) : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const runStructure = () => start(async () => {
    setError(null);
    const res = await structure(text);
    if (res.error) { setError(res.error); return; }
    setSuggestions(res.suggestions); setProvider(res.provider); setStep("pick");
  });

  const choose = (s: Suggestion) => {
    const q = s.kind === "existing" ? questions.find((x) => x.id === s.questionId) ?? null : s.kind === "draft" ? draftToLite(s) : null;
    if (q && s.kind === "existing" && activeQuestionIds.includes(q.id)) { setError("You already have a live take on that question — open it from your profile to post a revision."); return; }
    setError(null);
    setTarget({ suggestion: s, q });
    setForecast(q ? (s.suggestedForecast && s.suggestedForecast.type === q.kind ? s.suggestedForecast : defaultForecast(q)) : null);
    setStep(s.kind === "debate" ? "review" : "set");
  };

  const doLock = () => start(async () => {
    if (!target) return;
    const s = target.suggestion;
    const payload = s.kind === "debate"
      ? { originalText: text || s.statement, debate: { league: s.league } }
      : { originalText: text.trim() || target.q!.title, questionId: s.kind === "existing" ? s.questionId : undefined, draft: s.kind === "draft" ? s.draft : undefined, forecast: forecast! };
    const res = await lock(payload);
    if (res?.error) setError(res.error);
  });

  const back = () => { setError(null); setStep(step === "review" ? (target?.suggestion.kind === "debate" ? "pick" : "set") : step === "set" ? (suggestions.length ? "pick" : "say") : "say"); };

  return (
    <div>
      {step !== "say" && (
        <button type="button" onClick={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 hover:text-white"><ArrowLeft className="size-4" />Back</button>
      )}

      {step === "say" && (
        <section className="animate-rise">
          {first && <Chip tone="volt" className="mb-3">Step 1 of 1 · Your first receipt</Chip>}
          <h1 className="font-display text-4xl font-black uppercase italic leading-none text-white">What’s your call?</h1>
          <p className="mt-2 text-sm text-ink-400">Say it how you’d say it at the bar. We’ll turn it into something that can be graded — you approve the exact wording.</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={4} autoFocus
            placeholder="e.g. The Leafs are going to have a crazy good season" className={`${inputCls} mt-5 resize-none text-lg`}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim().length >= 4) runStructure(); }} />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full bg-ink-850 px-3 py-1.5 text-xs text-ink-300 ring-1 ring-ink-700 hover:text-white">{ex}</button>
            ))}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-loss">{error}</p>}
          <button type="button" disabled={pending || text.trim().length < 4} onClick={runStructure} className={btn("primary", "lg", "mt-5 w-full")}>
            {pending ? <><Spinner />Structuring…</> : <><Wand2 className="size-5" />Make it measurable</>}
          </button>
        </section>
      )}

      {step === "pick" && (
        <section className="animate-rise">
          <h1 className="font-display text-3xl font-black uppercase italic leading-none text-white">Pick the version you mean</h1>
          <p className="mt-2 text-sm text-ink-400">Your words: <span className="italic text-ink-200">“{text}”</span></p>
          <ul className="mt-5 space-y-3">
            {suggestions.map((s, i) => (
              <li key={s.key}>
                <button type="button" onClick={() => choose(s)} className={`w-full rounded-2xl p-4 text-left ring-1 transition hover:ring-volt ${i === 0 && s.kind !== "debate" ? "bg-volt/5 ring-volt/40" : "bg-ink-850 ring-ink-700"}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {s.kind === "debate" ? <Chip tone="gold"><Flame className="size-3" />Hot take · not graded</Chip> : <Chip tone="volt">{CATEGORY_LABEL[s.category]}</Chip>}
                    {s.league && <Chip>{s.league}</Chip>}
                    {s.kind === "draft" && <Chip tone="muted">New question</Chip>}
                    {i === 0 && s.kind !== "debate" && <Chip tone="muted"><Sparkles className="size-3" />Best match</Chip>}
                  </div>
                  <div className="font-semibold leading-snug text-white">{s.statement}</div>
                  <div className="mt-1 text-xs text-ink-400">{s.rationale}</div>
                </button>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="mt-3 text-sm text-loss">{error}</p>}
          <p className="mt-4 text-center text-[11px] text-ink-500">Interpretations by {provider === "claude" ? "Claude" : "the built-in rules engine"}. AI suggests wording only — it never decides outcomes or scores.</p>
        </section>
      )}

      {step === "set" && target?.q && forecast && (
        <section className="animate-rise">
          <div className="mb-1 flex flex-wrap gap-1.5"><Chip>{target.q.league}</Chip><Chip tone="muted">{CATEGORY_LABEL[target.q.category as keyof typeof CATEGORY_LABEL]}</Chip></div>
          <h1 className="font-display text-2xl font-black uppercase italic leading-tight text-white">{target.q.title}</h1>
          <p className="mb-5 mt-1 text-sm text-ink-400">{target.q.kind === "categorical" ? "Make your primary pick, add an optional dark horse, and set your confidence in each." : "Pick a side and set your confidence. Honest numbers score best — the math rewards calibration."}</p>
          <ForecastEditor q={target.q} value={forecast} onChange={setForecast} />
          {!text && (
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-semibold text-ink-200" htmlFor="why">Your take, in your words <span className="font-normal text-ink-500">(optional)</span></label>
              <textarea id="why" rows={2} maxLength={500} className={`${inputCls} resize-none`} placeholder="Why you’re right…" onBlur={(e) => setText(e.target.value)} />
            </div>
          )}
          <button type="button" onClick={() => setStep("review")} className={btn("primary", "lg", "mt-6 w-full")}>Review before locking</button>
        </section>
      )}

      {step === "review" && target && (
        <section className="animate-rise">
          <h1 className="font-display text-3xl font-black uppercase italic leading-none text-white">Final check</h1>
          <p className="mt-2 text-sm text-ink-400">Once locked, this can’t be edited or deleted. You can post a timestamped revision later, but this record stays.</p>
          <dl className="mt-5 divide-y divide-ink-700/60 overflow-hidden rounded-2xl bg-ink-850 ring-1 ring-ink-700">
            <Row k="Exact prediction" v={target.q && forecast ? describeForecast(target.q, forecast) : target.suggestion.statement} strong />
            {text && text !== target.suggestion.statement && <Row k="Your original words" v={`“${text}”`} />}
            <Row k="League" v={target.suggestion.league ?? "—"} />
            <Row k="Category" v={CATEGORY_LABEL[target.suggestion.category]} />
            {target.q ? (
              <>
                <Row k="Resolves by" v={`${fmt(target.q.resolvesBy)} (expected)`} />
                <Row k="Official criteria" v={target.q.criteria} />
                <Row k="Verified via" v={target.q.resolutionSource} />
                <Row k="How it’s graded" v={`Accuracy uses the Brier score (a proper scoring rule) on your stated probabilities. Take Prestige adds relative accuracy vs. ${target.q.baselineSource === "none" ? "a 50/50 baseline" : "the consensus at lock time"} (55%), boldness (20%), timing (15%) and specificity (10%). Rubric GR-2026.1.`} />
                {target.suggestion.kind === "draft" && <Row k="Review" v="New questions are checked by moderators before counting toward your reputation." />}
              </>
            ) : (
              <Row k="How it’s graded" v="Hot takes aren’t objectively verifiable, so they’re never graded — the community votes agree/disagree instead." />
            )}
          </dl>
          {error && <p role="alert" className="mt-3 rounded-xl bg-loss/10 px-3 py-2 text-sm text-loss ring-1 ring-loss/30">{error}</p>}
          <button type="button" disabled={pending} onClick={doLock} className={btn("primary", "lg", "mt-6 w-full text-lg")}>
            {pending ? <><Spinner />Sealing your receipt…</> : <><Lock className="size-5" />Lock it in</>}
          </button>
          <p className="mt-2 text-center text-xs text-ink-500">The server stamps the time and seals a SHA-256 hash of this record.</p>
        </section>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{k}</dt>
      <dd className={`mt-0.5 ${strong ? "font-display text-lg font-extrabold italic leading-snug text-white" : "text-sm text-ink-200"}`}>{v}</dd>
    </div>
  );
}
