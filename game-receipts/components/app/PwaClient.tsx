"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { ReceiptMark } from "../brand/Logo";

type BIPEvent = Event & { prompt: () => Promise<void> };

/** Registers the service worker (production only) and offers "install the app" once per device. */
export function PwaClient() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    let dismissed = false;
    try { dismissed = localStorage.getItem("gr-install-dismissed") === "1"; } catch { /* storage blocked */ }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (dismissed || standalone) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
    const t = ios ? setTimeout(() => setIosHint(true), 4000) : undefined;
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); if (t) clearTimeout(t); };
  }, []);

  const dismiss = () => {
    setDeferred(null); setIosHint(false);
    try { localStorage.setItem("gr-install-dismissed", "1"); } catch { /* storage blocked */ }
  };
  if (!deferred && !iosHint) return null;
  return (
    <div role="dialog" aria-label="Install Game Receipts" className="fixed inset-x-3 z-50 animate-rise rounded-2xl bg-ink-800/95 p-3.5 shadow-2xl ring-1 ring-volt/40 backdrop-blur-xl md:inset-x-auto md:right-6 md:w-80"
      style={{ bottom: "calc(6.5rem + var(--safe-bottom))" }}>
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink-950 ring-1 ring-ink-700"><ReceiptMark className="size-8" /></span>
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-semibold text-white">Get the app</div>
          {deferred ? <div className="text-ink-300">Install Game Receipts for full-screen, one-tap access.</div>
            : <div className="text-ink-300">Tap <Share className="inline size-4 align-text-bottom" /> then <b className="text-white">Add to Home Screen</b> for the full-screen app.</div>}
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-ink-400 hover:text-white"><X className="size-5" /></button>
      </div>
      {deferred && (
        <button type="button" onClick={async () => { await deferred.prompt(); dismiss(); }} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-volt font-semibold text-ink-950">
          <Download className="size-4" />Install
        </button>
      )}
    </div>
  );
}
