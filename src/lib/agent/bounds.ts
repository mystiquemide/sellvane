import type { Quote } from "../chain/pool";

export type Bounds = {
  /** Largest quoted size within the impact limit and the remaining cap, or null if none. */
  maxSlice: Quote | null;
  /** Smallest quoted size and its impact, used to explain a WAIT. */
  smallest: Quote | null;
  maxImpactBps: number;
  remaining: bigint;
};

/**
 * Deterministic limits the agent can never exceed. The model only chooses inside these.
 * A size qualifies if it is within the remaining cap and its quoted impact is at or below
 * the team's max impact.
 */
export function computeBounds(ladder: Quote[], remaining: bigint, maxImpactBps: number, minSlice: bigint = BigInt(1)): Bounds {
  // Sizes below minSlice are not worth the gas and never count as a candidate.
  const sorted = [...ladder]
    .filter((q) => q.amountIn >= minSlice)
    .sort((a, b) => (a.amountIn < b.amountIn ? -1 : a.amountIn > b.amountIn ? 1 : 0));
  const ok = sorted.filter((q) => q.amountIn <= remaining && q.impactBps <= maxImpactBps);
  return {
    maxSlice: ok.length ? ok[ok.length - 1] : null,
    smallest: sorted[0] ?? null,
    maxImpactBps,
    remaining,
  };
}

export const FRACTIONS = [0.25, 0.5, 0.75, 1] as const;
export type Fraction = (typeof FRACTIONS)[number];

/** Apply the model's fraction to the bound. Anything unexpected snaps down to a safe value. */
export function sliceAmount(maxSlice: bigint, fraction: number): bigint {
  const f = FRACTIONS.filter((x) => x <= fraction).pop() ?? FRACTIONS[0];
  return (maxSlice * BigInt(Math.round(f * 100))) / BigInt(100);
}

/** Price floor sent on chain: quoted output minus slippage tolerance. */
export function priceFloor(ethOut: bigint, slippageBps: number): bigint {
  const floor = (ethOut * BigInt(10000 - slippageBps)) / BigInt(10000);
  return floor > BigInt(0) ? floor : BigInt(1);
}
