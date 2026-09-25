import { describe, expect, it } from "vitest";
import { computeBounds, priceFloor, sliceAmount } from "@/lib/agent/bounds";
import { decide, type Facts } from "@/lib/agent/decide";

const E = BigInt(10) ** BigInt(18);
const q = (tokens: number, impactBps: number) => ({ amountIn: BigInt(tokens) * E, ethOut: BigInt(tokens) * BigInt(1000), impactBps });

describe("computeBounds", () => {
  const ladder = [q(100, 10), q(200, 50), q(400, 99), q(800, 180), q(1600, 400)];

  it("picks the largest size within the impact limit", () => {
    expect(computeBounds(ladder, BigInt(10000) * E, 100).maxSlice?.amountIn).toBe(BigInt(400) * E);
  });

  it("never exceeds the remaining cap", () => {
    expect(computeBounds(ladder, BigInt(250) * E, 1000).maxSlice?.amountIn).toBe(BigInt(200) * E);
  });

  it("returns null when even the smallest size is too costly", () => {
    const b = computeBounds([q(100, 300), q(200, 600)], BigInt(10000) * E, 100);
    expect(b.maxSlice).toBeNull();
    expect(b.smallest?.impactBps).toBe(300);
  });

  it("ignores ladder order", () => {
    expect(computeBounds([...ladder].reverse(), BigInt(10000) * E, 100).maxSlice?.amountIn).toBe(BigInt(400) * E);
  });
});

describe("sliceAmount / priceFloor", () => {
  it("snaps unexpected fractions down to an allowed value", () => {
    expect(sliceAmount(BigInt(1000), 1)).toBe(BigInt(1000));
    expect(sliceAmount(BigInt(1000), 0.6)).toBe(BigInt(500));
    expect(sliceAmount(BigInt(1000), 0.1)).toBe(BigInt(250));
    expect(sliceAmount(BigInt(1000), 7)).toBe(BigInt(1000));
  });

  it("floor is quote minus slippage and never zero", () => {
    expect(priceFloor(BigInt(10000), 50)).toBe(BigInt(9950));
    expect(priceFloor(BigInt(0), 50)).toBe(BigInt(1));
  });
});

describe("decide (model output is untrusted)", () => {
  const facts = {} as Facts;
  const client = (content: string) => ({ chat: { completions: { create: async () => ({ choices: [{ message: { content } }] }) } } }) as never;

  it("accepts a valid SELL and snaps the fraction", async () => {
    const c = await decide(facts, { client: client('{"action":"SELL","fraction":0.8,"reason":"Buyers active, selling 0.8%."}') });
    expect(c).toMatchObject({ action: "SELL", fraction: 0.75, source: "model" });
  });

  it("accepts a WAIT with fraction 0 and keeps the model's reason", async () => {
    const c = await decide(facts, { client: client('{"action":"WAIT","fraction":0,"reason":"Market net selling 160k, waiting."}') });
    expect(c).toMatchObject({ action: "WAIT", source: "model", reason: "Market net selling 160k, waiting." });
  });

  it("turns garbage into WAIT", async () => {
    expect((await decide(facts, { client: client("sell everything now") })).action).toBe("WAIT");
  });

  it("rejects out-of-range fractions", async () => {
    const c = await decide(facts, { client: client('{"action":"SELL","fraction":5,"reason":"dump it all"}') });
    expect(c).toMatchObject({ action: "WAIT", source: "fallback" });
  });

  it("turns a model error into WAIT", async () => {
    const broken = { chat: { completions: { create: async () => { throw new Error("down"); } } } } as never;
    expect((await decide(facts, { client: broken })).action).toBe("WAIT");
  });
});
