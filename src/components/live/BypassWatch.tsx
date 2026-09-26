import { basescanAddress, basescanTx, short, tokens } from "@/lib/format";
import type { LiveState, TokenData } from "@/lib/useToken";

type Move = TokenData["uncappedMoves"][number];

function totalOf(moves: Move[]) {
  return moves.reduce((a, m) => a + BigInt(m.amount), BigInt(0)).toString();
}

/** Pinned above the cap card whenever anything left the team account outside the cap. */
export function BypassAlert({ s }: { s: LiveState }) {
  if (s.status !== "ready" || s.data.uncappedMoves.length === 0) return null;
  const moves = s.data.uncappedMoves;
  return (
    <div role="alert" className="mx-auto mb-6 max-w-[1200px] px-4 md:px-6">
      <a href="#bypass" className="block rounded-[20px] bg-alert px-6 py-5 text-ink md:px-10">
        <p className="font-mono text-sm uppercase tracking-[0.06em]">Uncapped move</p>
        <p className="mt-1 text-lg font-bold">
          {tokens(totalOf(moves), s.data.token.decimals)} tokens left the team account outside the cap in {moves.length} {moves.length === 1 ? "transfer" : "transfers"}. See the bypass watch.
        </p>
      </a>
    </div>
  );
}

export function BypassWatch({ s }: { s: LiveState }) {
  return (
    <section id="bypass" aria-labelledby="bypass-title" className="scroll-mt-6 mx-auto mt-6 max-w-[1200px] px-4 md:px-6">
      <div className="rounded-[20px] bg-card p-6 md:p-10">
        <h2 id="bypass-title" className="font-eyebrow text-sm uppercase tracking-[0.08em]">
          Bypass watch
        </h2>
        <p className="mt-4 max-w-[680px] text-lg leading-[1.6]">
          Every token that leaves the team account is checked. It counts as capped only if the same transaction is a Sellvane sale under the team&apos;s permission.
        </p>

        {s.status === "error" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-base">Base did not answer, so these numbers are hidden rather than shown out of date.</p>
            <button onClick={s.retry} className="rounded-full bg-ink px-6 py-3 text-base font-medium text-white hover:bg-[#1a1a1a]">
              Try again
            </button>
          </div>
        ) : s.status === "loading" ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2" aria-hidden="true">
            <div className="h-20 rounded-[16px] bg-line" />
            <div className="h-20 rounded-[16px] bg-line" />
          </div>
        ) : (
          (() => {
            const { cappedMoves, uncappedMoves } = s.data;
            return (
              <>
                <dl className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div className="border-t border-dashed border-line pt-4">
                    <dt className="text-sm text-muted">Went through Sellvane, under the cap</dt>
                    <dd className="mt-1 font-mono text-3xl">{cappedMoves}</dd>
                  </div>
                  <div className={`border-t pt-4 ${uncappedMoves.length ? "border-alert border-solid" : "border-dashed border-line"}`}>
                    <dt className="text-sm text-muted">Transfers outside Sellvane</dt>
                    <dd className={`mt-1 font-mono text-3xl`}>{uncappedMoves.length}</dd>
                  </div>
                </dl>

                <p className="mt-6 font-mono text-sm text-muted">
                  Checked every transfer from block {Number(s.data.scan.fromBlock).toLocaleString("en-US")} (token created) through block{" "}
                  {Number(s.data.scan.toBlock).toLocaleString("en-US")}, in the same snapshot as the rest of this page.
                </p>

                {uncappedMoves.length === 0 ? (
                  <p className="mt-4 inline-block rounded-full bg-butter px-5 py-2 text-base">In that range, nothing left the team account outside the cap.</p>
                ) : (
                  <ul className="mt-8 divide-y divide-dashed divide-line border-y border-dashed border-line">
                    {uncappedMoves.map((m) => (
                      <li key={m.txHash} className="flex flex-wrap items-center justify-between gap-3 py-4 font-mono text-[15px]">
                        <span className="rounded-full bg-alert px-3 py-1 text-xs uppercase tracking-[0.06em] text-ink">Uncapped</span>
                        <span>{tokens(m.amount, s.data.token.decimals)} tokens</span>
                        <span>
                          to{" "}
                          <a href={basescanAddress(m.to)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                            {short(m.to)}
                          </a>
                        </span>
                        <span className="text-muted">block {Number(m.blockNumber).toLocaleString("en-US")}</span>
                        <a href={basescanTx(m.txHash)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                          transaction
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            );
          })()
        )}
      </div>
    </section>
  );
}
