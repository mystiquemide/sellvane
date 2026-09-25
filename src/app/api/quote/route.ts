import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rateLimit";
import { getAddress, isAddress } from "viem";
import { previewMaxSale } from "@/lib/preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 2 of /start: the largest single sale the pool takes right now within an impact limit,
 * using the same quote ladder the agent uses.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "quote", 40, 60000);
  if (limited) return limited;
  const q = new URL(req.url).searchParams;
  const token = q.get("token") ?? "";
  const pool = q.get("pool") ?? "";
  const fee = Number(q.get("fee"));
  const decimals = Number(q.get("decimals"));
  const impactBps = Math.min(500, Math.max(10, Number(q.get("impactBps")) || 100));
  if (!isAddress(token) || !isAddress(pool) || ![100, 500, 3000, 10000].includes(fee) || !(decimals >= 0 && decimals <= 36)) {
    return NextResponse.json({ error: "Bad parameters." }, { status: 400 });
  }
  try {
    const p = await previewMaxSale(getAddress(token), getAddress(pool), fee, decimals, impactBps);
    return NextResponse.json({
      impactBps,
      maxSale: p.maxSale ? { amountIn: p.maxSale.amountIn.toString(), ethOut: p.maxSale.ethOut.toString(), impactBps: p.maxSale.impactBps } : null,
      smallest: p.smallest ? { amountIn: p.smallest.amountIn.toString(), impactBps: p.smallest.impactBps } : null,
    });
  } catch {
    return NextResponse.json({ error: "Base did not answer. Try again." }, { status: 503 });
  }
}
