import Image from "next/image";
import Link from "next/link";
import heroVane from "../../../public/images/hero-vane.jpg";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink">
      <Image
        src={heroVane}
        alt="A black arrow weathervane against a pink evening sky"
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="-z-10 object-cover object-[70%_40%]"
      />
      {/* Warm dark scrim for legibility; flat, no gradient. */}
      <div className="absolute inset-0 -z-10 bg-[rgba(28,20,0,0.5)]" aria-hidden="true" />

      <div className="mx-auto flex min-h-[704px] max-w-[1200px] flex-col justify-center px-4 pb-40 pt-40 md:min-h-[784px] md:px-6">
        <h1 className="max-w-[760px] font-display text-[48px] leading-[1.01] tracking-[0.01em] text-white md:text-[72px]">
          Unlocks without <br className="hidden md:block" />
          the dump.
        </h1>

        <p className="mt-6 max-w-[560px] text-lg leading-[1.5] text-white md:text-xl">
          Sellvane is an AI agent that sells a team&apos;s unlocked tokens under a daily limit the team signs on Base. Anyone can check every sale.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/live"
            className="rounded-full bg-marigold px-8 py-4 text-base font-medium text-ink transition-colors hover:bg-marigold-deep"
          >
            See the live cap →
          </Link>
          <Link href="/start" className="rounded-full bg-white px-8 py-4 text-base font-medium text-ink transition-colors hover:bg-butter">
            Cap your token
          </Link>
        </div>
      </div>

    </section>
  );
}
