export function GradeBadge({ grade, letter, ranked, size = "md" }: { grade: number; letter: string; ranked: boolean; size?: "sm" | "md" | "lg" }) {
  const dims = { sm: "size-12 text-lg", md: "size-16 text-2xl", lg: "size-24 text-4xl" }[size];
  return (
    <div className={`relative flex ${dims} shrink-0 flex-col items-center justify-center rounded-2xl ${ranked ? "bg-gradient-to-br from-volt/25 to-volt/5 ring-1 ring-volt/50" : "bg-ink-800 ring-1 ring-ink-700"}`}
      title={ranked ? `Grade ${grade}` : "Unranked — needs more resolved predictions"}>
      <span className={`font-display font-black italic leading-none ${ranked ? "text-white" : "text-ink-400"}`}>{ranked ? letter : "—"}</span>
      <span className="mt-0.5 font-mono text-[10px] tabular-nums text-ink-400">{grade.toFixed(1)}</span>
    </div>
  );
}
