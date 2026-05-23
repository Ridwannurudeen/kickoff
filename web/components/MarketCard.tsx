"use client";

import Link from "next/link";
import { CATEGORY_LABELS, type Market } from "@/lib/types";
import { fmtPct, fmtUsdCompact } from "@/lib/format";

export function MarketCard({ market }: { market: Market }) {
  // show up to the 3 most-likely outcomes, highest first
  const top = [...market.outcomes]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);
  const leader = top[0];

  return (
    <Link
      href={`/markets/${market.address}`}
      className="card group flex flex-col gap-3 p-4 transition-colors hover:border-grass/40"
    >
      <div className="flex items-center justify-between">
        <span className="pill !px-2.5 !py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {CATEGORY_LABELS[market.category]}
        </span>
        <div className="flex items-center gap-1.5">
          {market.inPlay && (
            <span className="pill !border-grass/40 !py-0.5 text-[10px] text-grass">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-grass" />
              LIVE
            </span>
          )}
          {market.closed && (
            <span className="pill !border-no/40 !py-0.5 text-[10px] text-no">
              Closed
            </span>
          )}
        </div>
      </div>

      <h3 className="text-base font-semibold leading-snug text-white">
        {market.question}
      </h3>

      <div className="mt-1 flex flex-col gap-1.5">
        {top.map((o) => (
          <div key={o.index} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-xs text-muted">
              {o.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pitch-bg">
              <div
                className="h-full rounded-full bg-grass transition-all group-hover:bg-grass-glow"
                style={{ width: `${Math.round(o.probability * 100)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-semibold text-white">
              {fmtPct(o.probability, 0)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between pt-1">
        <div>
          <p className="text-xs text-muted">Favourite</p>
          <p className="text-lg font-extrabold text-grass">
            {leader ? leader.label : "—"}
          </p>
        </div>
        <p className="text-xs text-muted">
          {fmtUsdCompact(market.volume24h)} 24h
        </p>
      </div>
    </Link>
  );
}
