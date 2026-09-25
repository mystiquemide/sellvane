import { getAddress, parseEventLogs, type Address, type Hex } from "viem";
import { MANAGER } from "./chain/config";
import { publicClient, withRetry } from "./chain/clients";
import { ERC20_ABI, MANAGER_ABI, SELLER_ABI } from "./chain/abis";
import { fromJson, permissionHash, readCapStatus, toJson, type SpendPermission } from "./chain/permission";
import { sql } from "./store/db";
import type { TokenRow } from "./registry";
import { readPool } from "./chain/pool";

// mainnet.base.org caps eth_getLogs at a 2,000 block range.
const CHUNK = BigInt(2000);

async function logsInChunks<T>(from: bigint, to: bigint, fetch: (a: bigint, b: bigint) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let a = from; a <= to; a += CHUNK) {
    const b = a + CHUNK - BigInt(1) < to ? a + CHUNK - BigInt(1) : to;
    out.push(...(await withRetry(() => fetch(a, b))));
  }
  return out;
}

export type PermissionView = {
  hash: Hex;
  allowance: string;
  spentThisPeriod: string;
  remaining: string;
  periodEnd: number;
  revoked: boolean;
  approved: boolean;
};

export type OutgoingMove = {
  txHash: Hex;
  blockNumber: string;
  to: Address;
  amount: string;
  capped: boolean;
};

/**
 * Every spend permission the team account has approved for this token (WIN-PLAN L2).
 * Holders see the true total cap, not just the one Sellvane uses.
 */
export async function teamPermissions(team: Address, token: Address, fromBlock: bigint, toBlock: bigint): Promise<SpendPermission[]> {
  const logs = await logsInChunks(fromBlock, toBlock, (a, b) =>
    publicClient.getContractEvents({ address: MANAGER, abi: MANAGER_ABI, eventName: "SpendPermissionApproved", fromBlock: a, toBlock: b }),
  );
  const seen = new Map<string, SpendPermission>();
  for (const l of logs) {
    const sp = l.args.spendPermission;
    if (!sp || getAddress(sp.account) !== team || getAddress(sp.token) !== token) continue;
    const p: SpendPermission = { ...sp, period: Number(sp.period), start: Number(sp.start), end: Number(sp.end) };
    seen.set(permissionHash(p), p);
  }
  return [...seen.values()];
}

/**
 * Every token transfer out of the team account (WIN-PLAN L1). A move is "capped" only if the
 * same transaction contains a Sold event from SellvaneSeller for this account. Anything else
 * left outside the cap and is flagged.
 */
export async function outgoingMoves(team: Address, token: Address, seller: Address, fromBlock: bigint, toBlock: bigint): Promise<OutgoingMove[]> {
  const transfers = await logsInChunks(fromBlock, toBlock, (a, b) =>
    publicClient.getContractEvents({ address: token, abi: ERC20_ABI, eventName: "Transfer", args: { from: team }, fromBlock: a, toBlock: b }),
  );
  const moves: OutgoingMove[] = [];
  for (const t of transfers) {
    const receipt = await withRetry(() => publicClient.getTransactionReceipt({ hash: t.transactionHash }));
    const sold = parseEventLogs({ abi: SELLER_ABI, logs: receipt.logs.filter((l) => getAddress(l.address) === seller), eventName: "Sold" });
    const capped = sold.some((s) => getAddress(s.args.account) === team);
    moves.push({ txHash: t.transactionHash, blockNumber: t.blockNumber.toString(), to: t.args.to!, amount: t.args.value!.toString(), capped });
  }
  return moves;
}

type ScanPayload = { perms: ReturnType<typeof toJson>[]; moves: OutgoingMove[] };

/**
 * Permissions and outgoing moves since the token was created, scanned incrementally: progress is
 * saved in the database so each request only reads blocks it has not seen before.
 */
async function scanTeam(team: Address, token: Address, seller: Address, deployBlock: bigint, toBlock: bigint) {
  const key = `${team}:${token}`.toLowerCase();
  const [row] = await sql()`select to_block, payload from scan_cache where key = ${key}`;
  const prev: ScanPayload = row ? (row.payload as ScanPayload) : { perms: [], moves: [] };
  const start = row ? BigInt(row.to_block) + BigInt(1) : deployBlock;

  let perms = prev.perms.map(fromJson);
  let moves = prev.moves;
  if (start <= toBlock) {
    const [newPerms, newMoves] = await Promise.all([
      teamPermissions(team, token, start, toBlock),
      outgoingMoves(team, token, seller, start, toBlock),
    ]);
    const byHash = new Map(perms.map((x) => [permissionHash(x), x]));
    for (const x of newPerms) byHash.set(permissionHash(x), x);
    perms = [...byHash.values()];
    const byTx = new Map(moves.map((m) => [m.txHash, m]));
    for (const m of newMoves) byTx.set(m.txHash, m);
    moves = [...byTx.values()].sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)));
    const payload: ScanPayload = { perms: perms.map(toJson), moves };
    await sql()`
      insert into scan_cache (key, to_block, payload) values (${key}, ${toBlock.toString()}, ${sql().json(payload)})
      on conflict (key) do update set to_block = excluded.to_block, payload = excluded.payload, updated_at = now()`;
  }
  // Report the furthest block actually scanned. It can be a few blocks past `toBlock` when an
  // earlier request read from an RPC node that was slightly ahead.
  const scannedTo = row && BigInt(row.to_block) > toBlock ? BigInt(row.to_block) : toBlock;
  return { perms, moves, scannedTo };
}

/** Everything a token's live page needs, read from chain for one registered token. */
export async function tokenSnapshot(row: TokenRow) {
  const seller = getAddress(process.env.SELLER_ADDRESS!);
  const p = row.permission;
  const fromBlock = BigInt(row.deployBlock);
  const toBlock = await publicClient.getBlockNumber();
  const [supply, teamBalance, pool, scanned] = await Promise.all([
    publicClient.readContract({ address: row.token, abi: ERC20_ABI, functionName: "totalSupply" }),
    publicClient.readContract({ address: row.token, abi: ERC20_ABI, functionName: "balanceOf", args: [row.teamAccount] }),
    readPool(row.pool, row.token, row.decimals),
    scanTeam(row.teamAccount, row.token, seller, fromBlock, toBlock),
  ]);
  const { perms, moves, scannedTo } = scanned;
  if (!perms.some((x) => permissionHash(x) === permissionHash(p))) perms.push(p);
  const permissions: PermissionView[] = await Promise.all(
    perms.map(async (x) => {
      const s = await readCapStatus(x);
      return {
        hash: permissionHash(x),
        allowance: x.allowance.toString(),
        spentThisPeriod: s.spentThisPeriod.toString(),
        remaining: s.remaining.toString(),
        periodEnd: s.periodEnd,
        revoked: s.revoked,
        approved: s.approved,
      };
    }),
  );
  const active = permissions.filter((x) => x.approved && !x.revoked);
  const sum = (k: "allowance" | "spentThisPeriod" | "remaining") => active.reduce((acc, x) => acc + BigInt(x[k]), BigInt(0)).toString();
  return {
    slug: row.slug,
    readAt: new Date().toISOString(),
    block: scannedTo.toString(),
    token: { address: row.token, symbol: row.symbol, name: row.name, decimals: row.decimals, totalSupply: supply.toString() },
    team: { address: row.teamAccount, balance: teamBalance.toString() },
    seller,
    pool: {
      address: row.pool,
      fee: row.poolFee,
      wethReserve: pool.wethReserve.toString(),
      tokenReserve: pool.tokenReserve.toString(),
      midWeiPerToken: pool.midWeiPerToken.toString(),
    },
    cap: {
      activePermissions: active.length,
      allowance: sum("allowance"),
      spentThisPeriod: sum("spentThisPeriod"),
      remaining: sum("remaining"),
      periodEnd: active.length ? Math.min(...active.map((x) => x.periodEnd)) : null,
    },
    permissions,
    // Block range the bypass check covered, so a zero has a stated scope.
    scan: { fromBlock: fromBlock.toString(), toBlock: scannedTo.toString() },
    uncappedMoves: moves.filter((m) => !m.capped),
    cappedMoves: moves.filter((m) => m.capped).length,
    sellvanePermission: permissionHash(p),
  };
}

export type TokenSnapshot = Awaited<ReturnType<typeof tokenSnapshot>>;
