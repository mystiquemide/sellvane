/** Whole-token amount with thousands separators, from a raw integer string in the token's decimals. */
export function tokens(raw: string | null | undefined, decimals = 18): string {
  if (!raw) return "0";
  return (BigInt(raw) / BigInt(10) ** BigInt(decimals)).toLocaleString("en-US");
}

/** Like `tokens`, but rounds up. Used for amounts sold, so sold + left adds up to the cap. */
export function tokensUp(raw: string | null | undefined, decimals = 18): string {
  if (!raw) return "0";
  const unit = BigInt(10) ** BigInt(decimals);
  return ((BigInt(raw) + unit - BigInt(1)) / unit).toLocaleString("en-US");
}

/** Share of `part` in `whole`, 0..1, safe for huge integers. */
export function share(part: string, whole: string): number {
  const w = BigInt(whole);
  if (w === BigInt(0)) return 0;
  return Number((BigInt(part) * BigInt(10000)) / w) / 10000;
}

export function pct(bps: number | null | undefined): string {
  return bps == null ? "" : `${(bps / 100).toFixed(2)}%`;
}

/** "9h 12m" until a unix timestamp. */
export function until(unixSec: number | null | undefined, nowMs = Date.now()): string {
  if (!unixSec) return "";
  const s = Math.max(0, unixSec - Math.floor(nowMs / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function utcTime(unixSecOrIso: number | string): string {
  const d = typeof unixSecOrIso === "number" ? new Date(unixSecOrIso * 1000) : new Date(unixSecOrIso);
  return d.toISOString().slice(11, 16) + " UTC";
}

export const basescanTx = (hash: string) => `https://basescan.org/tx/${hash}`;
export const basescanAddress = (a: string) => `https://basescan.org/address/${a}`;
export const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

/** Sellvane's own test token keeps its fixed symbol off headlines (see FRONTEND-PLAN naming rule). */
export const isTestToken = (symbol: string) => symbol === "VDEMO";
export const tokenLabel = (t: { symbol: string; name: string }) => (isTestToken(t.symbol) ? "Sellvane test token" : `${t.name} (${t.symbol})`);
