import { NextResponse } from "next/server";
import { tokenSnapshot } from "@/lib/status";
import { listDecisions } from "@/lib/store/db";
import { permissionHash } from "@/lib/chain/permission";
import { servedPermission } from "@/lib/server/permission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  if (symbol.toUpperCase() !== "VDEMO") return NextResponse.json({ error: "unknown token" }, { status: 404 });
  try {
    const p = servedPermission();
    const [snapshot, decisions] = await Promise.all([tokenSnapshot(p), listDecisions(permissionHash(p))]);
    return NextResponse.json({ ...snapshot, decisions }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    // Fail closed: never show cached or guessed numbers when the chain cannot be read.
    return NextResponse.json({ error: "chain read failed", detail: (e as Error).message.split("\n")[0] }, { status: 503 });
  }
}
