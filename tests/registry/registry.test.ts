import { afterAll, describe, expect, it } from "vitest";
import { findWethPool, readTokenInfo, TokenCheckError } from "@/lib/chain/token";
import { getToken, parsePermission, registerToken, RegistryError } from "@/lib/registry";
import { fromJson, signPermission, toJson } from "@/lib/chain/permission";
import type { Hex } from "viem";
import { sql } from "@/lib/store/db";
import { deployment } from "@/lib/chain/config";

const served = () => fromJson(JSON.parse(process.env.PERMISSION_JSON!));

describe("token checks (Base mainnet)", () => {
  afterAll(async () => {
    await sql().end();
  });

  it("reads our token's metadata", async () => {
    const t = await readTokenInfo(deployment().token);
    expect(t.symbol).toBe("VDEMO");
    expect(t.decimals).toBe(18);
  });

  it("rejects a non-ERC20 address", async () => {
    await expect(readTokenInfo(deployment().seller)).rejects.toMatchObject({ code: "not_erc20" });
  });

  it("rejects garbage input", async () => {
    await expect(readTokenInfo("hello")).rejects.toBeInstanceOf(TokenCheckError);
  });

  it("finds our Uniswap v3 WETH pool", async () => {
    const p = await findWethPool(deployment().token);
    expect(p.pool).toBe(deployment().pool);
    expect(p.fee).toBe(10000);
  });

  it("rejects a permission that names another spender", async () => {
    const p = { ...served(), spender: deployment().team };
    await expect(registerToken(p)).rejects.toBeInstanceOf(RegistryError);
  });

  it("rejects a malformed permission", () => {
    expect(() => parsePermission({ account: "nope" })).toThrow(RegistryError);
  });

  it("rejects a permission that was never approved on chain", async () => {
    const p = { ...served(), salt: BigInt(999999) };
    await expect(registerToken(p)).rejects.toMatchObject({ status: 409 });
  }, 60000);

  it("accepts a signed but not yet approved permission, and rejects a bad signature", async () => {
    const fresh = { ...served(), salt: BigInt(Date.now()) };
    const sig = await signPermission(fresh, process.env.TEAM_OWNER_PRIVATE_KEY as Hex);
    await expect(registerToken(fresh, { signature: ("0x" + "11".repeat(65)) as Hex })).rejects.toMatchObject({ status: 409 });
    const row = await registerToken(fresh, { signature: sig });
    expect(row.signature).toBe(sig);
    // Restore the live permission so the page keeps serving the approved one.
    const back = await registerToken(served());
    expect(back.signature).toBeNull();
  }, 90000);

  it("registers the live test token after on-chain checks, idempotently", async () => {
    const row = await registerToken(served());
    const again = await registerToken(parsePermission(toJson(served())));
    expect(row.slug).toBe(deployment().token.toLowerCase());
    expect(again.permissionHash).toBe(row.permissionHash);
    expect((await getToken(deployment().team))?.slug).toBe(row.slug);
  }, 60000);
});
