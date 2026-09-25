"use client";

import { useState } from "react";
import { short } from "@/lib/format";

/** Shows a long hex value shortened, with a button that copies the full value. */
export function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(`Copy the ${label}`, value);
    }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-sm" title={value}>
        {short(value)}
      </span>
      <button
        type="button"
        onClick={copy}
        className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-white hover:bg-[#1a1a1a]"
        aria-label={`Copy the full ${label}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
