import { basescanAddress, short } from "@/lib/format";
import type { TokenState } from "@/lib/useToken";

function Addr({ label, address }: { label: string; address: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1">
        <a href={basescanAddress(address)} target="_blank" rel="noopener noreferrer" className="font-mono text-base underline underline-offset-4">
          {short(address)}
        </a>
      </dd>
    </div>
  );
}

export function LiveHeader({ s }: { s: TokenState }) {
  const ready = s.status === "ready" ? s.data : null;
  return (
    <section aria-labelledby="live-title" className="mx-auto max-w-[1200px] px-4 pb-10 pt-12 md:px-6 md:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">Live on Base</p>
          <h1 id="live-title" className="mt-4 font-display text-[44px] leading-[1.05] md:text-[64px]">
            The team&apos;s sell cap
          </h1>
          <p className="mt-4 max-w-[680px] text-lg leading-[1.6] text-muted">
            The cap, the sales and every transfer are read from Base. The agent&apos;s reasons are its own explanation, saved with each move.
          </p>
          <p className="mt-5 max-w-[680px] rounded-[16px] bg-butter px-5 py-3 text-base leading-[1.5]">
            This runs on a test token Sellvane deployed on Base mainnet. The pool is small on purpose, and every transaction is real.
          </p>
        </div>
        <p className="font-mono text-sm text-muted" aria-live="polite">
          {ready
            ? `updated ${ready.readAt.slice(11, 19)} UTC, block ${Number(ready.block).toLocaleString("en-US")}`
            : s.status === "loading"
              ? "reading Base..."
              : "Base did not answer"}
        </p>
      </div>

      <dl className="mt-10 grid grid-cols-1 gap-6 border-t border-dashed border-line pt-6 sm:grid-cols-3">
        {ready ? (
          <>
            <Addr label="Team account" address={ready.team.address} />
            <Addr label="Seller contract" address={ready.seller} />
            <Addr label="Uniswap pool" address={ready.pool.address} />
          </>
        ) : (
          [0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true">
              <div className="h-4 w-24 rounded-full bg-line" />
              <div className="mt-2 h-5 w-36 rounded-full bg-line" />
            </div>
          ))
        )}
      </dl>
    </section>
  );
}
