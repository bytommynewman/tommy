import { LoginForm } from "@/components/app/forms";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const demo = process.env.NODE_ENV !== "production";
  return (
    <>
      <h1 className="mb-1 text-center font-display text-3xl font-black uppercase italic text-white">Welcome back</h1>
      <p className="mb-6 text-center text-sm text-ink-400">Your receipts are waiting.</p>
      {demo && <p className="mb-4 rounded-xl bg-ink-850 px-3 py-2 text-center text-xs text-ink-400 ring-1 ring-ink-700">Dev build: demo credentials are pre-filled.</p>}
      <LoginForm next={next} demo={demo} />
    </>
  );
}
