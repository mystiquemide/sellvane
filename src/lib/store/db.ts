import postgres from "postgres";
import type { TickResult } from "../agent/tick";

let client: postgres.Sql | null = null;

/** Lazy client so importing this module never needs DATABASE_URL (builds, tests). */
export function sql(): postgres.Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Missing env DATABASE_URL");
    client = postgres(url, { max: 3, ssl: "require", prepare: false });
  }
  return client;
}

export type DecisionRow = {
  id: string;
  at: string;
  action: "SELL" | "WAIT" | "SKIP" | "BLOCKED";
  reason: string;
  source: string;
  amountIn: string | null;
  ethOut: string | null;
  impactBps: number | null;
  remainingBefore: string;
  txHash: string | null;
  txStatus: string | null;
};

export async function insertDecision(r: TickResult | (Omit<TickResult, "action" | "source"> & { action: "BLOCKED"; source: "manual" })) {
  await sql()`
    insert into decisions (at, permission_hash, action, reason, source, amount_in, eth_out, impact_bps, remaining_before, tx_hash, tx_status, facts)
    values (${r.at}, ${r.permissionHash}, ${r.action}, ${r.reason}, ${r.source}, ${r.amountIn}, ${r.ethOut}, ${r.impactBps},
            ${r.remainingBefore}, ${r.txHash}, ${r.txStatus}, ${r.facts ? sql().json(r.facts) : null})
    on conflict (tx_hash) do nothing`;
}

export async function listDecisions(permissionHash: string, limit = 50): Promise<DecisionRow[]> {
  const rows = await sql()`
    select id, at, action, reason, source, amount_in, eth_out, impact_bps, remaining_before, tx_hash, tx_status
    from decisions where permission_hash = ${permissionHash} order by at desc limit ${limit}`;
  return rows.map((r) => ({
    id: String(r.id),
    at: new Date(r.at).toISOString(),
    action: r.action,
    reason: r.reason,
    source: r.source,
    amountIn: r.amount_in,
    ethOut: r.eth_out,
    impactBps: r.impact_bps,
    remainingBefore: r.remaining_before,
    txHash: r.tx_hash,
    txStatus: r.tx_status,
  }));
}

/**
 * Run fn only if no other tick holds the lock for this key (cron double-fire protection).
 * Uses a transaction-scoped advisory lock so a crashed tick can never leave it held.
 */
export async function withTickLock<T>(key: string, fn: () => Promise<T>): Promise<{ ran: true; value: T } | { ran: false }> {
  return sql().begin(async (tx) => {
    const [{ locked }] = await tx`select pg_try_advisory_xact_lock(hashtext(${key})) as locked`;
    if (!locked) return { ran: false as const };
    return { ran: true as const, value: await fn() };
  }) as Promise<{ ran: true; value: T } | { ran: false }>;
}
