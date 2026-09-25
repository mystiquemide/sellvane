"use client";

import { useCallback, useEffect, useState } from "react";
import type { TokenSnapshot } from "./status";
import type { DecisionRow } from "./store/db";

export type TokenData = TokenSnapshot & { decisions: DecisionRow[]; agent: { maxImpactBps: number } };

export type TokenState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; data: TokenData; refreshing: boolean };

/**
 * Live token data from the chain-backed API. Polls every 30s. On failure it shows the
 * error state and hides numbers: stale values are never kept on screen.
 */
export function useToken(symbol = "VDEMO", pollMs = 30000): TokenState {
  const [state, setState] = useState<TokenState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setState((s) => (s.status === "ready" ? { ...s, refreshing: true } : s));
      try {
        const res = await fetch(`/api/tokens/${symbol}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as TokenData;
        if (alive) setState({ status: "ready", data, refreshing: false });
      } catch {
        if (alive) setState({ status: "error", retry });
      }
    };
    load();
    const t = setInterval(load, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [symbol, pollMs, nonce, retry]);

  return state;
}
