/** Weathervane arrow resting on the cap line. Geometry matches src/app/icon.svg. */
export function VaneMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true" fill="currentColor">
      <rect x="88" y="356" width="336" height="30" rx="15" />
      <rect x="241" y="214" width="30" height="142" />
      <rect x="150" y="170" width="226" height="30" />
      <polygon points="366,124 446,185 366,246" />
      <polygon points="72,124 172,124 196,185 172,246 72,246 104,185" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <VaneMark className="h-8 w-8" />
      <span className="font-display text-[26px] leading-none tracking-[-0.01em]">sellvane</span>
    </span>
  );
}
