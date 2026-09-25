import { basescanTx } from "@/lib/format";

// The over-cap sell recorded on Base mainnet on 2026-09-25, block 51,773,639 (status: reverted).
const REFUSED_TX = "0xbe249cc824b778d0d740786eb7e0e6342449f9b897ed2145a4d8d500354e8f20";

const ROWS: [string, string][] = [
  ["Tried to sell", "4,687,501 tokens"],
  ["Left under the cap", "4,687,500 tokens"],
  ["Base replied", "ExceededSpendPermission"],
  ["Tokens moved", "0"],
];

export function ProofBand() {
  return (
    <section aria-labelledby="proof-title" className="bg-ink text-white">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-20 md:grid-cols-2 md:gap-16 md:px-6 md:py-[120px]">
        <div>
          <p className="font-eyebrow text-sm uppercase tracking-[0.08em] text-white/60">The chain said no</p>
          <h2 id="proof-title" className="mt-4 font-display text-[38px] leading-[1.1] md:text-[54px] md:leading-[1.05]">
            We tried to sell one token over the cap.
          </h2>
          <p className="mt-6 max-w-[480px] text-lg leading-[1.6] text-white/80">
            Not a warning on a dashboard. The sale went to Base and Base refused it, because the limit lives in the chain, not in our app.
          </p>
          <a
            href={basescanTx(REFUSED_TX)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-block rounded-full bg-marigold px-8 py-4 text-base font-medium text-ink transition-colors hover:bg-marigold-deep"
          >
            See the refused sale on BaseScan →
          </a>
        </div>

        <dl className="self-end font-mono text-base md:text-lg">
          {ROWS.map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-dashed border-white/25 py-5 last:border-b">
              <dt className="text-white/60">{k}</dt>
              <dd className="text-white">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
