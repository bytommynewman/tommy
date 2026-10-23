import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AvatarImage } from "./AvatarImage";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";
const variants: Record<Variant, string> = {
  primary: "bg-volt text-ink-950 hover:bg-volt-bright shadow-[0_0_24px_-6px_var(--color-volt)]",
  secondary: "bg-ink-800 text-ink-100 hover:bg-ink-750 ring-1 ring-ink-700",
  ghost: "text-ink-300 hover:text-white hover:bg-ink-800",
  danger: "bg-loss/10 text-loss ring-1 ring-loss/30 hover:bg-loss/20",
};
const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-13 px-6 text-base" };

export function btn(variant: Variant = "primary", size: keyof typeof sizes = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button {...props} className={btn(variant, size, className)} />;
}

export function LinkButton({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link {...props} className={btn(variant, size, className)} />;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div {...props} className={`rounded-2xl bg-ink-850 ring-1 ring-ink-700/70 ${className}`} />;
}

export function Chip({ children, tone = "default", className = "" }: { children: ReactNode; tone?: "default" | "volt" | "loss" | "gold" | "muted"; className?: string }) {
  const t = {
    default: "bg-ink-800 text-ink-200 ring-ink-700",
    volt: "bg-volt/10 text-volt ring-volt/30",
    loss: "bg-loss/10 text-loss ring-loss/30",
    gold: "bg-gold/10 text-gold ring-gold/30",
    muted: "bg-transparent text-ink-400 ring-ink-700",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${t} ${className}`}>{children}</span>;
}

export function Avatar({ name, color, size = 40, src }: { name: string; color: string; size?: number; src?: string | null }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-extrabold italic text-ink-950"
      style={{ width: size, height: size, background: `linear-gradient(145deg, ${color}, color-mix(in oklab, ${color} 55%, black))`, fontSize: size * 0.42 }}
    >
      {name.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "?"}
      {src && <AvatarImage src={src} />}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-lg font-extrabold uppercase italic tracking-tight text-ink-100">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action, art }: { title: string; body?: string; action?: ReactNode; art?: string | null }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- small local art, already sized */}
      {art && <img src={art} alt="" aria-hidden width={112} height={112} className="-mb-1 size-28 object-contain drop-shadow-[0_0_24px_rgba(34,229,138,0.25)]" />}
      <div className="font-display text-xl font-extrabold italic uppercase text-ink-200">{title}</div>
      {body && <p className="max-w-sm text-sm text-ink-400">{body}</p>}
      {action}
    </Card>
  );
}

export function Tabs({ items, active }: { items: { id: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Tabs">
      <div className="flex w-max gap-1.5">
        {items.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            scroll={false}
            aria-current={t.id === active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${t.id === active ? "bg-white text-ink-950" : "bg-ink-850 text-ink-300 ring-1 ring-ink-700 hover:text-white"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-ink-900 px-3 py-2.5 ring-1 ring-ink-700/60">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</div>
      <div className={`mt-0.5 font-display text-2xl font-extrabold italic tabular-nums ${accent ? "text-volt" : "text-white"}`}>{value}</div>
      {sub && <div className="text-xs text-ink-400">{sub}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full rounded-xl bg-ink-900 px-3.5 py-3 text-[15px] text-white placeholder:text-ink-500 ring-1 ring-ink-700 outline-none focus:ring-2 focus:ring-volt";
