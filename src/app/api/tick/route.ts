import { NextResponse } from "next/server";
import { getAddress, type Hex } from "viem";
import { tick, type TickResult } from "@/lib/agent/tick";
import { insertDecision, lastDecision, withTickLock } from "@/lib/store/db";
import { listTokens, type TokenRow } from "@/lib/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const secrets = [process.env.TICK_SECRET, process.env.CRON_SECRET].filter(Boolean);
  return secrets.some((s) => h === `Bearer ${s}`);
}

/** Only Sellvane's own test token may be signed with a key we hold; real teams sign in their wallet. */
function ownerKeyFor(row: TokenRow): Hex | undefined {
  const team = process.env.TEAM_ACCOUNT_ADDRESS;
  return team && getAddress(team) === row.teamAccount ? (process.env.TEAM_OWNER_PRIVATE_KEY as Hex) : undefined;
}

const WAIT_RECORD_EVERY_MS = 60 * 60_000;

/** A wait right after another recorded wait is written at most once an hour, so waits never bury sales. */
async function isRepeatWait(t: TickResult): Promise<boolean> {
  if (t.action !== "WAIT") return false;
  const last = await lastDecision(t.permissionHash);
  return !!last && last.action === "WAIT" && Date.now() - last.at.getTime() < WAIT_RECORD_EVERY_MS;
}

async function run(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const send = process.env.TICK_SEND !== "0";
  const results: ({ slug: string } & (Omit<TickResult, "facts"> | { skipped: string } | { error: string }))[] = [];
  // One token at a time: the operator key sends every sale, so nonces must not race.
  for (const row of await listTokens()) {
    try {
      const r = await withTickLock(`tick:${row.slug}`, async () => {
        const t = await tick(row, { ownerPk: ownerKeyFor(row), send });
        if (!t.quiet && !(await isRepeatWait(t))) await insertDecision(t);
        return t;
      });
      if (!r.ran) results.push({ slug: row.slug, skipped: "another tick is running" });
      else {
        const { facts: _facts, ...rest } = r.value;
        void _facts;
        results.push({ slug: row.slug, ...rest });
      }
    } catch (e) {
      results.push({ slug: row.slug, error: (e as Error).message.split("\n")[0] });
    }
  }
  return NextResponse.json({ ticked: results.length, results });
}

export const GET = run;
export const POST = run;
