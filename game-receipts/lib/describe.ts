import type { Forecast } from "./scoring";

/** Pure, client-safe question shape used by editors and the review screen. */
export interface QuestionLite {
  id: string;
  league: string;
  category: string;
  kind: "binary" | "categorical";
  title: string;
  criteria: string;
  resolutionSource: string;
  resolvesBy: string;
  baselineYes?: number;
  baselineSource: "mock-consensus" | "none";
  options?: { id: string; label: string; baseline: number }[];
}

const pct = (p: number) => `${Math.round(p * 100)}%`;
const label = (q: { options?: { id: string; label: string }[] }, id: string) => q.options?.find((o) => o.id === id)?.label ?? id;

/** The exact human-readable statement stored as `structuredText` when a take is locked. */
export function describeForecast(q: { title: string; options?: { id: string; label: string }[] }, f: Forecast): string {
  if (f.type === "binary") return f.pYes >= 0.5 ? `${q.title} — YES (${pct(f.pYes)})` : `${q.title} — NO (${pct(1 - f.pYes)})`;
  const main = `${label(q, f.primary.optionId)} wins ${q.title} (${pct(f.primary.p)})`;
  return f.darkHorse ? `${main}; dark horse ${label(q, f.darkHorse.optionId)} (${pct(f.darkHorse.p)})` : main;
}
