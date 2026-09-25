/**
 * Run one agent tick against Base mainnet.
 *   npm run tick          (dry run: real reads + real model decision + simulation, no broadcast)
 *   SEND=1 npm run tick   (broadcasts a SELL if the agent chooses one)
 */
import { formatEther, formatUnits, type Hex } from "viem";
import { fromJson } from "../src/lib/chain/permission";
import { tick } from "../src/lib/agent/tick";
import { must } from "./env";

async function main() {
  const p = fromJson(JSON.parse(must("PERMISSION_JSON")));
  const r = await tick(p, { ownerPk: must("TEAM_OWNER_PRIVATE_KEY") as Hex, maxImpactBps: Number(process.env.MAX_IMPACT_BPS ?? 100), send: process.env.SEND === "1" });
  console.log("facts :", JSON.stringify(r.facts));
  console.log("action:", r.action, `(${r.source})`);
  console.log("reason:", r.reason);
  if (r.amountIn) console.log("amount:", formatUnits(BigInt(r.amountIn), 18), "VDEMO -> ~", formatEther(BigInt(r.ethOut!)), "ETH, impact", (r.impactBps! / 100).toFixed(2) + "%");
  if (r.txHash) console.log("tx    :", r.txHash, r.txStatus);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
