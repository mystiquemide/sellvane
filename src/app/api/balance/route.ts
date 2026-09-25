import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { tokenBalance } from "@/lib/chain/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How much of a token an account holds, read from Base. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = q.get("token") ?? "";
  const account = q.get("account") ?? "";
  if (!isAddress(token) || !isAddress(account)) return NextResponse.json({ error: "Bad parameters." }, { status: 400 });
  try {
    const balance = await tokenBalance(getAddress(token), getAddress(account));
    return NextResponse.json({ balance: balance.toString() });
  } catch {
    return NextResponse.json({ error: "Base did not answer. Try again." }, { status: 503 });
  }
}
