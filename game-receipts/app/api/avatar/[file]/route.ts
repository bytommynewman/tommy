import { readAvatar } from "@/lib/server/avatars";

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const buf = readAvatar(file); // validates the name against a strict pattern; null for anything else
  if (!buf) return new Response("Not found", { status: 404 });
  // File names embed a content hash, so a changed photo is a new URL and these can be cached forever.
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
