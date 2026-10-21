import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { exportUserData } from "@/lib/server/services/accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  const data = exportUserData(db(), me.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="game-receipts-${me.username}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
