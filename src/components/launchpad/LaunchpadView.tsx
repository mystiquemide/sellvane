"use client";

import { useToken } from "@/lib/useToken";
import { TokensTable } from "./TokensTable";
import { RequireIt } from "./RequireIt";

export function LaunchpadView() {
  const s = useToken();
  return (
    <>
    <section aria-labelledby="lp-title" className="mx-auto max-w-[1200px] px-4 pb-10 pt-12 md:px-6 md:pt-16">
      <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">For launchpads</p>
      <h1 id="lp-title" className="mt-4 max-w-[1100px] font-display text-[44px] leading-[1.05] md:text-[64px]">
        Every launch, capped in public.
      </h1>
      <p className="mt-4 max-w-[680px] text-lg leading-[1.6] text-muted">
        One view of every token you launched: how much each team may sell today, what it sold, and anything that left the team account outside the cap.
      </p>
      <p className="mt-6 font-mono text-sm text-muted" aria-live="polite">
        {s.status === "ready"
          ? `updated ${s.data.readAt.slice(11, 19)} UTC, block ${Number(s.data.block).toLocaleString("en-US")}`
          : s.status === "loading"
            ? "reading Base..."
            : "Base did not answer"}
      </p>
    </section>
    <TokensTable s={s} />
    <RequireIt />
    </>
  );
}
