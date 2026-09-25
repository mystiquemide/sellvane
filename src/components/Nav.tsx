import Link from "next/link";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/launchpad", label: "For launchpads" },
  { href: "/t/vdemo", label: "Live token" },
];

export function Nav() {
  return (
    <header className="bg-canvas">
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6" aria-label="Main">
        <Link href="/" aria-label="Sellvane home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-base text-ink underline-offset-4 hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/t/vdemo"
            className="rounded-full bg-marigold px-5 py-2.5 text-base font-medium text-ink transition-colors hover:bg-marigold-deep md:px-6"
          >
            See it live
          </Link>

          {/* Mobile menu: native details element, works without JavaScript. */}
          <details className="relative md:hidden">
            <summary
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full bg-ink text-white [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <ul className="absolute right-0 top-14 z-20 w-56 rounded-[20px] bg-card p-2 shadow-[0_4px_12px_rgba(70,58,0,0.1)]">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-full px-4 py-3 text-base text-ink hover:bg-butter">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </nav>
    </header>
  );
}
