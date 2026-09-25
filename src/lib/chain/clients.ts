import { createPublicClient, createWalletClient, fallback, http, type Hex } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { READ_RPC_URLS, RPC_URL } from "./config";

export const publicClient = createPublicClient({
  chain: base,
  transport: fallback(READ_RPC_URLS.map((u) => http(u, { retryCount: 1, retryDelay: 300 }))),
});

export function operatorClient() {
  const pk = process.env.OPERATOR_PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("Missing env OPERATOR_PRIVATE_KEY");
  return createWalletClient({ account: privateKeyToAccount(pk), chain: base, transport: http(RPC_URL) });
}

/** Retry a read a few times. Public RPC nodes lag and occasionally fail multicalls. */
export async function withRetry<T>(fn: () => Promise<T>, tries = 5, delayMs = 800): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw last;
}
