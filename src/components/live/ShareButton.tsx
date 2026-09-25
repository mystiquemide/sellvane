"use client";

import { useState } from "react";

/** Copies the page URL. Uses the native share sheet on phones when available. */
export function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "Sellvane live cap", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="rounded-full bg-marigold px-5 py-2.5 text-base font-medium text-ink transition-colors hover:bg-marigold-deep md:px-6"
      aria-live="polite"
    >
      {copied ? (
        "Link copied"
      ) : (
        <>
          <span className="md:hidden">Share</span>
          <span className="hidden md:inline">Share this page</span>
        </>
      )}
    </button>
  );
}
