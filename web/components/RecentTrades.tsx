"use client";

import { txUrl } from "@/lib/config";
import { fmtShares, fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import type { Trade } from "@/lib/types";

export function RecentTrades({
  trades,
  showMarket = true,
}: {
  trades: Trade[];
  showMarket?: boolean;
}) {
  if (trades.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">No trades yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-pitch-border text-left text-xs text-muted">
            <th className="py-2 pr-3 font-medium">Side</th>
            {showMarket && <th className="py-2 pr-3 font-medium">Market</th>}
            <th className="py-2 pr-3 font-medium">Outcome</th>
            <th className="py-2 pr-3 font-medium">Amount</th>
            <th className="py-2 pr-3 font-medium">Shares</th>
            <th className="py-2 pr-3 font-medium">Trader</th>
            <th className="py-2 pr-3 text-right font-medium">Tx</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            return (
              <tr
                key={`${t.txHash}-${i}`}
                className="border-b border-pitch-border/50 last:border-0"
              >
                <td className="py-2.5 pr-3">
                  <span className={t.side === "buy" ? "text-grass" : "text-no"}>
                    {t.side === "buy" ? "Buy" : "Sell"}
                  </span>
                </td>
                {showMarket && (
                  <td className="py-2.5 pr-3 font-medium text-white">
                    {t.marketLabel}
                  </td>
                )}
                <td className="py-2.5 pr-3">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {t.outcomeLabel}
                  </span>
                </td>
                <td className="py-2.5 pr-3">{fmtUsd(t.amount)}</td>
                <td className="py-2.5 pr-3 text-muted">
                  {fmtShares(t.shares)}
                </td>
                <td className="py-2.5 pr-3 font-mono text-muted">
                  {shortAddr(t.trader)}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <a
                    href={txUrl(t.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-grass hover:underline"
                  >
                    {t.timestamp ? timeAgo(t.timestamp) : "↗"}
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
