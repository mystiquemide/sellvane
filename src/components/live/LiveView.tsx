"use client";

import { useToken } from "@/lib/useToken";
import { LiveHeader } from "./LiveHeader";
import { CapCard } from "./CapCard";
import { BypassAlert, BypassWatch } from "./BypassWatch";
import { PoolStats } from "./PoolStats";
import { AgentLedger } from "./AgentLedger";
import { CheckYourself } from "./CheckYourself";

/** One data source for every section on /live, so all numbers come from the same chain read. */
export function LiveView() {
  const s = useToken();
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
