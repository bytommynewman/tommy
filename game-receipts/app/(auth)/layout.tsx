import Link from "next/link";
import { HeroLogo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-5 py-10">
      <Link href="/" aria-label="Game Receipts home"><HeroLogo className="w-40 drop-shadow-[0_0_40px_rgba(34,229,138,0.2)]" /></Link>
      <div className="mt-6 w-full max-w-sm animate-rise">{children}</div>
    </div>
  );
}
