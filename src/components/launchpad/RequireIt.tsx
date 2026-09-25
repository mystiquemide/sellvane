const STEPS = [
  {
    title: "Ask for the cap before listing",
    body: "The team signs one Sellvane permission from its Base Account. It sets the most the team account can sell per day, and it lives on chain.",
  },
  {
    title: "Link the live page from your listing",
    body: "Holders see the cap, today's sales and the agent's reasons on one page. The cap and every sale can be checked on Base without trusting the team or Sellvane.",
  },
  {
    title: "Treat a move around the cap as a breach",
    body: "If tokens leave the team account any other way, the live page and this view flag it in red with the transaction. You decide the consequence.",
  },
];

export function RequireIt() {
  return (
    <>
      <section id="require" aria-labelledby="require-title" className="scroll-mt-6 mx-auto max-w-[1200px] px-4 pt-20 md:px-6 md:pt-24">
        <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">How to require it</p>
        <h2 id="require-title" className="mt-4 max-w-[900px] font-display text-[38px] leading-[1.1] md:text-[54px] md:leading-[1.05]">
          Three steps for every launch.
        </h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t border-dashed border-line pt-6">
              <span className="font-mono text-sm text-muted">0{i + 1}</span>
              <h3 className="mt-4 text-xl font-bold tracking-[-0.02em]">{s.title}</h3>
              <p className="mt-3 text-base leading-[1.6] text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="talk-title" className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 md:py-24">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[20px] bg-butter p-6 md:p-10">
          <div>
            <h2 id="talk-title" className="font-display text-[26px] leading-[1.2] md:text-[38px]">
              Running a launchpad?
            </h2>
            <p className="mt-2 max-w-[560px] text-base leading-[1.6]">Tell us about your next launch. We will set up the cap with the team.</p>
          </div>
          <a
            href="https://x.com/sellvane"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-marigold px-8 py-4 text-base font-medium text-ink ring-1 ring-ink transition-colors hover:bg-marigold-deep"
          >
            Talk to us on X →
          </a>
        </div>
      </section>
    </>
  );
}
