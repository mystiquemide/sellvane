import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rateLimit";
import { findWethPool, readTokenInfo, TokenCheckError } from "@/lib/chain/token";
import { getToken } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 1 of /start: is this a Base ERC-20 with a Uniswap v3 WETH pool, and is it already capped? */
export async function GET(req: Request) {
  const limited = rateLimit(req, "check", 20, 60000);
  if (limited) return limited;
  const token = new URL(req.url).searchParams.get("token") ?? "";
  try {
    const info = await readTokenInfo(token);
    const pool = await findWethPool(info.token);
    const existing = await getToken(info.token).catch(() => null);
    return NextResponse.json({
      token: info.token,
      name: info.name,
      symbol: info.symbol,
      decimals: info.decimals,
      totalSupply: info.totalSupply.toString(),
      pool: { address: pool.pool, fee: pool.fee, wethReserve: pool.wethReserve.toString() },
      alreadyCapped: existing ? { teamAccount: existing.teamAccount } : null,
    });
  } catch (e) {
    if (e instanceof TokenCheckError) return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    return NextResponse.json({ error: "Base did not answer. Try again." }, { status: 503 });
  }
}
