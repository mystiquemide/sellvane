import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { StartFlow } from "@/components/start/StartFlow";

export const metadata: Metadata = {
  title: "Cap your token | Sellvane",
  description: "Set a public daily sell cap on your team's tokens with one signature from your Base Account.",
};

export default function StartPage() {
  return (
    <>
      {/* No yellow nav button here: the page's one primary action is the step button. */}
      <Nav
        back
        cta={<></>}
        links={[
          { href: "/launchpad", label: "Capped tokens" },
          { href: "/live", label: "Live cap" },
        ]}
      />
      <main id="main" tabIndex={-1}>
        <section aria-labelledby="start-title" className="mx-auto max-w-[1200px] px-4 pb-10 pt-12 md:px-6 md:pt-16">
          <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">For teams</p>
          <h1 id="start-title" className="mt-4 max-w-[1100px] font-display text-[44px] leading-[1.05] md:text-[64px]">
            Cap your token in three steps.
          </h1>
          <p className="mt-4 max-w-[680px] text-lg leading-[1.6] text-muted">
            One signature from your team&apos;s Base Account. No custody, no deposit. You can revoke it any time.
          </p>
          <p className="mt-5 max-w-[680px] rounded-[16px] bg-butter px-5 py-3 text-base leading-[1.5]">
            Your unlocked tokens must sit in a Coinbase Base Account (smart wallet). If they are in a multisig or another wallet, move the amount you plan to sell there first.
          </p>
        </section>
        <StartFlow seller={process.env.SELLER_ADDRESS!} />
      </main>
    </>
  );
}
