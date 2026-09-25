import { NextResponse } from "next/server";

/**
 * Sliding-window limit per client IP and bucket. In memory: it resets on a cold start and each
 * serverless instance counts on its own, which is enough to stop casual abuse of our RPC and
 * model quota without a paid store.
 */
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip")) ?.trim() || "unknown";
}

/** Returns a 429 response when over the limit, otherwise null. */
export function rateLimit(req: Request, bucket: string, max: number, windowMs: number): NextResponse | null {
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    const retry = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return NextResponse.json({ error: `Too many requests. Try again in ${retry} seconds.` }, { status: 429, headers: { "retry-after": String(retry) } });
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep the map from growing without bound.
  if (hits.size > 10_000) hits.clear();
  return null;
}
