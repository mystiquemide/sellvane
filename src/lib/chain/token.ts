import { getAddress, isAddress, type Address } from "viem";
import { WETH } from "./config";
import { ERC20_ABI } from "./abis";
import { publicClient, withRetry } from "./clients";

export const UNISWAP_V3_FACTORY: Address = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
const FEE_TIERS = [100, 500, 3000, 10000] as const;

const FACTORY_ABI = [
  { name: "getPool", type: "function", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }, { type: "uint24" }], outputs: [{ type: "address" }] },
] as const;
const META_ABI = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

export class TokenCheckError extends Error {
  constructor(
    public code: "not_address" | "not_erc20" | "no_pool",
    message: string,
  ) {
    super(message);
  }
}

export type TokenInfo = { token: Address; name: string; symbol: string; decimals: number; totalSupply: bigint };

/** Read ERC-20 metadata. Anything that does not answer like an ERC-20 is rejected. */
export async function readTokenInfo(input: string): Promise<TokenInfo> {
  if (!isAddress(input)) throw new TokenCheckError("not_address", "That is not a valid address.");
  const token = getAddress(input);
  try {
    const [name, symbol, decimals, totalSupply] = await withRetry(() =>
      Promise.all([
        publicClient.readContract({ address: token, abi: META_ABI, functionName: "name" }),
        publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "symbol" }),
        publicClient.readContract({ address: token, abi: META_ABI, functionName: "decimals" }),
        publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "totalSupply" }),
      ]),
    );
    return { token, name, symbol, decimals: Number(decimals), totalSupply };
  } catch {
    throw new TokenCheckError("not_erc20", "This address is not an ERC-20 token on Base.");
  }
}

export type PoolInfo = { pool: Address; fee: number; wethReserve: bigint };

/** The Uniswap v3 WETH pool with the most ETH in it, across all fee tiers. */
export async function findWethPool(token: Address): Promise<PoolInfo> {
  const found: PoolInfo[] = [];
  for (const fee of FEE_TIERS) {
    const pool = await withRetry(() => publicClient.readContract({ address: UNISWAP_V3_FACTORY, abi: FACTORY_ABI, functionName: "getPool", args: [token, WETH, fee] }));
    if (pool === "0x0000000000000000000000000000000000000000") continue;
    const wethReserve = await withRetry(() => publicClient.readContract({ address: WETH, abi: ERC20_ABI, functionName: "balanceOf", args: [pool] }));
    found.push({ pool: getAddress(pool), fee, wethReserve });
  }
  const best = found.sort((a, b) => (b.wethReserve > a.wethReserve ? 1 : b.wethReserve < a.wethReserve ? -1 : 0))[0];
  if (!best || best.wethReserve === BigInt(0)) {
    throw new TokenCheckError("no_pool", "No Uniswap v3 pool paired with WETH on Base holds any ETH. Aerodrome and Uniswap v4 pools are not supported yet. If your token only trades there, Sellvane cannot cap it yet.");
  }
  return best;
}

export async function tokenBalance(token: Address, account: Address): Promise<bigint> {
  return withRetry(() => publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [account] }));
}
