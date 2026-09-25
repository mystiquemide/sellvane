import { NextResponse } from "next/server";
import { tokenSnapshot } from "@/lib/status";
import { listDecisions } from "@/lib/store/db";
import { permissionHash } from "@/lib/chain/permission";
import { servedPermission } from "@/lib/server/permission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Short shared cache: many viewers polling every 30s cost one chain read per 15s.
let cached: { at: number; body: unknown } | null = null;
const TTL_MS = 15_000;

export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  if (symbol.toUpperCase() !== "VDEMO") return NextResponse.json({ error: "unknown token" }, { status: 404 });
  try {
    if (cached && Date.now() - cached.at < TTL_MS) {
      return NextResponse.json(cached.body, { headers: { "cache-control": "no-store" } });
    }
    const p = servedPermission();
    const [snapshot, decisions] = await Promise.all([tokenSnapshot(p), listDecisions(permissionHash(p))]);
    const agent = { maxImpactBps: Number(process.env.MAX_IMPACT_BPS ?? 100) };
    const body = { ...snapshot, decisions, agent };
    cached = { at: Date.now(), body };
    return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    // Fail closed: never show cached or guessed numbers when the chain cannot be read.
    return NextResponse.json({ error: "chain read failed", detail: (e as Error).message.split("\n")[0] }, { status: 503 });
  }
}
