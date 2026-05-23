"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useMarkets } from "@/lib/markets";
import { useLeaderboard } from "@/lib/trades";
import { addressUrl } from "@/lib/config";
import { fmtUsd, shortAddr } from "@/lib/format";
import { shareUrl, useCaptureReferral } from "@/lib/referral";
import { useToasts } from "@/lib/toast";

type SortKey = "volume" | "realized";

export default function LeaderboardPage() {
  const { data: markets } = useMarkets();
  const { data: rows, isLoading } = useLeaderboard(markets);
  const [sort, setSort] = useState<SortKey>("volume");

  const sorted = [...(rows ?? [])].sort((a, b) => b[sort] - a[sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-muted">
            Top traders, derived live from on-chain trade events.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-pitch-bg p-1">
          {(["volume", "realized"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                sort === k ? "bg-pitch-card text-white" : "text-muted"
              }`}
            >
              {k === "volume" ? "Volume" : "Realized PnL"}
            </button>
          ))}
        </div>
      </div>

      <ReferralPanel rows={sorted.map((r) => r.trader)} />

      {isLoading ? (
        <div className="card h-64 animate-pulse bg-pitch-panel/50" />
      ) : sorted.length === 0 ? (
        <div className="card py-16 text-center text-sm text-muted">
          No trading activity yet.
        </div>
      ) : (
        <div className="card overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pitch-border text-left text-xs text-muted">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Trader</th>
                <th className="py-2 pr-3 font-medium">Volume</th>
                <th className="py-2 pr-3 font-medium">Realized PnL</th>
                <th className="py-2 pr-3 text-right font-medium">Trades</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.trader}
                  className="border-b border-pitch-border/50 last:border-0"
                >
                  <td className="py-3 pr-3 font-bold text-muted">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="py-3 pr-3">
                    <a
                      href={addressUrl(r.trader)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono hover:text-grass"
                    >
                      {shortAddr(r.trader)}
                    </a>
                  </td>
                  <td className="py-3 pr-3 font-semibold">
                    {fmtUsd(r.volume)}
                  </td>
                  <td
                    className={`py-3 pr-3 font-semibold ${
                      r.realized >= 0 ? "text-grass" : "text-no"
                    }`}
                  >
                    {r.realized >= 0 ? "+" : ""}
                    {fmtUsd(r.realized)}
                  </td>
                  <td className="py-3 pr-3 text-right text-muted">
                    {r.buys + r.sells}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Referral panel: shows the visitor's own referral link (carrying ?ref=<wallet>)
 * and, if they arrived via someone's link, who referred them. Attribution is
 * first-touch and stored client-side — non-custodial, no rewards held by the app.
 */
function ReferralPanel({ rows }: { rows: `0x${string}`[] }) {
  const { address } = useAccount();
  const referrer = useCaptureReferral();
  const { push } = useToasts();

  const link = shareUrl("/markets", address);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      push({ kind: "success", title: "Referral link copied", ttl: 4000 });
    } catch {
      push({ kind: "error", title: "Couldn't copy link", ttl: 4000 });
    }
  }

  const referrerRank =
    referrer != null
      ? rows.findIndex((r) => r.toLowerCase() === referrer.toLowerCase())
      : -1;

  return (
    <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-white">Invite & climb</p>
        <p className="text-xs text-muted">
          {address
            ? "Share your link — friends who join keep you tagged as their referrer."
            : "Connect your wallet to generate a referral link."}
        </p>
        {referrer && (
          <p className="mt-1 text-xs text-grass">
            Referred by {shortAddr(referrer)}
            {referrerRank >= 0 ? ` · rank #${referrerRank + 1}` : ""}
          </p>
        )}
      </div>
      <button
        onClick={copy}
        disabled={!address}
        className="btn-primary !py-2 text-sm"
      >
        Copy referral link
      </button>
    </div>
  );
}
