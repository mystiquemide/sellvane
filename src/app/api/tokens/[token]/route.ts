import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rateLimit";
import { tokenSnapshot } from "@/lib/status";
import { listDecisions } from "@/lib/store/db";
import { getToken } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Short shared cache per token: many viewers polling every 30s cost one chain read per 15s.
const cache = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 15_000;

/** Live snapshot for one registered token, looked up by token or team account address. */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const limited = rateLimit(req, "snapshot", 120, 60_000);
  if (limited) return limited;
  const { token } = await ctx.params;
  try {
    const row = await getToken(token);
    if (!row) return NextResponse.json({ error: "No Sellvane cap for this token." }, { status: 404 });
    const hit = cache.get(row.slug);
    if (hit && Date.now() - hit.at < TTL_MS) {
      return NextResponse.json(hit.body, { headers: { "cache-control": "no-store" } });
    }
    const [snapshot, decisions] = await Promise.all([tokenSnapshot(row), listDecisions(row.permissionHash)]);
    const body = { ...snapshot, decisions, agent: { maxImpactBps: row.maxImpactBps } };
    cache.set(row.slug, { at: Date.now(), body });
    return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    // Fail closed: never show cached or guessed numbers when the chain cannot be read.
    return NextResponse.json({ error: "chain read failed", detail: (e as Error).message.split("\n")[0] }, { status: 503 });
  }
}
