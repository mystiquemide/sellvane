import { basescanTx, pct, tokens } from "@/lib/format";
import type { TokenData, TokenState } from "@/lib/useToken";

type Row = TokenData["decisions"][number];

const STAMP: Record<Row["action"], string> = { SELL: "Sold", WAIT: "Waited", SKIP: "Paused", BLOCKED: "Blocked" };
const BY: Record<string, string> = { model: "agent", fallback: "agent, safe default", rule: "rule", manual: "by hand" };

/** Torn paper edge, drawn as a repeating zigzag in the receipt color. */
function Tear({ flip = false }: { flip?: boolean }) {
  return (
    <svg className={`block h-3 w-full ${flip ? "rotate-180" : ""}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={`tear-${flip ? "b" : "t"}`} width="16" height="12" patternUnits="userSpaceOnUse">
          <polygon points="0,12 8,0 16,12" fill="#FFF5CC" />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill={`url(#tear-${flip ? "b" : "t"})`} />
    </svg>
  );
}

function Stamp({ action }: { action: Row["action"] }) {
  const style =
    action === "SELL"
      ? "bg-marigold text-ink"
      : action === "BLOCKED"
        ? "bg-ink text-white"
        : "border border-ink text-ink";
  return <span className={`inline-block min-w-[84px] rounded-full px-3 py-1 text-center text-xs uppercase tracking-[0.06em] ${style}`}>{STAMP[action]}</span>;
}

function Line({ d }: { d: Row }) {
  const when = new Date(d.at);
  return (
    <li className="grid gap-x-6 gap-y-2 border-b border-dashed border-ink/20 py-5 last:border-b-0 md:grid-cols-[110px_110px_1fr_auto]">
      <div className="font-mono text-sm">
        <div>{when.toISOString().slice(11, 16)} UTC</div>
        <div className="text-muted">{when.toISOString().slice(5, 10).replace("-", "/")}</div>
      </div>
      <div>
        <Stamp action={d.action} />
      </div>
      <div>
        <p className="font-mono text-[15px]">
          {d.amountIn ? `${tokens(d.amountIn)} tokens` : "No sale"}
          {d.action === "SELL" && d.impactBps != null ? `, ${pct(d.impactBps)} impact` : ""}
          <span className="text-muted">, {tokens(d.remainingBefore)} left before</span>
        </p>
        <p className="mt-1 text-base leading-[1.5]">&ldquo;{d.reason}&rdquo;</p>
        <p className="mt-1 text-sm text-muted">Decided by: {BY[d.source] ?? d.source}</p>
      </div>
      <div className="font-mono text-sm md:text-right">
        {d.txHash ? (
          <a href={basescanTx(d.txHash)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            {d.txStatus === "reverted" ? "refused tx" : "transaction"}
          </a>
        ) : (
          <span className="text-muted">no transaction</span>
        )}
      </div>
    </li>
  );
}

export function AgentLedger({ s }: { s: TokenState }) {
  return (
    <section id="agent" aria-labelledby="agent-title" className="scroll-mt-6 mx-auto mt-16 max-w-[1200px] px-4 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">Agent moves</p>
          <h2 id="agent-title" className="mt-4 font-display text-[38px] leading-[1.1] md:text-[54px] md:leading-[1.05]">
            Every sale, every wait.
          </h2>
        </div>
        <p className="max-w-[420px] text-base text-muted">Newest first. Each line shows why the agent acted and links to the transaction on Base.</p>
      </div>

      <div className="mt-10">
        <Tear />
        <div className="bg-butter px-5 md:px-10">
          {s.status === "error" ? (
            <div className="flex flex-wrap items-center justify-between gap-4 py-8">
              <p className="text-base">Base did not answer. Moves are hidden until it does.</p>
              <button onClick={s.retry} className="rounded-full bg-ink px-6 py-3 text-base font-medium text-white hover:bg-[#1a1a1a]">
                Try again
              </button>
            </div>
          ) : s.status === "loading" ? (
            <ul aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="border-b border-dashed border-ink/20 py-6 last:border-b-0">
                  <div className="h-5 w-3/4 rounded-full bg-ink/10" />
                  <div className="mt-3 h-4 w-1/2 rounded-full bg-ink/10" />
                </li>
              ))}
            </ul>
          ) : s.data.decisions.length === 0 ? (
            <p className="py-8 text-base">No moves yet. The first check will appear here with its reason.</p>
          ) : (
            <ul>
              {s.data.decisions.map((d) => (
                <Line key={d.id} d={d} />
              ))}
            </ul>
          )}
        </div>
        <Tear flip />
      </div>
    </section>
  );
}
