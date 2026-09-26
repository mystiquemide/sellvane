import Link from "next/link";
import { Nav } from "@/components/Nav";
import { VaneMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <>
      <Nav cta={<></>} />
      <main id="main" tabIndex={-1} className="mx-auto max-w-[1200px] px-4 pb-24 pt-20 md:px-6 md:pt-28">
        <VaneMark className="h-14 w-14" />
        <p className="mt-8 font-eyebrow text-sm uppercase tracking-[0.08em]">404</p>
        <h1 className="mt-4 font-display text-[48px] leading-[1.02] md:text-[72px]">This page sold out.</h1>
        <p className="mt-5 max-w-[560px] text-lg leading-[1.6] text-muted">
          There is nothing at this address. The live cap and every agent move are still where they were.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/live" className="rounded-full bg-marigold px-8 py-4 text-base font-medium text-ink hover:bg-marigold-deep">
            See the live cap →
          </Link>
          <Link href="/" className="rounded-full bg-ink px-8 py-4 text-base font-medium text-white hover:bg-[#1a1a1a]">
            Back to home
          </Link>
        </div>
      </main>
    </>
  );
}
