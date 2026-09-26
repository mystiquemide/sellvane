import { afterAll, describe, expect, it } from "vitest";
import { sql, withTickLock } from "@/lib/store/db";

// Needs the ledger database and the team owner key. Skipped when they are not set, as in CI.
const hasSecrets = Boolean(process.env.DATABASE_URL && process.env.TEAM_OWNER_PRIVATE_KEY && process.env.PERMISSION_JSON);

describe.skipIf(!hasSecrets)("tick lock (Neon)", () => {
  afterAll(async () => {
    await sql().end();
  });

  it("a second tick for the same key does not run while the first holds the lock", async () => {
    let release!: () => void;
    const hold = new Promise<void>((r) => (release = r));
    const first = withTickLock("test:lock", async () => {
      await hold;
      return "first";
    });
    await new Promise((r) => setTimeout(r, 500));
    const second = await withTickLock("test:lock", async () => "second");
    release();
    expect(second.ran).toBe(false);
    expect(await first).toEqual({ ran: true, value: "first" });
  });

  it("the lock is released after the first tick finishes", async () => {
    expect(await withTickLock("test:lock", async () => 1)).toEqual({ ran: true, value: 1 });
  });
});
