import { ProductPeek } from "./ProductPeek";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...stroke}>
    <path d={d} />
  </svg>
);

const POINTS = [
  {
    who: "Holders",
    title: "One number per day",
    body: "The team's daily cap is on chain. Raising it takes a new signed permission, and the live page shows every one.",
    icon: <Icon d="M4 12h16M4 6h16M4 18h10" />,
  },
  {
    who: "Holders",
    title: "Workarounds get flagged",
    body: "If tokens leave the team account any way other than Sellvane, the live page shows it in red with the transaction.",
    icon: <Icon d="M12 4 3 20h18zM12 10v4M12 17h.01" />,
  },
  {
    who: "Teams",
    title: "Proceeds come straight back",
    body: "The ETH from every sale lands in the team account in the same transaction. Sellvane never holds it.",
    icon: <Icon d="M12 4v12M6 10l6 6 6-6M5 20h14" />,
  },
  {
    who: "Teams",
    title: "Sell without crashing your chart",
    body: "The agent sells in slices the pool can take, so holders see a plan instead of a dump.",
    icon: <Icon d="M4 20h16M7 16V9M12 16V5M17 16v-4" />,
  },
];

export function Audiences({ slug }: { slug: string }) {
  return (
    <section aria-labelledby="audiences-title" className="bg-canvas">
      <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 md:py-[120px]">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">For holders and teams</p>
            <h2 id="audiences-title" className="mt-4 font-display text-[38px] leading-[1.1] md:text-[54px] md:leading-[1.05]">
              Know the most the team can sell today.
            </h2>
            <p className="mt-6 max-w-[520px] text-lg leading-[1.6] text-muted">
              Holders get a limit they can check. Teams still get paid for their work, without crashing their own chart.
            </p>
          </div>
          <ProductPeek slug={slug} />
        </div>

        <ul className="mt-14 grid gap-10 sm:grid-cols-2 md:mt-16 lg:grid-cols-4 lg:gap-10">
          {POINTS.map((p) => (
            <li key={p.title} className="border-t border-dashed border-line pt-6">
              <div className="flex items-center justify-between">
                <span className="text-ink">{p.icon}</span>
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-muted">{p.who}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold tracking-[-0.02em]">{p.title}</h3>
              <p className="mt-3 text-base leading-[1.6] text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
