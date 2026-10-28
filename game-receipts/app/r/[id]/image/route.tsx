import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/server/db";
import { outcomeLabel } from "@/lib/server/services/grading";
import { durationLabel, fmtDate } from "@/lib/format";

/**
 * Shareable receipt PNG. ?format=story → 1080×1920 (Instagram/TikTok stories),
 * default → 1200×630 (X, iMessage, link previews).
 */
// Official logo, embedded once per process as a data URI for the image renderer.
let logoUri: string | null = null;
const logo = () => (logoUri ??= `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public/brand/logo-360.png")).toString("base64")}`);

let shareBg: string | null | undefined;
const shareBackground = () => {
  if (shareBg === undefined) {
    const f = path.join(process.cwd(), "public/art/share-bg.png");
    shareBg = fs.existsSync(f) ? `data:image/png;base64,${fs.readFileSync(f).toString("base64")}` : null;
  }
  return shareBg;
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const story = new URL(req.url).searchParams.get("format") === "story";
  const d = db();
  const p = d.predictions.find((x) => x.id === id);
  if (!p || p.hidden) return new Response("Not found", { status: 404 });
  const u = d.users.find((x) => x.id === p.userId)!;
  const q = p.questionId ? d.questions.find((x) => x.id === p.questionId) : null;
  const s = p.score;
  const W = story ? 1080 : 1200, H = story ? 1920 : 630;
  const k = story ? 1.6 : 1;
  const green = "#22E58A";

  const receipt = (
    <div style={{ display: "flex", flexDirection: "column", width: story ? 860 : 620, background: "linear-gradient(180deg,#f6f7f8,#dde2e5)", color: "#050607", padding: 36 * k * 0.8, borderRadius: 18, boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 * k, fontWeight: 800, letterSpacing: 1 }}>
        <span>GAME RECEIPTS</span><span style={{ color: "#5d676f", fontWeight: 600 }}>#{p.id.slice(0, 8).toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", borderTop: "3px dashed #8a949b", margin: `${16 * k}px 0` }} />
      <div style={{ display: "flex", fontSize: 18 * k, color: "#39424a" }}>@{u.username} called it</div>
      <div style={{ display: "flex", fontSize: (story ? 46 : 32), fontWeight: 900, lineHeight: 1.15, marginTop: 8 }}>{p.structuredText}</div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 18 * k, fontSize: 18 * k, gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5d676f" }}>Locked</span><span style={{ fontWeight: 700 }}>{fmtDate(p.lockedAt)}</span></div>
        {q?.resolvedAt && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5d676f" }}>Confirmed</span><span style={{ fontWeight: 700 }}>{fmtDate(q.resolvedAt)}</span></div>}
        {s && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5d676f" }}>Called early by</span><span style={{ fontWeight: 700 }}>{durationLabel(s.leadDays)}</span></div>}
        {q?.outcome && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#5d676f" }}>Outcome</span><span style={{ fontWeight: 700 }}>{outcomeLabel(q, q.outcome)}</span></div>}
      </div>
      <div style={{ display: "flex", borderTop: "3px dashed #8a949b", margin: `${16 * k}px 0` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14 * k, color: "#5d676f", letterSpacing: 3 }}>{s ? "TAKE PRESTIGE" : "STATUS"}</span>
          <span style={{ fontSize: s ? 96 * k * 0.8 : 40 * k, fontWeight: 900, lineHeight: 1 }}>{s ? s.prestige.toFixed(0) : "LOCKED"}</span>
        </div>
        {s && <div style={{ display: "flex", border: `5px solid ${s.correct ? "#0f9d5c" : "#ff5d5d"}`, color: s.correct ? "#0f9d5c" : "#ff5d5d", padding: "6px 16px", borderRadius: 8, fontSize: 30 * k, fontWeight: 900, transform: "rotate(-5deg)" }}>{s.correct ? "VERIFIED ✓" : s.darkHorseHit ? "DARK HORSE" : "MISSED"}</div>}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: story ? "column" : "row", alignItems: "center", justifyContent: "center", gap: story ? 70 : 50, background: "radial-gradient(circle at 50% 0%, #0f3d27 0%, #050607 60%)", color: "#fff", fontFamily: "sans-serif", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori */}
        {story && shareBackground() && <img src={shareBackground()!} width={W} height={H} alt="" style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: story ? "center" : "flex-start", maxWidth: story ? 900 : 420 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
          <img src={logo()} width={story ? 300 : 170} height={story ? 300 : 170} alt="" style={{ marginBottom: story ? 10 : 6 }} />
          <div style={{ display: "flex", fontSize: story ? 84 : 52, fontWeight: 900, fontStyle: "italic", letterSpacing: -2 }}>
            <span style={{ color: "#e9ecee" }}>GAME&nbsp;</span><span style={{ color: green }}>RECEIPTS</span>
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: story ? 34 : 22, letterSpacing: 6, color: green }}>CALL IT. LOCK IT. PROVE IT.</div>
        </div>
        {receipt}
        {story && <div style={{ display: "flex", fontSize: 30, color: "#8a949b" }}>Verify: gamereceipts.app/p/{p.id.slice(0, 8)}</div>}
      </div>
    ),
    { width: W, height: H, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
