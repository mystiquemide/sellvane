import { formatEther, formatUnits, getAddress, parseEventLogs, type Address, type Hex } from "viem";
import { operatorClient, publicClient, withRetry } from "../chain/clients";
import { POOL_ABI, SELLER_ABI } from "../chain/abis";
import { permissionHash, readCapStatus, signPermission } from "../chain/permission";
import type { TokenRow } from "../registry";
import { quoteLadder, quoteSell, readPool } from "../chain/pool";
import { computeBounds, priceFloor, sliceAmount } from "./bounds";
import { recentSales } from "../store/db";
import { decide, type Choice, type Facts } from "./decide";

export type TickResult = {
  at: string;
  permissionHash: Hex;
  action: "SELL" | "WAIT" | "SKIP";
  reason: string;
  source: Choice["source"] | "rule";
  amountIn: string | null;
  ethOut: string | null;
  impactBps: number | null;
  remainingBefore: string;
  txHash: Hex | null;
  txStatus: "success" | "reverted" | null;
  facts: Facts | null;
  /** Rate-limit skips are not written to the public ledger: they would flood it every tick. */
  quiet?: boolean;
};

/** Agent rate limits, overridable by env. */
export const LIMITS = {
  cooldownMin: Number(process.env.SELL_COOLDOWN_MIN ?? 30),
  maxSellsPerDay: Number(process.env.MAX_SELLS_PER_DAY ?? 12),
  // Stop sending when the operator wallet cannot safely pay for another sale.
  gasFloorWei: BigInt(process.env.OPERATOR_GAS_FLOOR_WEI ?? "3000000000000"),
};

const fmtWith = (decimals: number) => (v: bigint) => Number(formatUnits(v, decimals)).toLocaleString("en-US", { maximumFractionDigits: 0 });

/** Count market buys and sells of the token in the last ~hour of blocks, excluding Sellvane's own sells. */
async function recentSwaps(pool: Address, wethIsToken0: boolean, seller: Address, fmt: (v: bigint) => string) {
  const latest = await publicClient.getBlockNumber();
  const logs = await withRetry(() =>
    publicClient.getContractEvents({ address: pool, abi: POOL_ABI, eventName: "Swap", fromBlock: latest - BigInt(1800), toBlock: latest }),
  );
  let buys = 0;
  let sells = 0;
  let net = BigInt(0);
  for (const l of logs) {
    if (l.args.recipient?.toLowerCase() === seller.toLowerCase()) continue;
    const tokenDelta = wethIsToken0 ? l.args.amount1! : l.args.amount0!; // + = tokens into pool (a sell)
    if (tokenDelta > BigInt(0)) sells++;
    else buys++;
    net -= tokenDelta;
  }
  return { window: "last 1h, excluding Sellvane sells", buys, sells, netTokensBoughtByMarket: fmt(net < BigInt(0) ? -net : net) + (net < BigInt(0) ? " (net sold)" : "") };
}

/**
 * One agent step: read chain, compute deterministic bounds, let the model choose inside them,
 * then simulate and (if send) broadcast. Never sells above the bound or without a price floor.
 */
export async function tick(row: TokenRow, opts: { ownerPk?: Hex; slippageBps?: number; send: boolean }): Promise<TickResult> {
  const p = row.permission;
  const d = { token: row.token, pool: row.pool, fee: row.poolFee, seller: getAddress(process.env.SELLER_ADDRESS!) };
  const fmt = fmtWith(row.decimals);
  const maxImpactBps = row.maxImpactBps;
  const hash = permissionHash(p);
  const cap = await readCapStatus(p);
  const base = { at: new Date().toISOString(), permissionHash: hash, remainingBefore: cap.remaining.toString(), txHash: null, txStatus: null } as const;

  if (cap.revoked) return { ...base, action: "SKIP", reason: "The team revoked its cap, so the agent stopped selling. Any tokens leaving the team account now show in the bypass watch.", source: "rule", amountIn: null, ethOut: null, impactBps: null, facts: null };
  if (cap.remaining === BigInt(0)) {
    return { ...base, action: "SKIP", reason: "Today's cap is used up. No more team sales until it resets.", source: "rule", amountIn: null, ethOut: null, impactBps: null, facts: null };
  }

  // First sale of a permission approves it on chain with the owner's signature: the team's stored
  // signature, or for Sellvane's own test token, a fresh one from its team key. Without either the
  // permission can never be used, so skip before asking the model anything.
  const sig: Hex = cap.approved
    ? "0x"
    : row.signature ?? (opts.ownerPk ? await signPermission(p, opts.ownerPk) : ("0x" as Hex));
  if (!cap.approved && sig === "0x") {
    return { ...base, action: "SKIP", reason: "Waiting for the team's signature. Nothing can be sold until the team signs the cap.", source: "rule", amountIn: null, ethOut: null, impactBps: null, facts: null };
  }

  // Rate limits: space sales out and cap how many happen per day, per token.
  const sales = await recentSales(hash);
  if (sales.lastAt && Date.now() - sales.lastAt.getTime() < LIMITS.cooldownMin * 60_000) {
    const mins = Math.ceil((LIMITS.cooldownMin * 60_000 - (Date.now() - sales.lastAt.getTime())) / 60_000);
    return { ...base, action: "SKIP", reason: `Cooling down: the last sale was under ${LIMITS.cooldownMin} minutes ago. Next check in about ${mins} min.`, source: "rule", amountIn: null, ethOut: null, impactBps: null, facts: null, quiet: true };
  }
  if (sales.count24h >= LIMITS.maxSellsPerDay) {
    return { ...base, action: "SKIP", reason: `Reached ${LIMITS.maxSellsPerDay} sales in 24 hours.`, source: "rule", amountIn: null, ethOut: null, impactBps: null, facts: null, quiet: true };
  }

  const state = await readPool(d.pool, d.token, row.decimals);
  // Minimum slice: a share of the daily cap (default 1%), never more than what remains.
  const minSliceRaw = (p.allowance * BigInt(row.minSliceBps)) / BigInt(10000);
  const minSlice = minSliceRaw < cap.remaining ? minSliceRaw : cap.remaining;
  const ladder = await quoteLadder(d.token, d.fee, cap.remaining, state, 8);
  if (!ladder.some((q) => q.amountIn === minSlice)) {
    ladder.push(await quoteSell(d.token, d.fee, minSlice, state));
  }
  const bounds = computeBounds(ladder, cap.remaining, maxImpactBps, minSlice);
  const nowSec = Math.floor(Date.now() / 1000);
  const facts: Facts = {
    // The test token's fixed symbol stays out of holder-facing reasons.
    symbol: row.symbol === "VDEMO" ? "tokens" : row.symbol,
    capPerDay: fmt(p.allowance),
    soldToday: fmt(cap.spentThisPeriod),
    remainingToday: fmt(cap.remaining),
    hoursUntilReset: Math.max(0, Math.round(((cap.periodEnd - nowSec) / 3600) * 10) / 10),
    poolTokenReserve: fmt(state.tokenReserve),
    poolEthReserve: formatEther(state.wethReserve),
    maxImpactPct: maxImpactBps / 100,
    maxSafeSlice: bounds.maxSlice ? fmt(bounds.maxSlice.amountIn) : "0",
    maxSafeSliceImpactPct: bounds.maxSlice ? bounds.maxSlice.impactBps / 100 : 0,
    recentSwaps: await recentSwaps(d.pool, state.wethIsToken0, d.seller, fmt),
  };

  if (!bounds.maxSlice) {
    const s = bounds.smallest;
    const reason = s
      ? `Pool too thin: even ${fmt(s.amountIn)} ${facts.symbol} would move price ${(s.impactBps / 100).toFixed(2)}%, above the ${facts.maxImpactPct}% limit.`
      : "The pool could not price a sale, so the agent waited.";
    return { ...base, action: "WAIT", reason, source: "rule", amountIn: null, ethOut: null, impactBps: s?.impactBps ?? null, facts };
  }

  const choice = await decide(facts);
  if (choice.action === "WAIT") {
    return { ...base, action: "WAIT", reason: choice.reason, source: choice.source, amountIn: null, ethOut: null, impactBps: bounds.maxSlice.impactBps, facts };
  }

  const sliced = sliceAmount(bounds.maxSlice.amountIn, choice.fraction);
  const amount = sliced < minSlice ? minSlice : sliced;
  const q = await quoteSell(d.token, d.fee, amount, state);
  const minOut = priceFloor(q.ethOut, opts.slippageBps ?? 50);

  const wc = operatorClient();
  const args = [p, sig, !cap.approved, amount, minOut, d.fee] as const;

  await publicClient.simulateContract({ address: d.seller, abi: SELLER_ABI, functionName: "sell", args, account: wc.account });
  const sellBase = { ...base, action: "SELL" as const, reason: choice.reason, source: choice.source, amountIn: amount.toString(), ethOut: q.ethOut.toString(), impactBps: q.impactBps, facts };
  if (!opts.send) return sellBase;

  const gas = await publicClient.getBalance({ address: wc.account.address });
  if (gas < LIMITS.gasFloorWei) {
    return { ...sellBase, action: "SKIP" as const, reason: "The agent's gas wallet is below its safety floor, so it did not send. Sales resume when it is topped up.", source: "rule" as const, amountIn: null, ethOut: null, impactBps: null, quiet: true };
  }
  const txHash = await wc.writeContract({ address: d.seller, abi: SELLER_ABI, functionName: "sell", args });
  const r = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const sold = r.status === "success" ? parseEventLogs({ abi: SELLER_ABI, logs: r.logs, eventName: "Sold" })[0] : undefined;
  return { ...sellBase, ethOut: sold ? sold.args.ethOut.toString() : sellBase.ethOut, txHash, txStatus: r.status };
}
