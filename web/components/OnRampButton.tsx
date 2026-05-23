"use client";

import { OKX_ONRAMP_URL } from "@/lib/config";

/**
 * Links out to the OKX Web3 fiat on-ramp so new users can buy crypto to fund
 * their wallet. External, non-custodial — clearly marked as leaving the app.
 */
export function OnRampButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={OKX_ONRAMP_URL}
      target="_blank"
      rel="noreferrer"
      className={`btn-ghost ${className}`}
      title="Buy crypto with fiat via OKX (external)"
    >
      Buy crypto ↗
    </a>
  );
}
