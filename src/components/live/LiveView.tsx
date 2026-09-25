"use client";

import Link from "next/link";
import { useToken } from "@/lib/useToken";
import { Lookup } from "../Lookup";
import { LiveHeader } from "./LiveHeader";
import { CapCard } from "./CapCard";
import { BypassAlert, BypassWatch } from "./BypassWatch";
import { PoolStats } from "./PoolStats";
import { AgentLedger } from "./AgentLedger";
import { CheckYourself } from "./CheckYourself";

/** One data source for every section on /live, so all numbers come from the same chain read. */
export function LiveView({ slug }: { slug: string }) {
  const s = useToken(slug);
  if (s.status === "notfound") {
    return (
      <section className="mx-auto max-w-[1200px] px-4 pb-24 pt-16 md:px-6">
        <p className="font-eyebrow text-sm uppercase tracking-[0.08em]">Not capped</p>
        <h1 className="mt-4 font-display text-[44px] leading-[1.05] md:text-[64px]">No Sellvane cap for this token.</h1>
        <p className="mt-4 max-w-[640px] text-lg leading-[1.6] text-muted">
          Nothing limits how much its team can sell through Sellvane. If you are on the team, you can set a cap in three steps.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/start?token=${slug}`} className="rounded-full bg-marigold px-8 py-4 text-base font-medium text-ink hover:bg-marigold-deep">
            Cap a token →
          </Link>
        </div>
        <div className="mt-12 max-w-[640px]">
          <Lookup />
        </div>
      </section>
    );
  }
  return (
    <>
      <LiveHeader s={s} />
      <BypassAlert s={s} />
      <CapCard s={s} />
      <BypassWatch s={s} />
      <PoolStats s={s} />
      <AgentLedger s={s} />
      <CheckYourself s={s} />
    </>
  );
}
