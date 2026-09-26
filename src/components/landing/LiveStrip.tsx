"use client";

import Link from "next/link";
import { Lookup } from "../Lookup";
import { TrackSkeleton, VaneTrack } from "../VaneTrack";
import { basescanTx, pct, share, tokens, until } from "@/lib/format";
import { useToken, type TokenData } from "@/lib/useToken";

const ACTION_LABEL: Record<string, string> = { SELL: "Sold", WAIT: "Waited", SKIP: "Paused", BLOCKED: "Blocked" };

function LastMove({ d, dec }: { d: TokenData["decisions"][number] | undefined; dec: number }) {
  if (!d) return <span>No agent moves yet. It checks every 10 minutes.</span>;
  return (
    <span>
      Last agent move: <strong className="font-medium">{ACTION_LABEL[d.action] ?? d.action}</strong>
      {d.amountIn ? ` ${tokens(d.amountIn, dec)} tokens` : ""}
      {d.impactBps != null && d.action === "SELL" ? ` at ${pct(d.impactBps)} impact` : ""}
      {d.txHash ? (
        <>
          {" "}
          <a href={basescanTx(d.txHash)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            BaseScan
          </a>
        </>
      ) : null}
    </span>
  );
}

export function LiveStrip({ slug }: { slug: string }) {
  const s = useToken(slug);
  if (s.status === "notfound") return null;

  return (
    <section aria-labelledby="live-strip-title" className="relative z-10 mx-auto -mt-28 max-w-[1200px] px-4 pb-20 md:px-6 md:pb-24">
      <div className="rounded-[20px] bg-card p-6 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="live-strip-title" className="font-display text-[26px] leading-[1.2]">
            Team sell cap, today
          </h2>
          <p className="font-mono text-sm text-muted">
            {s.status === "ready" ? `Read from Base, block ${Number(s.data.block).toLocaleString("en-US")}` : s.status === "loading" ? "Reading Base..." : ""}
          </p>
        </div>

        {s.status === "error" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-base">Base did not answer, so these numbers are hidden rather than shown out of date.</p>
            <button onClick={s.retry} className="rounded-full bg-ink px-6 py-3 text-base font-medium text-white hover:bg-[#1a1a1a]">
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4">
              {s.status === "ready" ? (
                <VaneTrack
                  filled={share(s.data.cap.spentThisPeriod, s.data.cap.allowance)}
                  label={`${tokens(s.data.cap.spentThisPeriod, s.data.token.decimals)} of ${tokens(s.data.cap.allowance, s.data.token.decimals)} tokens sold today`}
                />
              ) : (
                <TrackSkeleton />
              )}
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-y-2 font-mono text-[15px] sm:grid-cols-2 sm:gap-x-6 md:flex md:flex-wrap md:gap-x-10 [&_dd]:whitespace-nowrap">
              {s.status === "ready" ? (
                <>
                  <div><dt className="sr-only">Sold today</dt><dd><span className="text-ink">{tokens(s.data.cap.spentThisPeriod, s.data.token.decimals)}</span> <span className="text-muted">tokens sold</span></dd></div>
                  <div><dt className="sr-only">Left today</dt><dd><span className="text-ink">{tokens(s.data.cap.remaining, s.data.token.decimals)}</span> <span className="text-muted">left</span></dd></div>
                  <div><dt className="sr-only">Daily cap</dt><dd><span className="text-muted">cap</span> <span className="text-ink">{tokens(s.data.cap.allowance, s.data.token.decimals)}</span> <span className="text-muted">/ day</span></dd></div>
                  <div><dt className="sr-only">Resets</dt><dd><span className="text-muted">resets in</span> <span className="text-ink">{until(s.data.cap.periodEnd)}</span></dd></div>
                </>
              ) : (
                [0, 1, 2, 3].map((i) => <div key={i} className="h-5 w-32 rounded-full bg-line" aria-hidden="true" />)
              )}
            </dl>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-line pt-5 text-[15px]">
              {s.status === "ready" ? <LastMove d={s.data.decisions[0]} dec={s.data.token.decimals} /> : <span className="h-5 w-72 rounded-full bg-line" aria-hidden="true" />}
              <Link href="/live" className="font-medium underline-offset-4 hover:underline">
                See every move →
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 grid items-end gap-6 md:grid-cols-[minmax(0,640px)_auto] md:justify-between">
        <Lookup />
        <Link href="/start" className="justify-self-start text-base font-medium underline underline-offset-4 md:justify-self-end md:pb-3">
          On a token team? Cap your token →
        </Link>
      </div>
    </section>
  );
}
