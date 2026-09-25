import { getAddress, type Address } from "viem";

export const CHAIN_ID = 8453;
export const MANAGER: Address = "0xf85210B21cC50302F477BA56686d2019dC9b67Ad";
export const QUOTER: Address = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a";
export const WETH: Address = "0x4200000000000000000000000000000000000006";

export const RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

/** Read RPCs, tried in order. Public endpoints rate-limit, so reads fall back across several. */
export const READ_RPC_URLS = [
  RPC_URL,
  "https://base-rpc.publicnode.com",
  "https://base.drpc.org",
  "https://1rpc.io/base",
  "https://base.meowrpc.com",
].filter((u, i, a) => a.indexOf(u) === i);
export const BASESCAN = "https://basescan.org";

function addr(name: string): Address {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return getAddress(v);
}

/** The deployment this instance serves. Read lazily so importing never throws. */
export function deployment() {
  return {
    token: addr("TOKEN_ADDRESS"),
    pool: addr("POOL_ADDRESS"),
    seller: addr("SELLER_ADDRESS"),
    team: addr("TEAM_ACCOUNT_ADDRESS"),
    fee: Number(process.env.POOL_FEE ?? 10000),
  };
}
