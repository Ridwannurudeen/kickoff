"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMarket } from "@/lib/markets";
import { useMarketTrades, usePriceHistory } from "@/lib/trades";
import { useOracleState } from "@/lib/oracle";
import { CATEGORY_LABELS } from "@/lib/types";
import { fmtPct, fmtUsdCompact } from "@/lib/format";
import { ProbabilityChart } from "@/components/ProbabilityChart";
import { RecentTrades } from "@/components/RecentTrades";
import { TradePanel } from "@/components/TradePanel";
import { LiquidityPanel } from "@/components/LiquidityPanel";
import { OracleStatusBadge } from "@/components/OracleStatusBadge";
import { ShareBetSlip } from "@/components/ShareBetSlip";

export default function MarketDetailPage() {
  const params = useParams<{ market: string }>();
  const address = params.market;
  const { data: market, isLoading } = useMarket(address);
  const [selected, setSelected] = useState(0);
  const { data: history } = usePriceHistory(market, selected);
  const { data: trades } = useMarketTrades(market);
  const { data: oracle } = useOracleState(market);

  if (isLoading) {
    return <div className="card h-96 animate-pulse bg-pitch-panel/50" />;
  }

  if (!market) {
    return (
      <div className="card flex flex-col items-center gap-3 py-20 text-center">
        <span className="text-3xl">🔍</span>
        <p className="font-semibold">Market not found</p>
        <Link href="/markets" className="text-sm text-grass hover:underline">
          ← Back to markets
        </Link>
      </div>
    );
  }

  const selectedOutcome = market.outcomes[selected];

  return (
    <div className="space-y-6">
      <Link href="/markets" className="text-sm text-muted hover:text-white">
        ← All markets
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* main column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill text-xs uppercase tracking-wide text-muted">
                  {CATEGORY_LABELS[market.category]}
                </span>
                {market.inPlay && (
                  <span className="pill !border-grass/40 text-xs text-grass">
                    <span className="h-2 w-2 animate-pulse-dot rounded-full bg-grass" />
                    In-play
                  </span>
                )}
                <OracleStatusBadge state={oracle} />
              </div>
              <span className="text-xs text-muted">
                {fmtUsdCompact(market.volume24h)} 24h vol · fee{" "}
                {(market.feeBps / 100).toFixed(2)}%
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-snug">
              {market.question}
            </h1>

            {/* N outcomes */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {market.outcomes.map((o) => (
                <button
                  key={o.index}
                  onClick={() => setSelected(o.index)}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                    selected === o.index
                      ? "border-grass bg-grass/10"
                      : "border-pitch-border hover:border-grass/40"
                  }`}
                >
                  <span className="text-sm font-semibold text-white">
                    {o.label}
                  </span>
                  <span
                    className={`text-xl font-extrabold ${
                      selected === o.index ? "text-grass" : "text-muted"
                    }`}
                  >
                    {fmtPct(o.probability, 0)}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs text-muted">
                {selectedOutcome?.label ?? "Outcome"} probability over time
              </p>
              <ProbabilityChart
                data={history ?? []}
                label={selectedOutcome?.label ?? "Probability"}
              />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-3 text-lg font-bold">Recent trades</h2>
            <RecentTrades trades={trades ?? []} showMarket={false} />
          </div>
        </div>

        {/* bet slip */}
        <div className="lg:col-span-1">
          <div className="space-y-3 lg:sticky lg:top-20">
            <TradePanel
              market={market}
              selected={selected}
              onSelect={setSelected}
            />
            <LiquidityPanel market={market} />
            <div className="card p-4">
              <p className="mb-2 text-xs font-semibold text-muted">
                Share this bet
              </p>
              <ShareBetSlip market={market} selected={selected} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
