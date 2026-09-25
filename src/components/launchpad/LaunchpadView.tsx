import { Lookup } from "../Lookup";
import { TokensTable } from "./TokensTable";
import { RequireIt } from "./RequireIt";

export function LaunchpadView() {
  return (
    <>
      <section aria-labelledby="lp-title" className="mx-auto max-w-[1200px] px-4 pb-10 pt-12 md:px-6 md:pt-16">
        <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">For launchpads</p>
        <h1 id="lp-title" className="mt-4 max-w-[1100px] font-display text-[44px] leading-[1.05] md:text-[64px]">
          Every launch, capped in public.
        </h1>
        <p className="mt-4 max-w-[680px] text-lg leading-[1.6] text-muted">
          One view of every capped token: how much each team may sell today, what it sold, and anything that left the team account outside the cap.
        </p>
        <div className="mt-8 max-w-[640px]">
          <Lookup />
        </div>
      </section>
      <TokensTable />
      <RequireIt />
    </>
  );
}
