import Link from "next/link";
import { Logo } from "./Logo";

type NavLink = { href: string; label: string };

const LINKS: NavLink[] = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/launchpad", label: "For launchpads" },
  { href: "/live", label: "Live cap" },
  { href: "/start", label: "Cap your token" },
];

/** "overlay" sits on top of a full-bleed hero photo: transparent, white text. */
export function Nav({
  variant = "solid",
  cta,
  links = LINKS,
  back = false,
}: {
  variant?: "solid" | "overlay";
  cta?: React.ReactNode;
  links?: NavLink[];
  back?: boolean;
}) {
  const overlay = variant === "overlay";
  const text = overlay ? "text-white" : "text-ink";
  // With the extra back button the full nav needs more room, so it switches to the menu below xl.
  const show = back ? "hidden xl:flex" : "hidden md:flex";
  const menuOnly = back ? "xl:hidden" : "md:hidden";
  return (
    <header className={overlay ? "absolute inset-x-0 top-0 z-30" : "bg-canvas"}>
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-6" aria-label="Main">
        <Link href="/" aria-label="Sellvane home" className={text}>
          <Logo />
        </Link>

        <ul className={`${show} items-center gap-8`}>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={`text-base ${text} underline-offset-4 hover:underline`}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {back && (
            <Link
              href="/"
              className="hidden whitespace-nowrap rounded-full bg-ink px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-[#1a1a1a] xl:inline-block"
            >
              ← Back to home
            </Link>
          )}
          {cta ?? (
            <Link
              href="/live"
              className="rounded-full bg-marigold px-5 py-2.5 text-base font-medium text-ink transition-colors hover:bg-marigold-deep md:px-6"
            >
              See it live
            </Link>
          )}

          {/* Mobile menu: native details element, works without JavaScript. */}
          <details className={`relative ${menuOnly}`}>
            <summary
              className={`flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden ${overlay ? "bg-white text-ink" : "bg-ink text-white"}`}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <ul className="absolute right-0 top-14 z-20 w-56 rounded-[20px] bg-card p-2 shadow-[0_4px_12px_rgba(70,58,0,0.1)]">
              {back && (
                <li>
                  <Link href="/" className="block rounded-full px-4 py-3 text-base font-medium text-ink hover:bg-butter">
                    ← Back to home
                  </Link>
                </li>
              )}
              {links.map((l) => (
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
