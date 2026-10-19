import { appIconResponse } from "@/lib/appIcon";

const SIZES = new Set([192, 512, 1024]);

export async function GET(req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const n = Number(size);
  if (!SIZES.has(n)) return new Response("Not found", { status: 404 });
  return appIconResponse(n, { maskable: new URL(req.url).searchParams.has("maskable") });
}
