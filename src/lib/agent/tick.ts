import { formatEther, formatUnits, parseEventLogs, type Address, type Hex } from "viem";
import { deployment } from "../chain/config";
import { operatorClient, publicClient, withRetry } from "../chain/clients";
import { POOL_ABI, SELLER_ABI } from "../chain/abis";
import { permissionHash, readCapStatus, signPermission, type SpendPermission } from "../chain/permission";
import { quoteLadder, quoteSell, readPool } from "../chain/pool";
import { computeBounds, priceFloor, sliceAmount } from "./bounds";
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
};

const fmt = (v: bigint) => Number(formatUnits(v, 18)).toLocaleString("en-US", { maximumFractionDigits: 0 });

/** Count market buys and sells of the token in the last ~hour of blocks, excluding Sellvane's own sells. */
async function recentSwaps(pool: Address, wethIsToken0: boolean, seller: Address) {
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
export async function tick(p: SpendPermission, opts: { ownerPk: Hex; maxImpactBps: number; slippageBps?: number; send: boolean }): Promise<TickResult> {
  const d = deployment();
  const hash = permissionHash(p);
  const cap = await readCapStatus(p);
  const base = { at: new Date().toISOString(), permissionHash: hash, remainingBefore: cap.remaining.toString(), txHash: null, txStatus: null } as const;

  if (cap.revoked) return { ...base, action: "SKIP", reason: "Permission revoked by the team.", source: "rule", amountIn: null, ethOut: null, impactBps: null, facts: null };
  if (cap.remaining === BigInt(0)) {
    return { ...base, action: "SKIP", reason: "Daily cap reached. No more team sells until reset.", source: "rule", amountIn: null, ethOut: null, impactBps: null, facts: null };
  }

  const state = await readPool(d.pool, d.token);
  const ladder = await quoteLadder(d.token, d.fee, cap.remaining, state, 10);
  const bounds = computeBounds(ladder, cap.remaining, opts.maxImpactBps);
  const nowSec = Math.floor(Date.now() / 1000);
  const facts: Facts = {
    symbol: "VDEMO",
    capPerDay: fmt(p.allowance),
    soldToday: fmt(cap.spentThisPeriod),
    remainingToday: fmt(cap.remaining),
    hoursUntilReset: Math.max(0, Math.round(((cap.periodEnd - nowSec) / 3600) * 10) / 10),
    poolTokenReserve: fmt(state.tokenReserve),
    poolEthReserve: formatEther(state.wethReserve),
    maxImpactPct: opts.maxImpactBps / 100,
    maxSafeSlice: bounds.maxSlice ? fmt(bounds.maxSlice.amountIn) : "0",
    maxSafeSliceImpactPct: bounds.maxSlice ? bounds.maxSlice.impactBps / 100 : 0,
    recentSwaps: await recentSwaps(d.pool, state.wethIsToken0, d.seller),
  };

  if (!bounds.maxSlice) {
    const s = bounds.smallest;
    const reason = s
      ? `Pool too thin: even ${fmt(s.amountIn)} ${facts.symbol} would move price ${(s.impactBps / 100).toFixed(2)}%, above the ${facts.maxImpactPct}% limit.`
      : "Pool could not quote any sell size.";
    return { ...base, action: "WAIT", reason, source: "rule", amountIn: null, ethOut: null, impactBps: s?.impactBps ?? null, facts };
  }

  const choice = await decide(facts);
  if (choice.action === "WAIT") {
    return { ...base, action: "WAIT", reason: choice.reason, source: choice.source, amountIn: null, ethOut: null, impactBps: bounds.maxSlice.impactBps, facts };
  }

  const amount = sliceAmount(bounds.maxSlice.amountIn, choice.fraction);
  const q = await quoteSell(d.token, d.fee, amount, state);
  const minOut = priceFloor(q.ethOut, opts.slippageBps ?? 50);
  const sig = await signPermission(p, opts.ownerPk);
  const wc = operatorClient();
  const args = [p, sig, !cap.approved, amount, minOut, d.fee] as const;

  await publicClient.simulateContract({ address: d.seller, abi: SELLER_ABI, functionName: "sell", args, account: wc.account });
  const sellBase = { ...base, action: "SELL" as const, reason: choice.reason, source: choice.source, amountIn: amount.toString(), ethOut: q.ethOut.toString(), impactBps: q.impactBps, facts };
  if (!opts.send) return sellBase;

  const txHash = await wc.writeContract({ address: d.seller, abi: SELLER_ABI, functionName: "sell", args });
  const r = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const sold = r.status === "success" ? parseEventLogs({ abi: SELLER_ABI, logs: r.logs, eventName: "Sold" })[0] : undefined;
  return { ...sellBase, ethOut: sold ? sold.args.ethOut.toString() : sellBase.ethOut, txHash, txStatus: r.status };
}
