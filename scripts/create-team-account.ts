/**
 * Create the team's Coinbase Smart Wallet (Base Account) and make the SpendPermissionManager
 * one of its owners, which spend() requires.
 *
 *   npm run team:create          (dry run: prints addresses and state)
 *   SEND=1 npm run team:create   (deploys + adds manager owner)
 *
 * Idempotent. The owner key is generated once into .env.local and never printed.
 */
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  getAddress,
  http,
  type Hex,
} from "viem";
import { base } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { toCoinbaseSmartAccount } from "viem/account-abstraction";
import { must, setEnv } from "./env";

const MANAGER = getAddress("0xf85210B21cC50302F477BA56686d2019dC9b67Ad");
const SEND = process.env.SEND === "1";

const OWNABLE_ABI = [
  { name: "isOwnerAddress", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "addOwnerAddress", type: "function", stateMutability: "nonpayable", inputs: [{ name: "owner", type: "address" }], outputs: [] },
] as const;

async function main() {
  const rpc = must("BASE_RPC_URL");
  const operator = privateKeyToAccount(must("OPERATOR_PRIVATE_KEY") as Hex);
  const publicClient = createPublicClient({ chain: base, transport: http(rpc) });
  const operatorClient = createWalletClient({ account: operator, chain: base, transport: http(rpc) });

  let ownerPk = process.env.TEAM_OWNER_PRIVATE_KEY as Hex | undefined;
  if (!ownerPk) {
    ownerPk = generatePrivateKey();
    setEnv("TEAM_OWNER_PRIVATE_KEY", ownerPk);
    console.log("Generated team owner key (written to .env.local, not printed).");
  }
  const owner = privateKeyToAccount(ownerPk);

  const smart = await toCoinbaseSmartAccount({ client: publicClient, owners: [owner], version: "1.1" });
  const account = getAddress(smart.address);
  setEnv("TEAM_ACCOUNT_ADDRESS", account);

  const code = await publicClient.getCode({ address: account });
  const deployed = !!code && code !== "0x";
  console.log("team owner EOA :", owner.address);
  console.log("team account   :", account);
  console.log("deployed       :", deployed);
  console.log("operator ETH   :", formatEther(await publicClient.getBalance({ address: operator.address })));

  if (!SEND) {
    console.log("\nDry run. Re-run with SEND=1 to deploy and add the manager as owner.");
    return;
  }

  if (!deployed) {
    const { factory, factoryData } = await smart.getFactoryArgs();
    if (!factory || !factoryData) throw new Error("No factory args");
    const hash = await operatorClient.sendTransaction({ to: factory, data: factoryData });
    const r = await publicClient.waitForTransactionReceipt({ hash });
    console.log("deploy tx      :", hash, r.status);
    if (r.status !== "success") throw new Error("deploy reverted");
  }

  let isOwner = false;
  for (let i = 0; i < 10; i++) {
    const v = await publicClient.readContract({ address: account, abi: OWNABLE_ABI, functionName: "isOwnerAddress", args: [MANAGER] }).catch(() => null);
    if (v !== null) { isOwner = v; break; }
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (isOwner) {
    console.log("manager owner  : already true");
    return;
  }

  // The owner EOA must send addOwnerAddress itself. Give it just enough gas.
  const gas = await publicClient.estimateContractGas({ address: account, abi: OWNABLE_ABI, functionName: "addOwnerAddress", args: [MANAGER], account: owner.address });
  const gasPrice = await publicClient.getGasPrice();
  const need = (gas * gasPrice * BigInt(3)) + BigInt(2_000_000_000_000); // 3x execution + L1 data fee margin
  const have = await publicClient.getBalance({ address: owner.address });
  if (have < need) {
    const hash = await operatorClient.sendTransaction({ to: owner.address, value: need - have });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("gas to owner   :", hash, formatEther(need - have), "ETH");
  }
  const ownerClient = createWalletClient({ account: owner, chain: base, transport: http(rpc) });
  const hash = await ownerClient.writeContract({ address: account, abi: OWNABLE_ABI, functionName: "addOwnerAddress", args: [MANAGER] });
  const r = await publicClient.waitForTransactionReceipt({ hash });
  console.log("addOwner tx    :", hash, r.status);

  // Public RPC nodes lag behind a just-mined tx; poll before judging.
  let confirmed = false;
  for (let i = 0; i < 10 && !confirmed; i++) {
    confirmed = await publicClient.readContract({ address: account, abi: OWNABLE_ABI, functionName: "isOwnerAddress", args: [MANAGER] }).catch(() => false);
    if (!confirmed) await new Promise((r) => setTimeout(r, 1500));
  }
  console.log("manager owner  :", confirmed);
  if (!confirmed) throw new Error("manager not owner");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
