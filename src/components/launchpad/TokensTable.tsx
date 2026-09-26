"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { basescanAddress, basescanTx, short, tokenLabel, tokens, tokensUp, utcTime } from "@/lib/format";
import { useToken, type TokenData } from "@/lib/useToken";

const STAMP: Record<string, string> = { SELL: "Sold", WAIT: "Waited", SKIP: "Paused", BLOCKED: "Blocked" };
const HEADERS = ["Token", "Team account", "Cap / day", "Sold today", "Left", "Outside Sellvane", "Last agent move"];

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
  return n > 0 ? <span className="rounded-full bg-alert px-3 py-1 text-xs uppercase tracking-[0.06em] text-ink">{n} uncapped</span> : <span>0</span>;
}

function cells(d: TokenData): React.ReactNode[] {
  const dec = d.token.decimals;
  return [
    <a key="k" href={basescanAddress(d.token.address)} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">
      {tokenLabel(d.token)}
    </a>,
    <a key="t" href={basescanAddress(d.team.address)} target="_blank" rel="noopener noreferrer" className="font-mono underline underline-offset-4">
      {short(d.team.address)}
    </a>,
    <span key="c" className="font-mono">{tokens(d.cap.allowance, dec)}</span>,
    <span key="s" className="font-mono">{tokensUp(d.cap.spentThisPeriod, dec)}</span>,
    <span key="l" className="font-mono">{tokens(d.cap.remaining, dec)}</span>,
    <Uncapped key="u" n={d.uncappedMoves.length} />,
    <span key="m">{lastMove(d)}</span>,
  ];
}

/** One token, read from Base on its own. Renders as a table row on desktop and a block on phones. */
function TokenRowView({ slug, layout }: { slug: string; layout: "row" | "block" }) {
  const s = useToken(slug);
  if (s.status === "notfound") return null;
  if (s.status !== "ready") {
    const msg = s.status === "loading" ? null : "Base did not answer for this token. Refresh the page to try again.";
    const skeleton = msg ?? <div className="h-5 w-full rounded-full bg-line" aria-hidden="true" />;
    return layout === "row" ? (
      <tr className="border-b border-dashed border-line">
        <td colSpan={HEADERS.length + 1} className="py-5">{skeleton}</td>
      </tr>
    ) : (
      <div className="border-b border-dashed border-line py-4">{skeleton}</div>
    );
  }
  const c = cells(s.data);
  if (layout === "row") {
    return (
      <tr className="border-b border-dashed border-line">
        {c.map((v, i) => (
          <td key={HEADERS[i]} className="py-5 pr-4">{v}</td>
        ))}
        <td className="py-5 text-right">
          <Link href={`/live/${slug}`} className="whitespace-nowrap font-medium underline-offset-4 hover:underline">View live cap →</Link>
        </td>
      </tr>
    );
  }
  return (
    <div className="border-b border-ink py-4 last:border-b-0">
      <div className="pb-2">{c[0]}</div>
      <dl className="divide-y divide-dashed divide-line">
        {c.slice(1).map((v, i) => (
          <div key={HEADERS[i + 1]} className="flex items-center justify-between gap-4 py-3 text-[15px]">
            <dt className="text-muted">{HEADERS[i + 1]}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <Link href={`/live/${slug}`} className="mt-2 inline-block font-medium underline underline-offset-4">Open the live page →</Link>
    </div>
  );
}

type Listed = { slug: string };

export function TokensTable() {
  const [list, setList] = useState<Listed[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/tokens", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { tokens: Listed[] }) => {
        if (!alive) return;
        setList(j.tokens);
        setFailed(false);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [nonce]);

  return (
    <section id="tokens" aria-labelledby="tokens-title" className="scroll-mt-6 mx-auto max-w-[1200px] px-4 md:px-6">
      <div className="rounded-[20px] bg-card p-6 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tokens-title" className="font-eyebrow text-sm uppercase tracking-[0.08em]">
            Capped tokens
          </h2>
          <p className="text-sm text-muted">
            {list
              ? `${list.length} ${list.length === 1 ? "token" : "tokens"} with a live Sellvane cap. Each row reads Base on its own.`
              : "Only tokens with a live Sellvane cap are listed."}
          </p>
        </div>

        {failed ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-base">The list did not load.</p>
            <button onClick={() => setNonce((n) => n + 1)} className="rounded-full bg-ink px-6 py-3 text-base font-medium text-white hover:bg-[#1a1a1a]">
              Try again
            </button>
          </div>
        ) : !list ? (
          <div className="mt-8 space-y-3" aria-hidden="true">
            <div className="h-5 w-full rounded-full bg-line" />
            <div className="h-5 w-5/6 rounded-full bg-line" />
          </div>
        ) : list.length === 0 ? (
          <p className="mt-6 text-base">
            No tokens are capped yet.{" "}
            <Link href="/start" className="font-medium underline underline-offset-4">
              Cap the first one →
            </Link>
          </p>
        ) : (
          <>
            <div className="mt-8 hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="border-b border-ink text-sm text-muted">
                    {HEADERS.map((h) => (
                      <th key={h} className="py-3 pr-4 font-normal">{h}</th>
                    ))}
                    <th className="py-3 font-normal">
                      <span className="sr-only">Page</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <TokenRowView key={t.slug} slug={t.slug} layout="row" />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 lg:hidden">
              {list.map((t) => (
                <TokenRowView key={t.slug} slug={t.slug} layout="block" />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
