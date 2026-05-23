"use client";

import { txUrl } from "@/lib/config";
import { fmtUsd, shortAddr } from "@/lib/format";
import type { Trade } from "@/lib/types";

function TradeChip({ t }: { t: Trade }) {
  const isBuy = t.side === "buy";
  return (
    <a
      href={txUrl(t.txHash)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-pitch-border bg-pitch-panel px-3 py-1.5 text-xs hover:border-grass/40"
    >
      <span className={isBuy ? "text-grass" : "text-no"}>
        {isBuy ? "BUY" : "SELL"}
      </span>
      <span className="font-semibold text-white">{t.marketLabel}</span>
      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {t.outcomeLabel}
      </span>
      <span className="text-muted">{fmtUsd(t.amount)}</span>
      <span className="font-mono text-muted">{shortAddr(t.trader)}</span>
    </a>
  );
}

/** Marquee-style live trades ticker. Duplicates the list for a seamless loop. */
export function TradeTicker({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted">
        <LiveDot />
        Waiting for the first trades…
      </div>
    );
  }
  const doubled = [...trades, ...trades];
  return (
    <div className="flex items-center gap-3 overflow-hidden border-y border-pitch-border bg-pitch-bg/60 py-2">
      <div className="flex shrink-0 items-center gap-1.5 pl-4 pr-1 text-xs font-semibold text-grass">
        <LiveDot /> LIVE
      </div>
      <div className="flex w-full overflow-hidden">
        <div className="flex animate-ticker gap-2">
          {doubled.map((t, i) => (
            <TradeChip key={`${t.txHash}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveDot() {
  return <span className="h-2 w-2 animate-pulse-dot rounded-full bg-grass" />;
}
