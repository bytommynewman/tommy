"use client";

import { useState } from "react";
import type { SubjectLite } from "@/lib/catalog/subjects";

/** Player headshot / team logo with a team-coloured monogram fallback (no broken images, ever). */
export function SubjectAvatar({ s, size = 40 }: { s: Pick<SubjectLite, "type" | "name" | "mark" | "color" | "imageUrl">; size?: number }) {
  const [failed, setFailed] = useState(false);
  const round = s.type === "player" ? "rounded-full" : "rounded-[28%]";
  const style = { width: size, height: size };
  if (s.imageUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote provider images; sizes vary by provider
      <img src={s.imageUrl} alt={s.name} loading="lazy" onError={() => setFailed(true)}
        className={`${round} shrink-0 bg-ink-800 ring-2 ${s.type === "player" ? "object-cover object-top" : "box-border object-contain"}`}
        // team colour ring ties the photo to the club
        style={{ ...style, ...(s.type === "team" ? { padding: Math.round(size * 0.12) } : {}), ["--tw-ring-color" as string]: s.color }} />
    );
  }
  return (
    <span aria-label={s.name} role="img" style={{ ...style, background: `linear-gradient(145deg, ${s.color}, color-mix(in oklab, ${s.color} 45%, black))`, fontSize: size * (s.mark.length > 2 ? 0.3 : 0.38) }}
      className={`${round} inline-flex shrink-0 items-center justify-center font-display font-black italic text-white ring-1 ring-white/15`}>
      {s.mark}
    </span>
  );
}
