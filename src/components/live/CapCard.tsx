import { TrackSkeleton, VaneTrack } from "../VaneTrack";
import { share, tokens, tokensUp, until, utcTime } from "@/lib/format";
import type { LiveState } from "@/lib/useToken";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-t border-dashed border-line pt-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-xl">{value}</dd>
      {sub ? <dd className="mt-1 text-sm text-muted">{sub}</dd> : null}
    </div>
  );
}

export function CapCard({ s }: { s: LiveState }) {
  return (
    <section id="cap" aria-labelledby="cap-title" className="scroll-mt-6 mx-auto max-w-[1200px] px-4 md:px-6">
      <div className="rounded-[20px] bg-card p-6 md:p-10">
        <h2 id="cap-title" className="font-eyebrow text-sm uppercase tracking-[0.08em]">
          Most the team can sell through Sellvane today
        </h2>

        {s.status === "error" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-base">Base did not answer, so these numbers are hidden rather than shown out of date.</p>
            <button onClick={s.retry} className="rounded-full bg-ink px-6 py-3 text-base font-medium text-white hover:bg-[#1a1a1a]">
              Try again
            </button>
          </div>
        ) : s.status === "loading" ? (
          <div aria-hidden="true">
            <div className="mt-5 h-14 w-80 max-w-full rounded-full bg-line" />
            <div className="mt-8">
              <TrackSkeleton />
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-[16px] bg-line" />
              ))}
            </div>
          </div>
        ) : (
          (() => {
            const { cap, token } = s.data;
            if (cap.activePermissions === 0) {
              return (
                <p className="mt-6 max-w-[640px] text-lg leading-[1.6]">
                  No active cap. The team account has no approved Sellvane permission right now, so nothing limits its sales through Sellvane. Any token leaving the account shows in the bypass watch below.
                </p>
              );
            }
            const reached = BigInt(cap.remaining) === BigInt(0);
            const ofSupply = (share(cap.allowance, token.totalSupply) * 100).toFixed(2).replace(/\.?0+$/, "");
            return (
              <>
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <p className="font-display text-[48px] leading-[1.01] md:text-[72px]">
                    {tokens(cap.allowance, token.decimals)} <span className="text-[28px] md:text-[38px]">tokens</span>
                  </p>
                  <p className="text-base text-muted">
                    {ofSupply}% of supply, {cap.activePermissions === 1 ? "1 permission active" : `sum of ${cap.activePermissions} active permissions`}
                  </p>
                </div>

                <p className="mt-3 max-w-[680px] text-base text-muted">
                  Applies to sales from this team account through Sellvane. Other transfers are flagged below, not blocked.
                </p>

                {reached ? (
                  <p className="mt-6 inline-block rounded-full bg-ink px-5 py-2 font-mono text-sm uppercase tracking-[0.06em] text-white">
                    Limit hit. No more team sales until {cap.periodEnd ? utcTime(cap.periodEnd) : "reset"}
                  </p>
                ) : null}

                {/* The three numbers that explain the headline, directly under it. */}
                <dl className="mt-6 grid gap-6 sm:grid-cols-3">
                  <Stat label="Already sold today" value={tokensUp(cap.spentThisPeriod, token.decimals)} />
                  <Stat label="Left under today's limit" value={tokens(cap.remaining, token.decimals)} />
                  <Stat
                    label="Cap resets in"
                    value={until(cap.periodEnd)}
                    sub={cap.periodEnd ? `at ${utcTime(cap.periodEnd)}, 24 hours after the last reset` : undefined}
                  />
                </dl>

                <div className="mt-8">
                  <VaneTrack
                    filled={share(cap.spentThisPeriod, cap.allowance)}
                    label={`${tokensUp(cap.spentThisPeriod, token.decimals)} of ${tokens(cap.allowance, token.decimals)} tokens sold today`}
                  />
                </div>
              </>
            );
          })()
        )}
      </div>
    </section>
  );
}
