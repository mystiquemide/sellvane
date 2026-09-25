/* eslint-disable @next/next/no-img-element -- plain SVG logos, no optimization needed */

const LOGOS = [
  { src: "/logos/base.svg", name: "Base", use: "The chain the cap lives on", h: "h-7", href: "https://base.org" },
  { src: "/logos/coinbase.svg", name: "Coinbase", use: "Spend permissions and Smart Wallet", h: "h-5", href: "https://docs.base.org/base-account/improve-ux/spend-permissions" },
  { src: "/logos/uniswap.svg", name: "Uniswap", use: "The pool the agent sells into", h: "h-8", href: "https://uniswap.org" },
  { src: "/logos/groq.svg", name: "Groq", use: "The agent's reasoning", h: "h-8", href: "https://groq.com" },
];

export function BuiltWith() {
  return (
    <section aria-labelledby="built-title" className="bg-canvas">
      <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 md:py-24">
        <h2 id="built-title" className="font-eyebrow text-sm uppercase tracking-[0.08em]">
          Built with
        </h2>
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4 md:gap-12">
          {LOGOS.map((l) => (
            <li key={l.name} className="border-t border-dashed border-line pt-6">
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="group block" aria-label={`${l.name}: ${l.use}`}>
                <span className="flex h-10 items-center">
                  <img src={l.src} alt={l.name} className={`${l.h} w-auto max-w-full`} />
                </span>
                <span className="mt-4 block text-[15px] leading-[1.5] text-muted group-hover:text-ink">{l.use}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
