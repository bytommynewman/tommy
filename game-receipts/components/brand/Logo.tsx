import Image from "next/image";

/** Emblem cropped from the official logo artwork (receipt + balls), for small placements. */
export function ReceiptMark({ className = "size-7" }: { className?: string }) {
  return <Image src="/brand/emblem-128.webp" alt="" aria-hidden width={128} height={128} className={`${className} rounded-[22%] object-cover ring-1 ring-white/10`} />;
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
