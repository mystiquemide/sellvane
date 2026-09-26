import { afterAll, describe, expect, it } from "vitest";
import { tick } from "@/lib/agent/tick";
import { getToken } from "@/lib/registry";
import { sql } from "@/lib/store/db";

describe("agent tick safety (Base mainnet reads, no sends)", () => {
  afterAll(async () => {
    await sql().end();
  });

  it("skips a permission that is neither approved on chain nor signed", async () => {
    const row = await getToken(process.env.TOKEN_ADDRESS!);
    expect(row).not.toBeNull();
    const unapproved = { ...row!, signature: null, permission: { ...row!.permission, salt: BigInt(424242) } };
    const r = await tick(unapproved, { send: false });
    expect(r.action).toBe("SKIP");
    expect(r.reason).toMatch(/Waiting for the team's signature/);
    expect(r.txHash).toBeNull();
  }, 120000);
});
