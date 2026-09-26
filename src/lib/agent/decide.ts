import Groq from "groq-sdk";
import { z } from "zod";
import { FRACTIONS } from "./bounds";

export type Facts = {
  symbol: string;
  capPerDay: string;
  soldToday: string;
  remainingToday: string;
  hoursUntilReset: number;
  poolTokenReserve: string;
  poolEthReserve: string;
  maxImpactPct: number;
  maxSafeSlice: string;
  maxSafeSliceImpactPct: number;
  recentSwaps: { window: string; buys: number; sells: number; netTokensBoughtByMarket: string };
};

export type Choice = { action: "SELL" | "WAIT"; fraction: number; reason: string; source: "model" | "fallback" };

// fraction only matters for SELL; a WAIT may carry 0 or omit it.
const schema = z.object({
  action: z.enum(["SELL", "WAIT"]),
  fraction: z.number().min(0).max(1).optional(),
  reason: z.string().min(3).max(240),
});

const SYSTEM = `You run the sell desk for a token team's unlocked tokens.
The team sells over time in small sales the pool can absorb. Hard limits are enforced by code and on chain; you cannot exceed them.
You choose only: SELL a fraction (0.25, 0.5, 0.75 or 1) of the max safe slice, or WAIT.
Guidance: prefer selling into net buying pressure; prefer WAIT or smaller fractions when the market is net selling; if much of today's cap remains and reset is near, larger fractions are acceptable; never chase the full cap in one go.
Reply with JSON only: {"action":"SELL"|"WAIT","fraction":number,"reason":string}.
The reason is one plain sentence for token holders, max 200 characters. Use everyday words and one key number (tokens, percent, or buys vs sells). Never use terms like "fraction", "slice", "max safe slice" or "liquidity". Describe the facts behind the choice (pool activity, cap left, time to reset), not outcomes like protecting holders or the price.`;

/** Ask the model to choose within bounds. Any failure or invalid output returns a WAIT. */
export async function decide(facts: Facts, opts: { apiKey?: string; model?: string; client?: Pick<Groq, "chat"> } = {}): Promise<Choice> {
  const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey && !opts.client) return { action: "WAIT", fraction: 0.25, reason: "The agent's model did not answer, so it waited. It tries again at the next check.", source: "fallback" };
  const client = opts.client ?? new Groq({ apiKey });
  try {
    const res = await client.chat.completions.create({
      model: opts.model ?? process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(facts) },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "";
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { action: "WAIT", fraction: 0.25, reason: "The agent's answer did not pass Sellvane's checks, so it waited instead of selling.", source: "fallback" };
    const fraction = FRACTIONS.filter((x) => x <= (parsed.data.fraction ?? 0)).pop() ?? 0.25;
    return { action: parsed.data.action, reason: parsed.data.reason, fraction, source: "model" };
  } catch {
    return { action: "WAIT", fraction: 0.25, reason: "The agent's model did not answer, so it waited. It tries again at the next check.", source: "fallback" };
  }
}
