import { getAddress, type Address } from "viem";
import { QUOTER, WETH } from "./config";
import { POOL_ABI, QUOTER_ABI } from "./abis";
import { publicClient, withRetry } from "./clients";

const Q192 = BigInt(1) << BigInt(192);
const BPS = BigInt(10000);

export type PoolState = {
  pool: Address;
  wethIsToken0: boolean;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  /** ETH received per whole token (10^decimals units) at the mid price, in wei. */
  midWeiPerToken: bigint;
  decimals: number;
  wethReserve: bigint;
  tokenReserve: bigint;
};

const ERC20_BAL = [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }] as const;

export async function readPool(pool: Address, token: Address, decimals = 18): Promise<PoolState> {
  const [slot0, liquidity, token0, wethReserve, tokenReserve] = await withRetry(() =>
    Promise.all([
      publicClient.readContract({ address: pool, abi: POOL_ABI, functionName: "slot0" }),
      publicClient.readContract({ address: pool, abi: POOL_ABI, functionName: "liquidity" }),
      publicClient.readContract({ address: pool, abi: POOL_ABI, functionName: "token0" }),
      publicClient.readContract({ address: WETH, abi: ERC20_BAL, functionName: "balanceOf", args: [pool] }),
      publicClient.readContract({ address: token, abi: ERC20_BAL, functionName: "balanceOf", args: [pool] }),
    ]),
  );
  const sqrtPriceX96 = slot0[0];
  const wethIsToken0 = getAddress(token0) === getAddress(WETH);
  const p = sqrtPriceX96 * sqrtPriceX96; // price(token1 per token0) * 2^192
  const one = BigInt(10) ** BigInt(decimals);
  // WETH per token: if WETH is token0, price = token/WETH, so invert.
  const midWeiPerToken = wethIsToken0 ? (one * Q192) / p : (one * p) / Q192;
  return { pool, wethIsToken0, sqrtPriceX96, liquidity, midWeiPerToken, wethReserve, tokenReserve, decimals };
}

export type Quote = {
  amountIn: bigint;
  ethOut: bigint;
  /** Price impact in basis points, excluding the pool's LP fee. */
  impactBps: number;
};

/** Quote selling `amountIn` token for WETH and compute price impact vs the mid price. */
export async function quoteSell(token: Address, fee: number, amountIn: bigint, state: PoolState): Promise<Quote> {
  const { result } = await withRetry(() =>
    publicClient.simulateContract({
      address: QUOTER,
      abi: QUOTER_ABI,
      functionName: "quoteExactInputSingle",
      args: [{ tokenIn: token, tokenOut: WETH, amountIn, fee, sqrtPriceLimitX96: BigInt(0) }],
    }),
  );
  const ethOut = result[0];
  const one = BigInt(10) ** BigInt(state.decimals);
  const ideal = (amountIn * state.midWeiPerToken) / one;
  const idealAfterFee = (ideal * (BigInt(1_000_000) - BigInt(fee))) / BigInt(1_000_000);
  const impactBps = idealAfterFee === BigInt(0) ? 10000 : Number(((idealAfterFee - ethOut) * BPS) / idealAfterFee);
  return { amountIn, ethOut, impactBps: Math.max(0, impactBps) };
}

/** Quote a geometric ladder of sell sizes up to `max`. Sizes that fail to quote are skipped. */
export async function quoteLadder(token: Address, fee: number, max: bigint, state: PoolState, steps = 8): Promise<Quote[]> {
  if (max <= BigInt(0)) return [];
  const sizes: bigint[] = [];
  for (let i = steps - 1; i >= 0; i--) sizes.push(max / (BigInt(1) << BigInt(i)));
  const unique = [...new Set(sizes.filter((s) => s > BigInt(0)).map((s) => s.toString()))].map(BigInt);
  const quotes: Quote[] = [];
  for (const s of unique) {
    try {
      quotes.push(await quoteSell(token, fee, s, state));
    } catch {
      // A size the pool cannot fill is simply not a candidate.
    }
  }
  return quotes;
}
