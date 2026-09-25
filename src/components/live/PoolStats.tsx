import { basescanAddress, pct, tokens, utcTime } from "@/lib/format";
import type { TokenState } from "@/lib/useToken";

/** ETH with enough significant digits to be readable at very small values. */
function eth(wei: bigint): string {
  const n = Number(wei) / 1e18;
  if (n === 0) return "0";
  if (n >= 0.001) return n.toFixed(4);
  // Plain decimals with 3 significant digits, never scientific notation.
  const decimals = Math.min(18, Math.ceil(-Math.log10(n)) + 2);
  return n.toFixed(decimals);
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="border-t border-dashed border-line pt-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-xl">{value}</dd>
      {sub ? <dd className="mt-1 text-sm text-muted">{sub}</dd> : null}
    </div>
  );
}

export function PoolStats({ s }: { s: TokenState }) {
  return (
    <section aria-labelledby="pool-title" className="mx-auto mt-6 max-w-[1200px] px-4 md:px-6">
      <div className="rounded-[20px] bg-card p-6 md:p-10">
        <h2 id="pool-title" className="font-eyebrow text-sm uppercase tracking-[0.08em]">
          The pool it sells into
        </h2>

        {s.status === "error" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-base">Base did not answer. Numbers are hidden until it does.</p>
            <button onClick={s.retry} className="rounded-full bg-ink px-6 py-3 text-base font-medium text-white hover:bg-[#1a1a1a]">
              Try again
            </button>
          </div>
        ) : s.status === "loading" ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-[16px] bg-line" />
            ))}
          </div>
        ) : (
          (() => {
            const { pool, agent, decisions } = s.data;
            // midWeiPerToken is wei per whole token.
            const per1M = BigInt(pool.midWeiPerToken) * BigInt(1_000_000);
            const last = decisions[0];
            return (
              <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Tokens in the pool" value={tokens(pool.tokenReserve)} />
                <Stat label="ETH in the pool" value={eth(BigInt(pool.wethReserve))} />
                <Stat label="Price per 1,000,000 tokens" value={`${eth(per1M)} ETH`} sub={`Uniswap v3, ${pool.fee / 10000}% fee tier`} />
                <Stat
                  label="Max price impact per sale"
                  value={pct(agent.maxImpactBps)}
                  sub={
                    last ? (
                      <>
                        Last agent check {utcTime(last.at)}.{" "}
                        <a href={basescanAddress(pool.address)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                          Pool on BaseScan
                        </a>
                      </>
                    ) : (
                      "No agent checks yet."
                    )
                  }
                />
              </dl>
            );
          })()
        )}
      </div>
    </section>
  );
}
