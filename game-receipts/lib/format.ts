/** Request-time clock for server components (kept out of render bodies for the purity lint). */
export const nowMs = () => Date.now();

export const pct = (p: number) => `${Math.round(p * 100)}%`;

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) + " UTC";
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const units: [number, string][] = [[60, "m"], [3600, "h"], [86400, "d"], [604800, "w"], [2629800, "mo"], [31557600, "y"]];
  let label = `${Math.floor(s / 60)}m`;
  for (const [sec, u] of units) if (s >= sec) label = `${Math.floor(s / sec)}${u}`;
  return `${label} ago`;
}

export function untilLabel(iso: string, now = Date.now()) {
  const days = Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
  if (days <= 0) return "awaiting result";
  if (days === 1) return "resolves tomorrow";
  if (days < 60) return `resolves in ${days}d`;
  return `resolves ${fmtDate(iso, { month: "short", year: "numeric" })}`;
}

export function durationLabel(days: number) {
  if (days < 1) return "same day";
  if (days < 60) return `${Math.round(days)} days`;
  const months = days / 30.44;
  if (months < 24) return `${Math.round(months)} months`;
  return `${(days / 365.25).toFixed(1)} years`;
}

export const scoreTone = (n: number) => (n >= 60 ? "text-volt" : n >= 40 ? "text-ink-100" : "text-ink-400");
