"use client";

import type { OracleState } from "@/lib/types";

/**
 * Surfaces a market's resolution state read from the OptimisticOracle:
 * a payout has been proposed, is in the dispute window, is disputed, or settled.
 * Renders nothing when the oracle isn't configured or no proposal exists.
 */
export function OracleStatusBadge({ state }: { state?: OracleState }) {
  if (!state || state.status === "none") return null;

  if (state.status === "settled") {
    return (
      <span className="pill !border-grass/40 text-[11px] text-grass">
        Resolved · settled on-chain
      </span>
    );
  }

  if (state.status === "disputed") {
    return (
      <span className="pill !border-no/40 text-[11px] text-no">
        Resolution disputed — under arbiter review
      </span>
    );
  }

  // proposed
  const mins = Math.ceil(state.livenessRemaining / 60);
  return (
    <span className="pill !border-grass/30 text-[11px] text-grass">
      Resolution proposed ·{" "}
      {state.livenessRemaining > 0
        ? `${mins}m left to dispute`
        : "dispute window closed"}
    </span>
  );
}
