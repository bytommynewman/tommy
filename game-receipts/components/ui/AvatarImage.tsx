"use client";

import { useState } from "react";

/** Photo layered over the monogram; if it fails to load it removes itself and the monogram shows through. */
export function AvatarImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- already 512px WebP served with long cache headers
    <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="absolute inset-0 size-full rounded-full object-cover" />
  );
}
