import { describe, expect, it } from "vitest";
import { deployment } from "@/lib/chain/config";
import { quoteLadder, readPool } from "@/lib/chain/pool";

describe("pool (Base mainnet reads)", () => {
  const d = deployment();

  it("reads a live pool with liquidity and a positive mid price", async () => {
    const s = await readPool(d.pool, d.token);
    expect(s.liquidity > BigInt(0)).toBe(true);
    expect(s.midWeiPerToken > BigInt(0)).toBe(true);
    expect(s.tokenReserve > BigInt(0)).toBe(true);
  });

  it("price impact grows with sell size", async () => {
    const s = await readPool(d.pool, d.token);
    const ladder = await quoteLadder(d.token, d.fee, BigInt(8_000_000) * BigInt(10) ** BigInt(18), s, 5);
    expect(ladder.length).toBeGreaterThan(2);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i].impactBps).toBeGreaterThanOrEqual(ladder[i - 1].impactBps);
      expect(ladder[i].ethOut > ladder[i - 1].ethOut).toBe(true);
    }
    // Selling ~13% of the pool's tokens must cost well over 1% impact.
    expect(ladder[ladder.length - 1].impactBps).toBeGreaterThan(100);
  });
});
