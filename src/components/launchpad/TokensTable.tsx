import Link from "next/link";
import { basescanAddress, basescanTx, short, tokens, utcTime } from "@/lib/format";
import type { TokenData, TokenState } from "@/lib/useToken";

const STAMP: Record<string, string> = { SELL: "Sold", WAIT: "Waited", SKIP: "Paused", BLOCKED: "Blocked" };

function lastMove(d: TokenData) {
  const m = d.decisions[0];
  if (!m) return <span className="text-muted">none yet</span>;
  const text = `${STAMP[m.action] ?? m.action} ${utcTime(m.at)}`;
  return m.txHash ? (
    <a href={basescanTx(m.txHash)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
      {text}
    </a>
  ) : (
    text
  );
}

function Uncapped({ n }: { n: number }) {
  return n > 0 ? (
    <span className="rounded-full bg-alert px-3 py-1 text-xs uppercase tracking-[0.06em] text-ink">{n} uncapped</span>
  ) : (
    <span>0</span>
  );
}

export function TokensTable({ s }: { s: TokenState }) {
  return (
    <section id="tokens" aria-labelledby="tokens-title" className="scroll-mt-6 mx-auto max-w-[1200px] px-4 md:px-6">
      <div className="rounded-[20px] bg-card p-6 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tokens-title" className="font-eyebrow text-sm uppercase tracking-[0.08em]">
            Your tokens
          </h2>
          <p className="text-sm text-muted">Only tokens with a live Sellvane cap are listed. Today that is one.</p>
        </div>

        {s.status === "error" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-base">Base did not answer. Rows are hidden until it does.</p>
            <button onClick={s.retry} className="rounded-full bg-ink px-6 py-3 text-base font-medium text-white hover:bg-[#1a1a1a]">
              Try again
            </button>
          </div>
        ) : s.status === "loading" ? (
          <div className="mt-8 space-y-3" aria-hidden="true">
            <div className="h-5 w-full rounded-full bg-line" />
            <div className="h-5 w-5/6 rounded-full bg-line" />
          </div>
        ) : (
          (() => {
            const d = s.data;
            const tokenCell = (
              <a href={basescanAddress(d.token.address)} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">
                Sellvane test token
              </a>
            );
            const rows: [string, React.ReactNode][] = [
              ["Team account", <a key="t" href={basescanAddress(d.team.address)} target="_blank" rel="noopener noreferrer" className="font-mono underline underline-offset-4">{short(d.team.address)}</a>],
              ["Cap / day", <span key="c" className="font-mono">{tokens(d.cap.allowance)}</span>],
              ["Sold today", <span key="s" className="font-mono">{tokens(d.cap.spentThisPeriod)}</span>],
              ["Left", <span key="l" className="font-mono">{tokens(d.cap.remaining)}</span>],
              ["Went around the cap", <Uncapped key="u" n={d.uncappedMoves.length} />],
              ["Last agent move", <span key="m">{lastMove(d)}</span>],
            ];
            return (
              <>
                {/* Desktop: a real table. */}
                <div className="mt-8 hidden overflow-x-auto lg:block">
                  <table className="w-full text-left text-[15px]">
                    <thead>
                      <tr className="border-b border-ink text-sm text-muted">
                        <th className="py-3 pr-4 font-normal">Token</th>
                        {rows.map(([h]) => (
                          <th key={h} className="py-3 pr-4 font-normal">{h}</th>
                        ))}
                        <th className="py-3 font-normal"><span className="sr-only">Page</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-dashed border-line">
                        <td className="py-5 pr-4">{tokenCell}</td>
                        {rows.map(([h, v]) => (
                          <td key={h} className="py-5 pr-4">{v}</td>
                        ))}
                        <td className="py-5 text-right">
                          <Link href="/live" className="whitespace-nowrap font-medium underline-offset-4 hover:underline">Open →</Link>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Phones and tablets: the same row as a list. */}
                <div className="mt-8 lg:hidden">
                  <div className="border-b border-ink pb-3">{tokenCell}</div>
                  <dl className="divide-y divide-dashed divide-line">
                    {rows.map(([h, v]) => (
                      <div key={h} className="flex items-center justify-between gap-4 py-3 text-[15px]">
                        <dt className="text-muted">{h}</dt>
                        <dd className="text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link href="/live" className="mt-4 inline-block font-medium underline underline-offset-4">Open the live page →</Link>
                </div>
              </>
            );
          })()
        )}
      </div>
    </section>
  );
}
