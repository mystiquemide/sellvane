/** Record the pre-API proof transactions in the decision log, read back from chain. */
import { parseEventLogs, parseUnits, type Hex } from "viem";
import { publicClient } from "../src/lib/chain/clients";
import { SELLER_ABI } from "../src/lib/chain/abis";
import { fromJson, permissionHash } from "../src/lib/chain/permission";
import { insertDecision, sql } from "../src/lib/store/db";
import { must } from "./env";

const ROWS: { tx: Hex; action: "SELL" | "BLOCKED"; source: "model" | "manual"; remainingBefore: string; reason: string; impactBps: number | null }[] = [
  { tx: "0xa60621e8ff3078993a02ca0bedaac8cac73941fcdfc14a28b1cf431243b83045", action: "SELL", source: "manual", remainingBefore: "5000000", impactBps: 51, reason: "First sell: largest size under the 1% impact limit (0.51%)." },
  { tx: "0x71330b751a7e3c334700a5799f03194073396c23acdd1d42f81ac6734d0f7789", action: "SELL", source: "model", remainingBefore: "4687500", impactBps: 72, reason: "Net buying pressure, selling 0.75 of the max safe slice supports liquidity without hurting holders." },
  { tx: "0xbe249cc824b778d0d740786eb7e0e6342449f9b897ed2145a4d8d500354e8f20", action: "BLOCKED", source: "manual", remainingBefore: "4687500", impactBps: null, reason: "Team tried to sell 4,687,501 VDEMO with 4,687,500 left today. The chain refused: ExceededSpendPermission." },
];

async function main() {
  const p = fromJson(JSON.parse(must("PERMISSION_JSON")));
  for (const row of ROWS) {
    const r = await publicClient.getTransactionReceipt({ hash: row.tx });
    const block = await publicClient.getBlock({ blockNumber: r.blockNumber });
    const sold = parseEventLogs({ abi: SELLER_ABI, logs: r.logs, eventName: "Sold" })[0];
    const attempted = row.action === "BLOCKED" ? parseUnits("4687501", 18).toString() : null;
    await insertDecision({
      at: new Date(Number(block.timestamp) * 1000).toISOString(),
      permissionHash: permissionHash(p),
      action: row.action,
      reason: row.reason,
      source: row.source,
      amountIn: sold ? sold.args.amountIn.toString() : attempted,
      ethOut: sold ? sold.args.ethOut.toString() : null,
      impactBps: row.impactBps,
      remainingBefore: parseUnits(row.remainingBefore, 18).toString(),
      txHash: row.tx,
      txStatus: r.status,
      facts: null,
    } as never);
    console.log(row.action, row.tx.slice(0, 10), r.status);
  }
  await sql().end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
