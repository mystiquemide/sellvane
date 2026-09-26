import { basescanTx, pct, tokens } from "@/lib/format";
import type { LiveState, TokenData } from "@/lib/useToken";

type Row = TokenData["decisions"][number];

const STAMP: Record<Row["action"], string> = { SELL: "Sold", WAIT: "Waited", SKIP: "Paused", BLOCKED: "Blocked" };
const BY: Record<string, string> = {
  model: "Decided by the agent",
  fallback: "Model did not answer, safe default used",
  rule: "Decided by a fixed rule",
  manual: "Sent by hand as a proof",
};
const REASON_LABEL: Record<string, string> = { model: "The agent's reason", fallback: "Note", rule: "Rule", manual: "Note" };

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
        ? "bg-white text-ink"
        : "border border-ink text-ink";
  return <span className={`inline-block min-w-[84px] rounded-full px-3 py-1 text-center text-xs uppercase tracking-[0.06em] ${style}`}>{STAMP[action]}</span>;
}

/** Back-to-back waits read as one line, so sales and refused attempts never get buried. */
type Group = { kind: "one"; d: Row } | { kind: "waits"; latest: Row; earliest: Row; count: number };

function group(rows: Row[]): Group[] {
  const out: Group[] = [];
  for (const d of rows) {
    const prev = out[out.length - 1];
    if (d.action === "WAIT" && prev && prev.kind === "waits") {
      prev.earliest = d;
      prev.count += 1;
    } else if (d.action === "WAIT" && prev && prev.kind === "one" && prev.d.action === "WAIT") {
      out[out.length - 1] = { kind: "waits", latest: prev.d, earliest: d, count: 2 };
    } else {
      out.push({ kind: "one", d });
    }
  }
  return out;
}

function WaitGroup({ g, dec }: { g: Extract<Group, { kind: "waits" }>; dec: number }) {
  const hm = (iso: string) => new Date(iso).toISOString().slice(11, 16);
  const day = (iso: string) => new Date(iso).toISOString().slice(5, 10).replace("-", "/");
  return (
    <li className="grid gap-x-6 gap-y-2 border-b border-dashed border-ink/20 py-5 last:border-b-0 md:grid-cols-[110px_110px_1fr_auto]">
      <div className="font-mono text-sm">
        <div>
          {hm(g.earliest.at)} to {hm(g.latest.at)} UTC
        </div>
        <div className="text-muted">
          {day(g.earliest.at) === day(g.latest.at) ? day(g.latest.at) : `${day(g.earliest.at)} to ${day(g.latest.at)}`}
        </div>
      </div>
      <div>
        <Stamp action="WAIT" />
      </div>
      <div>
        <p className="font-mono text-[15px]">
          Waited {g.count} times<span className="text-muted">, {tokens(g.latest.remainingBefore, dec)} left</span>
        </p>
        <p className="mt-2 text-base leading-[1.5]">
          <span className="text-muted">{REASON_LABEL[g.latest.source] ?? "Note"}, latest: </span>&ldquo;{g.latest.reason}&rdquo;
        </p>
        <p className="mt-1 text-sm text-muted">{BY[g.latest.source] ?? g.latest.source}</p>
      </div>
      <div />
    </li>
  );
}

function Line({ d, dec }: { d: Row; dec: number }) {
  const when = new Date(d.at);
  const blocked = d.action === "BLOCKED";
  // The refused sale is the cleanest proof the limit holds, so it prints inverted.
  const tone = blocked ? "-mx-5 bg-ink px-5 text-white md:-mx-10 md:px-10 [&_.text-muted]:text-white/70" : "";
  return (
    <li className={`grid gap-x-6 gap-y-2 border-b border-dashed border-ink/20 py-5 last:border-b-0 md:grid-cols-[110px_110px_1fr_auto] ${tone}`}>
      <div className="font-mono text-sm">
        <div>{when.toISOString().slice(11, 16)} UTC</div>
        <div className="text-muted">{when.toISOString().slice(5, 10).replace("-", "/")}</div>
      </div>
      <div>
        <Stamp action={d.action} />
      </div>
      <div>
        <p className="font-mono text-[15px]">
          {d.amountIn ? `${tokens(d.amountIn, dec)} tokens` : "No sale"}
          {d.action === "SELL" && d.impactBps != null ? `, ${pct(d.impactBps)} impact` : ""}
          <span className="text-muted">, {tokens(d.remainingBefore, dec)} left before</span>
        </p>
        <p className="mt-2 text-base leading-[1.5]">
          <span className="text-muted">{REASON_LABEL[d.source] ?? "Note"}: </span>&ldquo;{d.reason}&rdquo;
        </p>
        <p className="mt-1 text-sm text-muted">{BY[d.source] ?? d.source}</p>
      </div>
      <div className="font-mono text-sm md:text-right">
        {d.txHash ? (
          <a href={basescanTx(d.txHash)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            {d.txStatus === "reverted" ? "refused tx" : "transaction"}
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function AgentLedger({ s }: { s: LiveState }) {
  return (
    <section id="agent" aria-labelledby="agent-title" className="scroll-mt-6 mx-auto mt-16 max-w-[1200px] px-4 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">Agent moves</p>
          <h2 id="agent-title" className="mt-4 font-display text-[38px] leading-[1.1] md:text-[54px] md:leading-[1.05]">
            Every move, with its reason.
          </h2>
        </div>
        <p className="max-w-[420px] text-base text-muted">Newest first. Sales, waits and refused attempts all appear here, each with its reason and a transaction link where one exists.</p>
      </div>

      <div className="mt-10">
        <Tear />
        <div className="bg-butter px-5 md:px-10">
          {s.status === "error" ? (
            <div className="flex flex-wrap items-center justify-between gap-4 py-8">
              <p className="text-base">Base did not answer, so these moves are hidden rather than shown out of date.</p>
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
              {group(s.data.decisions).map((g) =>
                g.kind === "one" ? (
                  <Line key={g.d.id} d={g.d} dec={s.data.token.decimals} />
                ) : (
                  <WaitGroup key={g.latest.id} g={g} dec={s.data.token.decimals} />
                ),
              )}
            </ul>
          )}
        </div>
        <Tear flip />
      </div>
    </section>
  );
}
