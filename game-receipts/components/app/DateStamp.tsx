/** Rubber-stamp style timestamp: "LOCKED · OCT 20 2026 · 4:12 PM ET". Tilted, dashed, like an inked receipt stamp. */
const TZ = "America/New_York";

export function DateStamp({ at, label = "Locked", tone = "volt", tilt = -4, showTime = true, className = "" }: { at: string | Date; label?: string; showTime?: boolean; tone?: "volt" | "gold" | "muted"; tilt?: number; className?: string }) {
  const d = new Date(at);
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ }).toUpperCase();
  const year = d.toLocaleDateString("en-US", { year: "numeric", timeZone: TZ });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
  const color = tone === "volt" ? "text-volt border-volt/70" : tone === "gold" ? "text-gold border-gold/70" : "text-ink-300 border-ink-500";
  return (
    <time dateTime={d.toISOString()} title={d.toLocaleString("en-US", { timeZone: TZ, timeZoneName: "short" })}
      style={{ transform: `rotate(${tilt}deg)` }}
      className={`inline-flex select-none flex-col items-center rounded-md px-2.5 py-1 font-mono uppercase leading-none border-2 border-dashed ${color} ${className}`}>
      <span className="text-[9px] font-bold tracking-[0.25em] opacity-80">{label}</span>
      <span className="mt-0.5 text-[15px] font-black tracking-wider">{day} <span className="opacity-70">{year}</span></span>
      {showTime && <span className="mt-0.5 text-[9px] font-semibold tracking-widest opacity-80">{time} ET</span>}
    </time>
  );
}
