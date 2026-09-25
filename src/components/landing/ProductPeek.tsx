"use client";

import Link from "next/link";
import { basescanTx, tokens } from "@/lib/format";
import { useToken } from "@/lib/useToken";

const STAMP: Record<string, string> = { SELL: "Sold", WAIT: "Waited", SKIP: "Paused", BLOCKED: "Blocked" };

/** Real, live excerpt of the /live page: the latest agent moves and the bypass status. */
export function ProductPeek({ slug }: { slug: string }) {
  const s = useToken(slug);
  return (
    <div className="rounded-[20px] bg-card p-5 md:p-6" aria-label="Latest moves from the live page">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em]">From the live page</p>
        <Link href={`/live/${slug}#agent`} className="text-sm font-medium underline-offset-4 hover:underline">
          See all →
        </Link>
      </div>

      <div className="mt-4 rounded-[16px] bg-butter px-4 py-2">
        {s.status === "ready" ? (
          s.data.decisions.length === 0 ? (
            <p className="py-3 text-sm">No agent moves yet.</p>
          ) : (
            <ul>
              {s.data.decisions.slice(0, 3).map((d) => (
                <li
                  key={d.id}
                  className={`flex items-center justify-between gap-3 border-b border-dashed border-ink/20 py-3 font-mono text-[13px] last:border-b-0 ${
                    d.action === "BLOCKED" ? "-mx-4 bg-ink px-4 text-white" : ""
                  }`}
                >
                  <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.06em] ${d.action === "SELL" ? "bg-marigold text-ink" : d.action === "BLOCKED" ? "bg-white text-ink" : "border border-ink"}`}>
                    {STAMP[d.action] ?? d.action}
                  </span>
                  <span className="flex-1 truncate">{d.amountIn ? `${tokens(d.amountIn, s.data.token.decimals)} tokens` : "no sale"}</span>
                  {d.txHash ? (
                    <a href={basescanTx(d.txHash)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      tx
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : s.status === "loading" || s.status === "notfound" ? (
          <div className="space-y-3 py-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 rounded-full bg-ink/10" />
            ))}
          </div>
        ) : (
          <p className="py-3 text-sm">Base did not answer. Moves are hidden until it does.</p>
        )}
      </div>

      <p className="mt-4 text-sm">
        {s.status === "ready" ? (
          s.data.uncappedMoves.length === 0 ? (
            <>
              <span className="font-medium">Bypass watch:</span> nothing has left the team account outside the cap.
            </>
          ) : (
            <span className="rounded-full bg-alert px-3 py-1">
              {s.data.uncappedMoves.length} uncapped {s.data.uncappedMoves.length === 1 ? "move" : "moves"} flagged
            </span>
          )
        ) : (
          <span className="inline-block h-4 w-56 rounded-full bg-line" aria-hidden="true" />
        )}
      </p>
    </div>
  );
}
