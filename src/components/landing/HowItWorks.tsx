import { VaneMark } from "../Logo";

function SignIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17c2.5 0 3.5-6 6-6s1.5 5 4 5 2.5-3 4-3" />
      <path d="M3 21h18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
      <path d="m8 10.5 2 2 3.5-4" />
    </svg>
  );
}

const STEPS = [
  {
    icon: <SignIcon />,
    title: "The team sets a daily cap",
    body: "Signed once from the team's Base Account. Raising it takes a new signed permission, and the live page shows every one.",
  },
  {
    icon: <VaneMark className="h-6 w-6" />,
    title: "The agent sells inside it",
    body: "Only when the pool can take the sale without moving the price more than 1%. Thin pool? It waits and says why.",
  },
  {
    icon: <CheckIcon />,
    title: "Everyone can check",
    body: "Every sale, every wait and every blocked attempt is public, with a link to the transaction on Base.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-6 bg-canvas">
      <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-24 md:px-6 md:pb-[120px] md:pt-[120px]">
        <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">How it works</p>
        <h2 id="how-title" className="mt-4 max-w-[900px] font-display text-[38px] leading-[1.1] md:text-[54px] md:leading-[1.05]">
          Three steps. One hard limit.
        </h2>

        <ol className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-12">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t border-dashed border-line pt-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-butter text-ink">{s.icon}</span>
                <span className="font-mono text-sm text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-xl font-bold tracking-[-0.02em]">{s.title}</h3>
              <p className="mt-3 text-base leading-[1.6] text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
