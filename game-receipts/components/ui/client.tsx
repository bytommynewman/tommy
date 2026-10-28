"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { btn } from "./primitives";

export function SubmitButton({ children, pendingText, variant = "primary", size = "md", className = "", ...rest }:
  { children: React.ReactNode; pendingText?: string; variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; className?: string } & Omit<React.ComponentProps<"button">, "type">) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} aria-busy={pending} {...rest} className={btn(variant, size, className)}>
      {pending ? <><Spinner />{pendingText ?? children}</> : children}
    </button>
  );
}

export function Spinner() {
  return <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

/** Animated score ring: counts up to `value` (0–100). */
export function ScoreRing({ value, size = 120, label = "Prestige", stroke = 9 }: { value: number; size?: number; label?: string; stroke?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (reduce) { raf = requestAnimationFrame(() => setShown(value)); return () => cancelAnimationFrame(raf); }
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 1100);
      setShown(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 60 ? "var(--color-volt)" : value >= 40 ? "#e9ecee" : "var(--color-ink-400)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label} ${value.toFixed(1)} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-ink-700)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} style={{ filter: value >= 60 ? "drop-shadow(0 0 6px var(--color-volt))" : undefined }} />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-[1.9em] font-black italic leading-none tabular-nums text-white" style={{ fontSize: size * 0.28 }}>{shown.toFixed(0)}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">{label}</div>
      </div>
    </div>
  );
}

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={btn("secondary", "md")} onClick={async () => {
      try { await navigator.clipboard.writeText(text.startsWith("/") ? location.origin + text : text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* clipboard blocked */ }
    }}>{done ? "Copied ✓" : label}</button>
  );
}
