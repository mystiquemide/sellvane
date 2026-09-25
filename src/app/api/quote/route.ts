import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { quoteLadder, readPool } from "@/lib/chain/pool";
import { computeBounds } from "@/lib/agent/bounds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 2 of /start: the largest single sale the pool takes right now within an impact limit,
 * using the same quote ladder the agent uses.
 */
export async function GET(req: Request) {
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
    const state = await readPool(getAddress(pool), getAddress(token), decimals);
    // Ladder up to a fifth of the tokens in the pool: past that, impact is far over any sane limit.
    const max = state.tokenReserve / BigInt(5);
    const ladder = await quoteLadder(getAddress(token), fee, max, state, 12);
    const b = computeBounds(ladder, max, impactBps);
    return NextResponse.json({
      impactBps,
      maxSale: b.maxSlice ? { amountIn: b.maxSlice.amountIn.toString(), ethOut: b.maxSlice.ethOut.toString(), impactBps: b.maxSlice.impactBps } : null,
      smallest: b.smallest ? { amountIn: b.smallest.amountIn.toString(), impactBps: b.smallest.impactBps } : null,
    });
  } catch {
    return NextResponse.json({ error: "Base did not answer. Try again." }, { status: 503 });
  }
}
