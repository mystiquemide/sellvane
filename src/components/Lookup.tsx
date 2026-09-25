"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isAddress } from "viem";

/** Look up any token or team account on Base. Capped tokens open their live page. */
export function Lookup({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!isAddress(v)) {
      setError("Paste a token or team account address on Base (0x followed by 40 characters).");
      return;
    }
    setError(null);
    router.push(`/live/${v.toLowerCase()}`);
  };
  return (
    <form onSubmit={submit} role="search" aria-label="Look up a token">
      <label htmlFor="lookup" className={`block text-sm ${tone === "dark" ? "text-white/70" : "text-muted"}`}>
        Look up any token
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="lookup"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Token or team account address, 0x..."
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-[16px] border-[1.5px] border-[#cccbc7] bg-white px-4 py-3 font-mono text-[15px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-ink px-6 py-3 text-base font-medium text-white hover:bg-[#1a1a1a]">
          Look up
        </button>
      </div>
      {error ? (
        <p className={`mt-2 text-sm ${tone === "dark" ? "text-white" : "text-ink"}`} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
