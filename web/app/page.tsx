"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMarkets } from "@/lib/markets";
import { useRecentTrades } from "@/lib/trades";
import { useCaptureReferral } from "@/lib/referral";
import { fmtUsdCompact } from "@/lib/format";
import { MarketCard } from "@/components/MarketCard";
import { OnRampButton } from "@/components/OnRampButton";
import { TradeTicker } from "@/components/TradeTicker";

export default function HomePage() {
  const { data: markets, isLoading } = useMarkets();
  const { data: trades } = useRecentTrades(markets);
  useCaptureReferral();

  const totalVolume = useMemo(
    () => (markets ?? []).reduce((sum, m) => sum + m.volume24h, 0),
    [markets],
  );
  const featured = [...(markets ?? [])]
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 6);

  return (
    <div className="space-y-10">
      {/* hero */}
      <section className="card relative overflow-hidden p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <p className="pill mb-4 text-grass">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-grass" />
            World Cup 2026 · Live on X Layer
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Kick<span className="text-grass">off</span>
          </h1>
          <p className="mt-3 text-lg text-muted">
            Trade the beautiful game — live, on-chain. Take a side on every
            outright, group, and Golden Boot market with USDC.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/markets" className="btn-primary">
              Explore markets
            </Link>
            <OnRampButton />
            <div className="pill">
              Total volume:&nbsp;
              <span className="font-semibold text-white">
                {fmtUsdCompact(totalVolume)}
              </span>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 text-[12rem] opacity-[0.06] md:text-[16rem]">
          ⚽
        </div>
      </section>

      {/* live ticker */}
      <section className="-mx-4">
        <TradeTicker trades={trades ?? []} />
      </section>

      {/* featured markets */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Featured markets</h2>
          <Link href="/markets" className="text-sm text-grass hover:underline">
            View all →
          </Link>
        </div>
        {isLoading ? (
          <SkeletonGrid />
        ) : featured.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((m) => (
              <MarketCard key={m.address} market={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card h-40 animate-pulse bg-pitch-panel/50" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-2 py-16 text-center">
      <span className="text-3xl">⚽</span>
      <p className="font-semibold">No markets yet</p>
      <p className="max-w-sm text-sm text-muted">
        Once the market factory is deployed and seeded, World Cup markets will
        appear here automatically.
      </p>
    </div>
  );
}
