"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";
import { basescanAddress, short, tokenLabel, tokens } from "@/lib/format";

export type Checked = {
  token: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  pool: { address: string; fee: number; wethReserve: string };
  alreadyCapped: { teamAccount: string } | null;
};

function eth(wei: string): string {
  const n = Number(wei) / 1e18;
  if (n === 0) return "0";
  if (n >= 0.001) return n.toFixed(4);
  return n.toFixed(Math.min(18, Math.ceil(-Math.log10(n)) + 2));
}

function StepShell({ n, title, active, children }: { n: number; title: string; active: boolean; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className={`rounded-[20px] p-6 md:p-10 ${active ? "bg-card" : "bg-card/60"}`}>
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-sm text-muted">0{n}</span>
        <h2 id={`step-${n}`} className="font-display text-[26px] leading-[1.2] md:text-[32px]">
          {title}
        </h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Step 1: paste the token, read it from Base, find its pool. */
function TokenStep({ onChecked }: { onChecked: (c: Checked | null) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Checked | null>(null);

  const run = useCallback(async (raw: string) => {
    const v = raw.trim();
    setChecked(null);
    onChecked(null);
    if (!isAddress(v)) {
      setError("Paste the token's contract address on Base (0x followed by 40 characters).");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/check?token=${v}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Base did not answer. Try again.");
      setChecked(j);
      onChecked(j);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [onChecked]);

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    run(value);
  };

  // /start?token=0x... arrives pre-filled, e.g. from a token's "not capped" page.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) return;
    queueMicrotask(() => {
      setValue(t);
      run(t);
    });
  }, [run]);

  return (
    <>
      <form onSubmit={check} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="token-address" className="sr-only">
          Token address on Base
        </label>
        <input
          id="token-address"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Token address on Base, 0x..."
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-[16px] border-[1.5px] border-[#cccbc7] bg-white px-4 py-3 font-mono text-[15px] placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-marigold px-8 py-3 text-base font-medium text-ink transition-colors hover:bg-marigold-deep disabled:cursor-wait"
        >
          {busy ? "Reading Base..." : "Check token"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-[16px] bg-butter px-5 py-3 text-base" role="alert">
          {error}
        </p>
      ) : null}

      {checked ? (
        <>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Token", tokenLabel(checked)],
              ["Total supply", tokens(checked.totalSupply, checked.decimals)],
              ["Uniswap v3 pool", `${checked.pool.fee / 10000}% fee tier`],
              ["ETH in the pool", eth(checked.pool.wethReserve)],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-dashed border-line pt-4">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="mt-1 font-mono text-lg">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-muted">
            Read from Base.{" "}
            <a href={basescanAddress(checked.token)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              Token on BaseScan
            </a>
            {" · "}
            <a href={basescanAddress(checked.pool.address)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              Pool on BaseScan
            </a>
          </p>
          {checked.alreadyCapped ? (
            <p className="mt-4 rounded-[16px] bg-butter px-5 py-3 text-base">
              This token is already capped by team account {short(checked.alreadyCapped.teamAccount)}. Only that account can change its cap.{" "}
              <Link href={`/live/${checked.token.toLowerCase()}`} className="font-medium underline underline-offset-4">
                See its live page →
              </Link>
            </p>
          ) : null}
        </>
      ) : null}
    </>
  );
}

export function StartFlow() {
  const [, setChecked] = useState<Checked | null>(null);
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6 px-4 pb-24 md:px-6">
      <StepShell n={1} title="Your token" active>
        <TokenStep onChecked={setChecked} />
      </StepShell>
    </div>
  );
}
