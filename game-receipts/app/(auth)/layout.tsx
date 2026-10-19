import Link from "next/link";
import { HeroLogo } from "@/components/brand/Logo";
import { art } from "@/lib/server/art";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center px-5 py-10" style={{ paddingTop: "calc(2.5rem + var(--safe-top))" }}>
      {art("hero-tall") && (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative art */}
          <img src={art("hero-tall")!} alt="" className="size-full object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/75 to-ink-950" />
        </div>
      )}
      <Link href="/" aria-label="Game Receipts home" className="relative"><HeroLogo className="w-40 drop-shadow-[0_0_40px_rgba(34,229,138,0.2)]" /></Link>
      <div className="relative mt-6 w-full max-w-sm animate-rise">{children}</div>
    </div>
  );
}
