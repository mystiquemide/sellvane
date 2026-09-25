import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { tick } from "@/lib/agent/tick";
import { insertDecision, withTickLock } from "@/lib/store/db";
import { permissionHash } from "@/lib/chain/permission";
import { servedPermission } from "@/lib/server/permission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const secrets = [process.env.TICK_SECRET, process.env.CRON_SECRET].filter(Boolean);
  return secrets.some((s) => h === `Bearer ${s}`);
}

async function run(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = servedPermission();
  const result = await withTickLock(`tick:${permissionHash(p)}`, async () => {
    const r = await tick(p, {
      ownerPk: process.env.TEAM_OWNER_PRIVATE_KEY as Hex,
      maxImpactBps: Number(process.env.MAX_IMPACT_BPS ?? 100),
      send: process.env.TICK_SEND !== "0",
    });
    await insertDecision(r);
    return r;
  });
  if (!result.ran) return NextResponse.json({ skipped: "another tick is running" }, { status: 409 });
  const { facts: _facts, ...rest } = result.value;
  void _facts;
  return NextResponse.json(rest);
}

export const GET = run;
export const POST = run;
