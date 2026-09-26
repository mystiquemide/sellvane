"use client";

import { useEffect, useState } from "react";
import { VaneMark } from "./Logo";

/** The cap bar: marigold fill is what the team sold today; the vane rides the edge. */
export function VaneTrack({ filled, label }: { filled: number; label: string }) {
  const target = Math.min(100, Math.max(0, filled * 100));
  // Start empty and fill to the real value after mount, so the bar sweeps in once.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const pctFilled = ready ? target : 0;
  return (
    <div className="relative pt-9" role="img" aria-label={label}>
      <div
        className="absolute top-0 -translate-x-1/2 transition-[left] duration-[1400ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
        style={{ left: `max(18px, min(calc(100% - 18px), ${pctFilled}%))` }}
        aria-hidden="true"
      >
        <VaneMark className="sway h-8 w-8" />
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full border border-ink bg-card">
        <div className="h-full rounded-full bg-marigold transition-[width] duration-[1400ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none" style={{ width: `${pctFilled}%` }} />
      </div>
    </div>
  );
}

export function TrackSkeleton() {
  return (
    <div className="pt-9" aria-hidden="true">
      <div className="h-4 w-full rounded-full bg-line" />
    </div>
  );
}
