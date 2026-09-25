import { VaneMark } from "./Logo";

/** The cap bar: marigold fill is what the team sold today; the vane rides the edge. */
export function VaneTrack({ filled, label }: { filled: number; label: string }) {
  const pctFilled = Math.min(100, Math.max(0, filled * 100));
  return (
    <div className="relative pt-9" role="img" aria-label={label}>
      <div
        className="absolute top-0 -translate-x-1/2 transition-[left] duration-500 ease-out motion-reduce:transition-none"
        style={{ left: `max(18px, min(calc(100% - 18px), ${pctFilled}%))` }}
        aria-hidden="true"
      >
        <VaneMark className="h-8 w-8" />
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full border border-ink bg-card">
        <div className="h-full rounded-full bg-marigold transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${pctFilled}%` }} />
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
