/**
 * Run one agent tick for a registered token against Base mainnet.
 *   npm run tick                  (dry run for the featured test token)
 *   TOKEN=0x... npm run tick      (dry run for another registered token)
 *   SEND=1 npm run tick           (broadcasts a SELL if the agent chooses one)
 */
import { formatEther, formatUnits, type Hex } from "viem";
import { getToken } from "../src/lib/registry";
import { sql } from "../src/lib/store/db";
import { tick } from "../src/lib/agent/tick";
import { must } from "./env";

async function main() {
  const row = await getToken(process.env.TOKEN ?? must("TOKEN_ADDRESS"));
  if (!row) throw new Error("Token is not registered.");
  const own = row.teamAccount.toLowerCase() === (process.env.TEAM_ACCOUNT_ADDRESS ?? "").toLowerCase();
  const r = await tick(row, { ownerPk: own ? (must("TEAM_OWNER_PRIVATE_KEY") as Hex) : undefined, send: process.env.SEND === "1" });
  console.log("token :", row.symbol, row.slug);
  console.log("action:", r.action, `(${r.source})`);
  console.log("reason:", r.reason);
  if (r.amountIn) console.log("amount:", formatUnits(BigInt(r.amountIn), row.decimals), "->", formatEther(BigInt(r.ethOut!)), "ETH, impact", (r.impactBps! / 100).toFixed(2) + "%");
  if (r.txHash) console.log("tx    :", r.txHash, r.txStatus);
  await sql().end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
