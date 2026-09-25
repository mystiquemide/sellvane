/**
 * Money-loop proof on Base mainnet.
 *
 *   npm run proof                    (dry run: builds permission, reads cap + pool, simulates)
 *   SEND=1 STEP=sell npm run proof   (one real capped sell under the impact limit)
 *   SEND=1 STEP=overcap npm run proof (one real sell above the remaining cap, recorded as a revert)
 *
 * The team's permission is created once and stored in .env.local as PERMISSION_JSON.
 */
import { decodeErrorResult, formatEther, formatUnits, parseEventLogs, parseUnits, type Hex } from "viem";
import { deployment } from "../src/lib/chain/config";
import { operatorClient, publicClient } from "../src/lib/chain/clients";
import { MANAGER_ERRORS_ABI, SELLER_ABI } from "../src/lib/chain/abis";
import { buildPermission, fromJson, permissionHash, readCapStatus, signPermission, toJson } from "../src/lib/chain/permission";
import { quoteLadder, readPool } from "../src/lib/chain/pool";
import { must, setEnv } from "./env";

const SEND = process.env.SEND === "1";
const STEP = process.env.STEP ?? "sell";
const DAILY_CAP = parseUnits(process.env.DAILY_CAP ?? "5000000", 18);
const MAX_IMPACT_BPS = Number(process.env.MAX_IMPACT_BPS ?? 100);
const SLIPPAGE_BPS = BigInt(50);

async function main() {
  const d = deployment();
  const ownerPk = must("TEAM_OWNER_PRIVATE_KEY") as Hex;

  let p;
  if (process.env.PERMISSION_JSON) {
    p = fromJson(JSON.parse(process.env.PERMISSION_JSON));
  } else {
    const block = await publicClient.getBlock();
    p = buildPermission({ account: d.team, seller: d.seller, token: d.token, dailyCap: DAILY_CAP, start: Number(block.timestamp) - 600, salt: BigInt(1) });
    setEnv("PERMISSION_JSON", JSON.stringify(toJson(p)));
  }
  const sig = await signPermission(p, ownerPk);
  const cap = await readCapStatus(p);
  console.log("permission :", permissionHash(p));
  console.log("cap/day    :", formatUnits(p.allowance, 18), "VDEMO");
  console.log("approved   :", cap.approved, "| spent this period:", formatUnits(cap.spentThisPeriod, 18), "| remaining:", formatUnits(cap.remaining, 18));

  const state = await readPool(d.pool, d.token);
  const ladder = await quoteLadder(d.token, d.fee, cap.remaining, state, 10);
  for (const q of ladder) console.log(`  quote ${formatUnits(q.amountIn, 18).padStart(12)} VDEMO -> ${formatEther(q.ethOut)} ETH, impact ${(q.impactBps / 100).toFixed(2)}%`);

  let amount: bigint;
  let minOut: bigint;
  if (STEP === "overcap") {
    amount = cap.remaining + parseUnits("1", 18);
    minOut = BigInt(1);
    console.log("overcap    :", formatUnits(amount, 18), "VDEMO (remaining is", formatUnits(cap.remaining, 18) + ")");
  } else {
    const ok = ladder.filter((q) => q.impactBps <= MAX_IMPACT_BPS);
    if (ok.length === 0) {
      console.log(`WAIT: no size within ${MAX_IMPACT_BPS / 100}% impact.`);
      return;
    }
    const best = ok[ok.length - 1];
    amount = best.amountIn;
    minOut = (best.ethOut * (BigInt(10000) - SLIPPAGE_BPS)) / BigInt(10000);
    console.log("sell       :", formatUnits(amount, 18), "VDEMO, floor", formatEther(minOut), "ETH");
  }

  const wc = operatorClient();
  const args = [p, sig, !cap.approved, amount, minOut, d.fee] as const;

  if (!SEND) {
    try {
      await publicClient.simulateContract({ address: d.seller, abi: SELLER_ABI, functionName: "sell", args, account: wc.account });
      console.log("simulation : OK");
    } catch (e) {
      console.log("simulation : REVERT", (e as Error).message.split("\n")[0]);
    }
    console.log("\nDry run. SEND=1 to broadcast.");
    return;
  }

  const teamEthBefore = await publicClient.getBalance({ address: d.team });
  // Over-cap: pass explicit gas so viem does not refuse to broadcast a tx it knows will revert.
  const hash = await wc.writeContract({
    address: d.seller, abi: SELLER_ABI, functionName: "sell", args,
    ...(STEP === "overcap" ? { gas: BigInt(400000) } : {}),
  });
  const r = await publicClient.waitForTransactionReceipt({ hash });
  console.log("tx         :", hash, r.status);

  if (r.status === "success") {
    const [sold] = parseEventLogs({ abi: SELLER_ABI, logs: r.logs, eventName: "Sold" });
    console.log("Sold       :", formatUnits(sold.args.amountIn, 18), "VDEMO ->", formatEther(sold.args.ethOut), "ETH to", sold.args.account);
    let after = teamEthBefore;
    for (let i = 0; i < 10 && after === teamEthBefore; i++) {
      await new Promise((res) => setTimeout(res, 1500));
      after = await publicClient.getBalance({ address: d.team });
    }
    console.log("team ETH + :", formatEther(after - teamEthBefore));
  } else {
    // Replay the call at the failing block to decode the revert reason.
    try {
      await publicClient.call({ to: d.seller, data: (await publicClient.getTransaction({ hash })).input, account: wc.account.address, blockNumber: r.blockNumber - BigInt(1) });
    } catch (e) {
      const data = (e as { walk?: (f: (x: unknown) => boolean) => { data?: Hex } }).walk?.((x) => typeof (x as { data?: unknown }).data === "string")?.data;
      if (data) {
        try {
          console.log("revert     :", decodeErrorResult({ abi: MANAGER_ERRORS_ABI, data }).errorName);
        } catch {
          console.log("revert data:", data);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
