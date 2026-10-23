"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-black uppercase italic text-white">Something broke</h1>
      <p className="max-w-sm text-sm text-ink-400">Your receipts are safe — locked records are never affected by a page error.</p>
      <button type="button" onClick={reset} className="rounded-xl bg-volt px-4 py-2.5 font-semibold text-ink-950">Try again</button>
    </div>
  );
}
