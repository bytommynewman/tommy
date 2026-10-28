"use client";

import { Download, Share2 } from "lucide-react";
import { useState } from "react";
import { btn } from "@/components/ui/primitives";

export function ShareActions({ id, text, username }: { id: string; text: string; username: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const url = () => `${location.origin}/r/${id}`;

  const share = async () => {
    try {
      const res = await fetch(`/r/${id}/image?format=story`);
      const file = new File([await res.blob()], `game-receipt-${username}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text, url: url() }); return; }
      if (navigator.share) { await navigator.share({ text, url: url() }); return; }
      setMsg("Sharing isn’t supported here — download the image or copy the link.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg("Couldn’t open the share sheet.");
    }
  };

  return (
    <div className="space-y-2">
      <button type="button" onClick={share} className={btn("primary", "lg", "w-full")}><Share2 className="size-5" />Share receipt</button>
      <div className="grid grid-cols-2 gap-2">
        <a href={`/r/${id}/image?format=story`} download={`game-receipt-${username}-story.png`} className={btn("secondary", "md")}><Download className="size-4" />Story (9:16)</a>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`/r/${id}`)}`} target="_blank" rel="noopener noreferrer"
          onClick={(e) => { e.currentTarget.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url())}`; }} className={btn("secondary", "md")}>Post to X</a>
      </div>
      {msg && <p className="text-center text-xs text-ink-400">{msg}</p>}
    </div>
  );
}
