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

export type Limits = { capRaw: bigint; impactBps: number };

const PICKS = [10, 25, 50, 100]; // basis points of supply: 0.1%, 0.25%, 0.5%, 1%
const IMPACTS = [50, 100, 200];

type Preview = { maxSale: { amountIn: string; ethOut: string } | null; smallest: { amountIn: string; impactBps: number } | null };

/** Step 2: the daily cap and the price impact limit, with a live preview from the pool. */
function LimitsStep({ c, onLimits }: { c: Checked; onLimits: (l: Limits | null) => void }) {
  const unit = BigInt(10) ** BigInt(c.decimals);
  const supplyWhole = BigInt(c.totalSupply) / unit;
  const [capText, setCapText] = useState(() => ((supplyWhole * BigInt(50)) / BigInt(10000)).toString());
  const [impactBps, setImpactBps] = useState(100);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState(false);

  const capWhole = /^[0-9]+$/.test(capText) ? BigInt(capText) : null;
  const capError =
    capWhole === null ? "Enter a whole number of tokens." : capWhole === BigInt(0) ? "The cap must be above zero." : capWhole > supplyWhole ? "The cap cannot be more than the total supply." : null;
  const pctOfSupply = capWhole && supplyWhole > BigInt(0) ? Number((capWhole * BigInt(1_000_000)) / supplyWhole) / 10000 : 0;

  useEffect(() => {
    onLimits(capError || capWhole === null ? null : { capRaw: capWhole * unit, impactBps });
  }, [capError, capWhole, impactBps, onLimits, unit]);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ token: c.token, pool: c.pool.address, fee: String(c.pool.fee), decimals: String(c.decimals), impactBps: String(impactBps) });
    fetch(`/api/quote?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: Preview) => {
        if (!alive) return;
        setPreview(j);
        setPreviewError(false);
      })
      .catch(() => {
        if (alive) setPreviewError(true);
      });
    return () => {
      alive = false;
    };
  }, [c, impactBps]);

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <label htmlFor="cap" className="block text-base font-medium">
          Most the team can sell per day
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="cap"
            inputMode="numeric"
            value={capText}
            onChange={(e) => setCapText(e.target.value.replace(/[,\s]/g, ""))}
            className="min-w-0 flex-1 rounded-[16px] border-[1.5px] border-[#cccbc7] bg-white px-4 py-3 font-mono text-[17px] focus:border-ink focus:outline-none"
            aria-describedby="cap-help"
          />
          <span className="font-mono text-base text-muted">{tokenLabel(c) === "Sellvane test token" ? "tokens" : c.symbol}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick picks, share of total supply">
          {PICKS.map((bps) => (
            <button
              key={bps}
              type="button"
              onClick={() => setCapText(((supplyWhole * BigInt(bps)) / BigInt(10000)).toString())}
              className="rounded-full border border-ink px-4 py-1.5 text-sm hover:bg-butter"
            >
              {bps / 100}% of supply
            </button>
          ))}
        </div>
        <p id="cap-help" className={`mt-3 text-sm ${capError ? "text-ink" : "text-muted"}`} role={capError ? "alert" : undefined}>
          {capError ?? `${Number(pctOfSupply.toFixed(2))}% of the total supply of ${supplyWhole.toLocaleString("en-US")}. Resets every 24 hours.`}
        </p>

        <fieldset className="mt-8">
          <legend className="text-base font-medium">Max price impact per sale</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {IMPACTS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setImpactBps(b)}
                aria-pressed={impactBps === b}
                className={`rounded-full px-5 py-2 text-base ${impactBps === b ? "bg-ink text-white" : "border border-ink hover:bg-butter"}`}
              >
                {b / 100}%
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">The agent waits instead of selling when a sale would move the price more than this.</p>
        </fieldset>
      </div>

      <div className="rounded-[16px] bg-butter p-5 md:p-6" aria-live="polite">
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em]">Preview from the pool, right now</p>
        {previewError ? (
          <p className="mt-3 text-base">Base did not answer, so there is no preview. Your limits still work.</p>
        ) : !preview ? (
          <div className="mt-4 space-y-3" aria-hidden="true">
            <div className="h-5 w-3/4 rounded-full bg-ink/10" />
            <div className="h-5 w-1/2 rounded-full bg-ink/10" />
          </div>
        ) : preview.maxSale ? (
          <>
            <p className="mt-3 text-lg leading-[1.5]">
              At {impactBps / 100}%, the agent could sell about <span className="font-mono">{tokens(preview.maxSale.amountIn, c.decimals)}</span> {c.symbol} in one sale, for about{" "}
              <span className="font-mono">{eth(preview.maxSale.ethOut)} ETH</span>.
            </p>
            {capWhole && capWhole > BigInt(0) ? (
              <p className="mt-3 text-base">
                Selling your full daily cap would take about{" "}
                <span className="font-mono">
                  {((capWhole * unit + BigInt(preview.maxSale.amountIn) - BigInt(1)) / BigInt(preview.maxSale.amountIn)).toLocaleString("en-US")}
                </span>{" "}
                sales at today&apos;s depth. The agent spreads them out and waits when the pool is thin.
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-base">
            The pool is too thin: even {preview.smallest ? tokens(preview.smallest.amountIn, c.decimals) : "a small sale"} would move the price more than {impactBps / 100}%. The agent would wait until depth improves.
          </p>
        )}
      </div>
    </div>
  );
}

export function StartFlow() {
  const [checked, setChecked] = useState<Checked | null>(null);
  const [, setLimits] = useState<Limits | null>(null);
  const ready = checked && !checked.alreadyCapped;
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6 px-4 pb-24 md:px-6">
      <StepShell n={1} title="Your token" active>
        <TokenStep onChecked={setChecked} />
      </StepShell>
      <StepShell n={2} title="Your daily limit" active={!!ready}>
        {ready ? <LimitsStep key={checked.token} c={checked} onLimits={setLimits} /> : <p className="text-base text-muted">Check a token first.</p>}
      </StepShell>
    </div>
  );
}
