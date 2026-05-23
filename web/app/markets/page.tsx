"use client";

import { useState } from "react";
import { useMarkets } from "@/lib/markets";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type MarketCategory,
} from "@/lib/types";
import { MarketCard } from "@/components/MarketCard";
import { OnRampButton } from "@/components/OnRampButton";

type Tab = MarketCategory | "all" | "in-play";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in-play", label: "In-play" },
  ...CATEGORY_ORDER.map((c) => ({ id: c as Tab, label: CATEGORY_LABELS[c] })),
];

export default function MarketsPage() {
  const { data: markets, isLoading } = useMarkets();
  const [tab, setTab] = useState<Tab>("all");

  const filtered = (markets ?? []).filter((m) => {
    if (tab === "all") return true;
    if (tab === "in-play") return m.inPlay;
    return m.category === tab;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <p className="text-sm text-muted">
            Pick a side on every World Cup 2026 market.
          </p>
        </div>
        <OnRampButton className="!py-2 text-sm" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-grass text-black"
                : "border border-pitch-border text-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card h-48 animate-pulse bg-pitch-panel/50"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-sm text-muted">
          {tab === "in-play"
            ? "No live matches right now."
            : "No markets in this category yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MarketCard key={m.address} market={m} />
          ))}
        </div>
      )}
    </div>
  );
}
