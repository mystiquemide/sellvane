import { describe, expect, it } from "vitest";
import { publicClient } from "@/lib/chain/clients";
import { MANAGER, deployment } from "@/lib/chain/config";
import { MANAGER_ABI } from "@/lib/chain/abis";
import { buildPermission, permissionHash, readCapStatus, signPermission } from "@/lib/chain/permission";
import type { Hex } from "viem";

// Needs the ledger database and the team owner key. Skipped when they are not set, as in CI.
const hasSecrets = Boolean(process.env.DATABASE_URL && process.env.TEAM_OWNER_PRIVATE_KEY && process.env.PERMISSION_JSON);

describe("permission (Base mainnet reads)", () => {
  const d = deployment();
  const p = buildPermission({ account: d.team, seller: d.seller, token: d.token, dailyCap: BigInt(123) * BigInt(10) ** BigInt(18), start: 1700000000, salt: BigInt(987654321) });

  it("local EIP-712 hash equals SpendPermissionManager.getHash", async () => {
    const onchain = await publicClient.readContract({ address: MANAGER, abi: MANAGER_ABI, functionName: "getHash", args: [p] });
    expect(permissionHash(p)).toBe(onchain);
  });

  it("unapproved permission reads as not approved with full remaining", async () => {
    const s = await readCapStatus(p);
    expect(s.approved).toBe(false);
    expect(s.revoked).toBe(false);
    expect(s.remaining).toBe(p.allowance);
  });

  it.skipIf(!hasSecrets)("team owner key produces a signature the team account accepts (ERC-1271)", async () => {
    const sig = await signPermission(p, process.env.TEAM_OWNER_PRIVATE_KEY as Hex);
    const magic = await publicClient.readContract({
      address: d.team,
      abi: [{ name: "isValidSignature", type: "function", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "bytes" }], outputs: [{ type: "bytes4" }] }],
      functionName: "isValidSignature",
      args: [permissionHash(p), sig],
    });
    expect(magic).toBe("0x1626ba7e");
  });

  it.skipIf(!hasSecrets)("refuses to sign for an account the key does not control", async () => {
    const other = { ...p, account: d.seller };
    await expect(signPermission(other, process.env.TEAM_OWNER_PRIVATE_KEY as Hex)).rejects.toThrow();
  });
});
