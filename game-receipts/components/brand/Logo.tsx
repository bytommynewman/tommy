import Image from "next/image";

export function ReceiptMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M18 10h28v40l-3.5-3-3.5 3-3.5-3-3.5 3-3.5-3-3.5 3-3.5-3-3.5 3z" fill="#e9ecee" />
      <path d="M24 17l3 4 5-6 5 6 3-4v8H24z" fill="#050607" />
      <rect x="23" y="30" width="18" height="3" rx="1.5" fill="#5d676f" />
      <path d="M25 38.5l4.5 4.5L40 32.5" fill="none" stroke="#22e58a" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const cls = { sm: "text-base", md: "text-lg", lg: "text-3xl", xl: "text-5xl sm:text-7xl" }[size];
  return (
    <span className={`font-display font-black italic uppercase leading-none tracking-tight ${cls}`}>
      <span className="text-silver">Game</span> <span className="text-volt-grad">Receipts</span>
    </span>
  );
}

export function Lockup({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <ReceiptMark className={size === "lg" ? "size-10" : size === "sm" ? "size-6" : "size-7"} />
      <Wordmark size={size === "lg" ? "lg" : size} />
    </span>
  );
}

/** The supplied full-colour logo artwork. */
export function HeroLogo({ className = "" }: { className?: string }) {
  return (
    <Image src="/brand/game-receipts-logo.webp" alt="Game Receipts" width={1254} height={1254} priority className={className} />
  );
}
