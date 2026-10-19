import { ImageResponse } from "next/og";

/** PNG app icon rendered from the brand mark (used for PWA, iOS home screen and native shells). */
export function appIconResponse(size: number, { maskable = false } = {}) {
  const mark = maskable ? size * 0.56 : size * 0.72;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 35%, #0f3d27 0%, #050607 70%)" }}>
        <svg width={mark} height={mark} viewBox="0 0 64 64">
          <path d="M18 10h28v40l-3.5-3-3.5 3-3.5-3-3.5 3-3.5-3-3.5 3-3.5-3-3.5 3z" fill="#e9ecee" />
          <path d="M24 17l3 4 5-6 5 6 3-4v8H24z" fill="#050607" />
          <rect x="23" y="30" width="18" height="3" rx="1.5" fill="#5d676f" />
          <path d="M25 38.5l4.5 4.5L40 32.5" fill="none" stroke="#22e58a" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
