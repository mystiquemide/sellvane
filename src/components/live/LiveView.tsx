"use client";

import { useToken } from "@/lib/useToken";
import { LiveHeader } from "./LiveHeader";

/** One data source for every section on /live, so all numbers come from the same chain read. */
export function LiveView() {
  const s = useToken();
  return (
    <>
      <LiveHeader s={s} />
    </>
  );
}
