import Link from "next/link";

export function ForLaunchpads() {
  return (
    <section aria-labelledby="launchpads-title" className="bg-butter">
      <div data-reveal="stagger" className="mx-auto grid max-w-[1200px] items-end gap-10 px-4 py-20 md:grid-cols-[1fr_auto] md:gap-16 md:px-6 md:py-[120px]">
        <div>
          <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">For launchpads</p>
          <h2 id="launchpads-title" className="mt-4 max-w-[720px] font-display text-[38px] leading-[1.1] md:text-[54px] md:leading-[1.05]">
            Make capped team selling a listing rule.
          </h2>
          <p className="mt-6 max-w-[620px] text-lg leading-[1.6] text-ink/75">
            Your reputation rides on every token you launch. Ask each team to set a Sellvane cap before listing, link the live page from your listing, and treat any move around the cap as a breach.
          </p>
        </div>
        <Link
          href="/launchpad"
          className="justify-self-start rounded-full bg-marigold px-8 py-4 text-base font-medium text-ink ring-1 ring-ink transition-colors hover:bg-marigold-deep md:justify-self-end"
        >
          See the launchpad view →
        </Link>
      </div>
    </section>
  );
}
