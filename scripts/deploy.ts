/**
 * Deploy the Sellvane test token, the SellvaneSeller contract, and a seeded Uniswap v3
 * VDEMO/WETH pool on Base mainnet.
 *
 *   npm run deploy               (dry run: plan + balances)
 *   SEND=1 npm run deploy        (executes; idempotent via .env.local)
 *
 * Token split: 900M VDEMO to the team account (the unlocked team tokens), 100M to the
 * operator, of which POOL_TOKENS seed the pool with POOL_WEI of ETH, full range.
 */
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  getAddress,
  http,
  parseEther,
  parseUnits,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { must, setEnv } from "./env";

const MANAGER = getAddress("0xf85210B21cC50302F477BA56686d2019dC9b67Ad");
const ROUTER = getAddress("0x2626664c2603336E57B271c5C0b26F421741e481");
const NPM = getAddress("0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1");
const FACTORY = getAddress("0x33128a8fC17869897dcE68Ed026d694621f6FDfD");
const WETH = getAddress("0x4200000000000000000000000000000000000006");
const FEE = 10000;
const TICK_LO = -887200;
const TICK_HI = 887200;

const SUPPLY = parseUnits("1000000000", 18);
const TEAM_TOKENS = parseUnits("900000000", 18);
const OPERATOR_TOKENS = SUPPLY - TEAM_TOKENS;
const POOL_TOKENS = parseUnits("60000000", 18);
const POOL_WEI = parseEther(process.env.POOL_ETH ?? "0.00006");

const SEND = process.env.SEND === "1";

function artifact(file: string, name: string): { abi: Abi; bytecode: Hex } {
  const p = new URL(`../contracts/out/${file}/${name}.json`, import.meta.url).pathname;
  const j = JSON.parse(readFileSync(p, "utf8"));
  return { abi: j.abi, bytecode: j.bytecode.object };
}

const ERC20_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const WETH_ABI = [
  { name: "deposit", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
] as const;
const FACTORY_ABI = [
  { name: "getPool", type: "function", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }, { type: "uint24" }], outputs: [{ type: "address" }] },
] as const;
const NPM_ABI = [
  {
    name: "createAndInitializePoolIfNecessary", type: "function", stateMutability: "payable",
    inputs: [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "uint160" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "mint", type: "function", stateMutability: "payable",
    inputs: [{
      type: "tuple", components: [
        { name: "token0", type: "address" }, { name: "token1", type: "address" }, { name: "fee", type: "uint24" },
        { name: "tickLower", type: "int24" }, { name: "tickUpper", type: "int24" },
        { name: "amount0Desired", type: "uint256" }, { name: "amount1Desired", type: "uint256" },
        { name: "amount0Min", type: "uint256" }, { name: "amount1Min", type: "uint256" },
        { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" },
      ],
    }],
    outputs: [{ type: "uint256" }, { type: "uint128" }, { type: "uint256" }, { type: "uint256" }],
  },
] as const;

function isqrt(n: bigint): bigint {
  if (n < BigInt(2)) return n;
  let x = n;
  let y = (x + BigInt(1)) / BigInt(2);
  while (y < x) {
    x = y;
    y = (x + n / x) / BigInt(2);
  }
  return x;
}

/** sqrtPriceX96 for price = amount1 / amount0 in raw units. */
function sqrtPriceX96(amount0: bigint, amount1: bigint): bigint {
  return isqrt((amount1 << BigInt(192)) / amount0);
}

async function main() {
  const rpc = must("BASE_RPC_URL");
  const op = privateKeyToAccount(must("OPERATOR_PRIVATE_KEY") as Hex);
  const team = getAddress(must("TEAM_ACCOUNT_ADDRESS"));
  const pc = createPublicClient({ chain: base, transport: http(rpc) });
  const wc = createWalletClient({ account: op, chain: base, transport: http(rpc) });

  const bal = await pc.getBalance({ address: op.address });
  console.log("operator   :", op.address, formatEther(bal), "ETH");
  console.log("team       :", team);
  console.log("pool seed  :", formatEther(POOL_WEI), "ETH +", (POOL_TOKENS / BigInt(10) ** BigInt(18)).toString(), "VDEMO");
  if (!SEND) {
    console.log("\nDry run. SEND=1 to execute.");
    return;
  }

  const wait = async (hash: Hex, label: string) => {
    const r = await pc.waitForTransactionReceipt({ hash });
    console.log(`${label.padEnd(11)}:`, hash, r.status);
    if (r.status !== "success") throw new Error(`${label} reverted`);
    return r;
  };

  // 1. Token
  let token = process.env.TOKEN_ADDRESS as Address | undefined;
  if (!token) {
    const { abi, bytecode } = artifact("SellvaneTestToken.sol", "SellvaneTestToken");
    const hash = await wc.deployContract({
      abi, bytecode,
      args: ["Vane Demo", "VDEMO", SUPPLY, [team, op.address], [TEAM_TOKENS, OPERATOR_TOKENS]],
    });
    const r = await wait(hash, "token");
    token = getAddress(r.contractAddress!);
    setEnv("TOKEN_ADDRESS", token);
  }
  console.log("token      :", token);

  // 2. Seller
  let seller = process.env.SELLER_ADDRESS as Address | undefined;
  if (!seller) {
    const { abi, bytecode } = artifact("SellvaneSeller.sol", "SellvaneSeller");
    const hash = await wc.deployContract({ abi, bytecode, args: [MANAGER, ROUTER, WETH, op.address] });
    const r = await wait(hash, "seller");
    seller = getAddress(r.contractAddress!);
    setEnv("SELLER_ADDRESS", seller);
  }
  console.log("seller     :", seller);

  // 3. Pool
  const [t0, t1] = token.toLowerCase() < WETH.toLowerCase() ? [token, WETH] : [WETH, token];
  const [a0, a1] = t0 === token ? [POOL_TOKENS, POOL_WEI] : [POOL_WEI, POOL_TOKENS];
  let pool = (await pc.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getPool", args: [t0, t1, FEE] })) as Address;
  if (pool === "0x0000000000000000000000000000000000000000") {
    const hash = await wc.writeContract({
      address: NPM, abi: NPM_ABI, functionName: "createAndInitializePoolIfNecessary",
      args: [t0, t1, FEE, sqrtPriceX96(a0, a1)],
    });
    await wait(hash, "pool init");
    for (let i = 0; i < 10 && pool === "0x0000000000000000000000000000000000000000"; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      pool = (await pc.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: "getPool", args: [t0, t1, FEE] })) as Address;
    }
  }
  setEnv("POOL_ADDRESS", getAddress(pool));
  console.log("pool       :", pool);

  // 4. Liquidity (skipped if the pool already holds our tokens)
  const poolTokens = await pc.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [pool] });
  if (poolTokens === BigInt(0)) {
    // Each step is skipped if already done, so a retry never wraps ETH twice.
    const wethBal = await pc.readContract({ address: WETH, abi: ERC20_ABI, functionName: "balanceOf", args: [op.address] });
    if (wethBal < POOL_WEI) {
      await wait(await wc.writeContract({ address: WETH, abi: WETH_ABI, functionName: "deposit", value: POOL_WEI - wethBal }), "wrap");
    }
    if ((await pc.readContract({ address: WETH, abi: ERC20_ABI, functionName: "allowance", args: [op.address, NPM] })) < POOL_WEI) {
      await wait(await wc.writeContract({ address: WETH, abi: ERC20_ABI, functionName: "approve", args: [NPM, POOL_WEI] }), "approve W");
    }
    if ((await pc.readContract({ address: token, abi: ERC20_ABI, functionName: "allowance", args: [op.address, NPM] })) < POOL_TOKENS) {
      await wait(await wc.writeContract({ address: token, abi: ERC20_ABI, functionName: "approve", args: [NPM, POOL_TOKENS] }), "approve T");
    }
    // Let lagging RPC nodes catch up with the approvals before mint is simulated.
    await new Promise((r) => setTimeout(r, 4000));
    const hash = await wc.writeContract({
      address: NPM, abi: NPM_ABI, functionName: "mint",
      args: [{
        token0: t0, token1: t1, fee: FEE, tickLower: TICK_LO, tickUpper: TICK_HI,
        amount0Desired: a0, amount1Desired: a1, amount0Min: BigInt(0), amount1Min: BigInt(0),
        recipient: op.address, deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
      }],
    });
    await wait(hash, "mint LP");
  }
  console.log("operator ETH left:", formatEther(await pc.getBalance({ address: op.address })));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
