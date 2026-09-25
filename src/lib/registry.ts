import { getAddress, type Address } from "viem";
import { MANAGER } from "./chain/config";
import { MANAGER_ABI } from "./chain/abis";
import { publicClient, withRetry } from "./chain/clients";
import { ONE_DAY, fromJson, permissionHash, toJson, type SpendPermission } from "./chain/permission";
import { findWethPool, readTokenInfo, tokenBalance } from "./chain/token";
import { sql } from "./store/db";

export type TokenRow = {
  slug: string;
  token: Address;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
  pool: Address;
  poolFee: number;
  teamAccount: Address;
  permission: SpendPermission;
  permissionHash: string;
  maxImpactBps: number;
  minSliceBps: number;
  deployBlock: string;
  status: "active" | "revoked" | "expired";
  createdAt: string;
};

export class RegistryError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function sellerAddress(): Address {
  const v = process.env.SELLER_ADDRESS;
  if (!v) throw new Error("Missing env SELLER_ADDRESS");
  return getAddress(v);
}

// Postgres returns snake_case; map to the shape the app uses.
function mapRow(r: Record<string, unknown>): TokenRow {
  return {
    slug: r.slug as string,
    token: getAddress(r.token as string),
    symbol: r.symbol as string,
    name: r.name as string,
    decimals: Number(r.decimals),
    totalSupply: String(r.total_supply),
    pool: getAddress(r.pool as string),
    poolFee: Number(r.pool_fee),
    teamAccount: getAddress(r.team_account as string),
    permission: fromJson(r.permission as ReturnType<typeof toJson>),
    permissionHash: r.permission_hash as string,
    maxImpactBps: Number(r.max_impact_bps),
    minSliceBps: Number(r.min_slice_bps),
    deployBlock: String(r.deploy_block),
    status: r.status as TokenRow["status"],
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function listTokens(onlyActive = true): Promise<TokenRow[]> {
  const rows = onlyActive
    ? await sql()`select * from tokens where status = 'active' order by created_at asc`
    : await sql()`select * from tokens order by created_at asc`;
  return rows.map(mapRow);
}

export async function getToken(slugOrAddress: string): Promise<TokenRow | null> {
  const key = slugOrAddress.toLowerCase();
  const [row] = await sql()`select * from tokens where slug = ${key} or lower(team_account) = ${key} order by created_at asc limit 1`;
  return row ? mapRow(row) : null;
}

/** Parse the permission the browser sent. Every field is re-checked on chain afterwards. */
export function parsePermission(raw: unknown): SpendPermission {
  const p = raw as Record<string, unknown>;
  try {
    return {
      account: getAddress(String(p.account)),
      spender: getAddress(String(p.spender)),
      token: getAddress(String(p.token)),
      allowance: BigInt(String(p.allowance)),
      period: Number(p.period),
      start: Number(p.start),
      end: Number(p.end),
      salt: BigInt(String(p.salt)),
      extraData: (String(p.extraData || "0x") as `0x${string}`),
    };
  } catch {
    throw new RegistryError(400, "The permission is not in the expected format.");
  }
}

/**
 * Register a capped token. Nothing from the browser is trusted: the permission must be approved
 * on chain, name the Sellvane seller as spender, be a daily period, and the account must hold the
 * token, which must have a Uniswap v3 WETH pool.
 */
export async function registerToken(p: SpendPermission, opts: { maxImpactBps?: number } = {}): Promise<TokenRow> {
  if (p.spender !== sellerAddress()) throw new RegistryError(400, "This permission does not name the Sellvane seller as spender.");
  if (p.period !== ONE_DAY) throw new RegistryError(400, "Sellvane caps are daily. The permission period must be one day.");
  if (p.allowance <= BigInt(0)) throw new RegistryError(400, "The daily cap must be above zero.");

  const info = await readTokenInfo(p.token).catch((e) => {
    throw new RegistryError(400, e.message);
  });
  const pool = await findWethPool(info.token).catch((e) => {
    throw new RegistryError(400, e.message);
  });

  // The consent screen approves on chain; public RPC nodes can lag a few seconds behind it.
  let approved = false;
  for (let i = 0; i < 8 && !approved; i++) {
    approved = await withRetry(() => publicClient.readContract({ address: MANAGER, abi: MANAGER_ABI, functionName: "isApproved", args: [p] }));
    if (!approved) await new Promise((r) => setTimeout(r, 1500));
  }
  if (!approved) throw new RegistryError(409, "This permission is not approved on Base yet. Sign it in your wallet, then try again.");
  const revoked = await withRetry(() => publicClient.readContract({ address: MANAGER, abi: MANAGER_ABI, functionName: "isRevoked", args: [p] }));
  if (revoked) throw new RegistryError(409, "This permission has been revoked.");

  const balance = await tokenBalance(info.token, p.account);
  if (balance === BigInt(0)) throw new RegistryError(400, "The signing account holds none of this token.");

  // One team account per token: a different account cannot take over an active cap.
  const existing = await getToken(info.token);
  if (existing && existing.status === "active" && existing.teamAccount !== p.account) {
    throw new RegistryError(409, `This token is already capped by team account ${existing.teamAccount}.`);
  }

  const impact = Math.min(500, Math.max(10, Math.round(opts.maxImpactBps ?? 100)));
  const block = await publicClient.getBlockNumber();
  const hash = permissionHash(p);
  const slug = info.token.toLowerCase();

  const [row] = await sql()`
    insert into tokens (slug, token, symbol, name, decimals, total_supply, pool, pool_fee, team_account, permission, permission_hash, max_impact_bps, deploy_block)
    values (${slug}, ${info.token}, ${info.symbol}, ${info.name}, ${info.decimals}, ${info.totalSupply.toString()}, ${pool.pool}, ${pool.fee},
            ${p.account}, ${sql().json(toJson(p))}, ${hash}, ${impact}, ${block.toString()})
    on conflict (slug) do update set
      team_account = excluded.team_account, permission = excluded.permission, permission_hash = excluded.permission_hash,
      max_impact_bps = excluded.max_impact_bps, pool = excluded.pool, pool_fee = excluded.pool_fee, status = 'active'
    returning *`;
  return mapRow(row);
}
