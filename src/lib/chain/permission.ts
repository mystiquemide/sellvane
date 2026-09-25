import { getAddress, hashTypedData, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { toCoinbaseSmartAccount } from "viem/account-abstraction";
import { CHAIN_ID, MANAGER } from "./config";
import { MANAGER_ABI } from "./abis";
import { publicClient, withRetry } from "./clients";

export type SpendPermission = {
  account: Address;
  spender: Address;
  token: Address;
  allowance: bigint;
  period: number;
  start: number;
  end: number;
  salt: bigint;
  extraData: Hex;
};

export const MAX_UINT48 = 281474976710655;
export const ONE_DAY = 86400;

/** Build a daily-cap permission naming the seller as spender. */
export function buildPermission(args: {
  account: Address;
  seller: Address;
  token: Address;
  dailyCap: bigint;
  start: number;
  salt?: bigint;
}): SpendPermission {
  return {
    account: getAddress(args.account),
    spender: getAddress(args.seller),
    token: getAddress(args.token),
    allowance: args.dailyCap,
    period: ONE_DAY,
    start: args.start,
    end: MAX_UINT48,
    salt: args.salt ?? BigInt(0),
    extraData: "0x",
  };
}

/** EIP-712 hash exactly as SpendPermissionManager.getHash computes it. */
export function permissionHash(p: SpendPermission): Hex {
  return hashTypedData({
    domain: { name: "Spend Permission Manager", version: "1", chainId: CHAIN_ID, verifyingContract: MANAGER },
    types: {
      SpendPermission: [
        { name: "account", type: "address" },
        { name: "spender", type: "address" },
        { name: "token", type: "address" },
        { name: "allowance", type: "uint160" },
        { name: "period", type: "uint48" },
        { name: "start", type: "uint48" },
        { name: "end", type: "uint48" },
        { name: "salt", type: "uint256" },
        { name: "extraData", type: "bytes" },
      ],
    },
    primaryType: "SpendPermission",
    message: p,
  });
}

/** Team owner signs the permission through its Coinbase Smart Wallet (ERC-1271 wrapped). */
export async function signPermission(p: SpendPermission, ownerPk: Hex): Promise<Hex> {
  const owner = privateKeyToAccount(ownerPk);
  const smart = await toCoinbaseSmartAccount({ client: publicClient, owners: [owner], version: "1.1" });
  if (getAddress(smart.address) !== getAddress(p.account)) throw new Error("owner key does not control permission account");
  return smart.sign({ hash: permissionHash(p) });
}

export type CapStatus = {
  approved: boolean;
  revoked: boolean;
  allowance: bigint;
  spentThisPeriod: bigint;
  remaining: bigint;
  periodStart: number;
  periodEnd: number;
};

/** Read the on-chain cap state. Throws if the chain cannot be read (fail closed). */
export async function readCapStatus(p: SpendPermission): Promise<CapStatus> {
  const [approved, revoked, period] = await withRetry(() =>
    Promise.all([
      publicClient.readContract({ address: MANAGER, abi: MANAGER_ABI, functionName: "isApproved", args: [p] }),
      publicClient.readContract({ address: MANAGER, abi: MANAGER_ABI, functionName: "isRevoked", args: [p] }),
      publicClient.readContract({ address: MANAGER, abi: MANAGER_ABI, functionName: "getCurrentPeriod", args: [p] }),
    ]),
  );
  const spent = approved ? period.spend : BigInt(0);
  return {
    approved,
    revoked,
    allowance: p.allowance,
    spentThisPeriod: spent,
    remaining: revoked ? BigInt(0) : p.allowance - spent,
    periodStart: Number(period.start),
    periodEnd: Number(period.end),
  };
}

/** Serialize for storage/JSON (bigints as strings). */
export function toJson(p: SpendPermission) {
  return { ...p, allowance: p.allowance.toString(), salt: p.salt.toString() };
}

export function fromJson(j: ReturnType<typeof toJson>): SpendPermission {
  return { ...j, allowance: BigInt(j.allowance), salt: BigInt(j.salt) };
}
