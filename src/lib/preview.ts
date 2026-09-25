import type { Address } from "viem";
import { quoteLadder, readPool } from "./chain/pool";
import { computeBounds } from "./agent/bounds";

/**
 * Largest single sale the pool takes right now within an impact limit, using the same quote
 * ladder the agent uses. Shared by the /start preview and the Telegram bot.
 */
export async function previewMaxSale(token: Address, pool: Address, fee: number, decimals: number, impactBps: number) {
  const state = await readPool(pool, token, decimals);
  // Ladder up to a fifth of the tokens in the pool: past that, impact is far over any sane limit.
  const max = state.tokenReserve / BigInt(5);
  const ladder = await quoteLadder(token, fee, max, state, 12);
  const b = computeBounds(ladder, max, impactBps);
  return {
    maxSale: b.maxSlice ? { amountIn: b.maxSlice.amountIn, ethOut: b.maxSlice.ethOut, impactBps: b.maxSlice.impactBps } : null,
    smallest: b.smallest ? { amountIn: b.smallest.amountIn, impactBps: b.smallest.impactBps } : null,
  };
}
