"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { shareUrl } from "@/lib/referral";
import { useToasts } from "@/lib/toast";
import { fmtPct } from "@/lib/format";
import type { Market } from "@/lib/types";

/**
 * Shareable bet-slip controls. Builds a referral-aware link (?ref=<wallet>) to
 * the market and offers copy + share-to-X. The link's OG image is the market's
 * opengraph-image route, so it unfurls as a branded card.
 */
export function ShareBetSlip({
  market,
  selected,
}: {
  market: Market;
  selected: number;
}) {
  const { address } = useAccount();
  const { push } = useToasts();
  const [copied, setCopied] = useState(false);

  const outcome = market.outcomes[selected];
  const link = shareUrl(`/markets/${market.address}`, address);
  const text = outcome
    ? `${market.question} — I'm on ${outcome.label} at ${fmtPct(outcome.probability, 0)} on Kickoff`
    : `${market.question} on Kickoff`;
  const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(link)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      push({
        kind: "success",
        title: "Link copied",
        message: address ? "Includes your referral tag." : undefined,
        ttl: 4000,
      });
    } catch {
      push({ kind: "error", title: "Couldn't copy link", ttl: 4000 });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={copy} className="btn-ghost !py-1.5 !px-3 text-xs">
        {copied ? "Copied ✓" : "Copy share link"}
      </button>
      <a
        href={xIntent}
        target="_blank"
        rel="noreferrer"
        className="btn-ghost !py-1.5 !px-3 text-xs"
      >
        Share on X ↗
      </a>
    </div>
  );
}
