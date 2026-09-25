import Link from "next/link";
import { Logo } from "./Logo";
import { deployment } from "@/lib/chain/config";
import { basescanAddress } from "@/lib/format";

type FooterLink = { label: string; href: string; external?: boolean };

export function Footer() {
  const d = deployment();
  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Live cap", href: "/live" },
        { label: "Cap your token", href: "/start" },
        { label: "Launchpad view", href: "/launchpad" },
        { label: "How it works", href: "/#how-it-works" },
      ],
    },
    {
      title: "On Base",
      links: [
        { label: "Team account", href: basescanAddress(d.team), external: true },
        { label: "Seller contract", href: basescanAddress(d.seller), external: true },
        { label: "Uniswap pool", href: basescanAddress(d.pool), external: true },
      ],
    },
    {
      title: "Follow",
      links: [
        { label: "X", href: "https://x.com/sellvane", external: true },
        { label: "Telegram", href: "https://t.me/sellvane_bot", external: true },
        { label: "GitHub", href: "https://github.com/mystiquemide/sellvane", external: true },
      ],
    },
  ];

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-20 md:px-6">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" aria-label="Sellvane home" className="text-white">
              <Logo />
            </Link>
            <p className="mt-5 max-w-[300px] text-base leading-[1.6] text-white/70">Unlocks without the dump. A public daily sell cap on team tokens, enforced on Base.</p>
          </div>

          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="font-eyebrow text-sm uppercase tracking-[0.08em] text-white/60">{c.title}</h2>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-base text-white underline-offset-4 hover:underline">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-base text-white underline-offset-4 hover:underline">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-dashed border-white/25 pt-6 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <p>The tokens Sellvane sells here are a test token (VDEMO) that Sellvane deployed on Base mainnet to run in public.</p>
          <p>© 2026 Sellvane</p>
        </div>
      </div>
    </footer>
  );
}
