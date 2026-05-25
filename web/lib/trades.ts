import { useQuery } from "@tanstack/react-query";
import { FACTORY_CONFIGURED } from "./config";
import type { LeaderRow, Market, PricePoint, Trade } from "./types";
import { mockLeaderboard, mockPriceHistory, mockTrades } from "./mock";
import { SNAPSHOT, type SnapshotTrade } from "./snapshot";

/**
 * Activity is read from a bundled, on-chain-derived snapshot rather than live logs:
 * X Layer testnet RPCs cap eth_getLogs to a 100-block range, so the app cannot scan
 * trade history at runtime. Prices stay live via eth_call (see markets.ts); volume,
 * the ticker and the leaderboard come from this snapshot. Regenerate it after
 * re-seeding with scripts/gen-snapshot.mjs.
 */
function snapshotLogs(markets?: Market[]): SnapshotTrade[] {
  if (!markets) return SNAPSHOT.trades;
  const set = new Set(markets.map((m) => m.address.toLowerCase()));
  return SNAPSHOT.trades.filter((t) => set.has(t.market.toLowerCase()));
}

function outcomeLabelFor(market: Market | undefined, index: number): string {
  return market?.outcomes[index]?.label ?? `Outcome ${index + 1}`;
}

function toTrade(r: SnapshotTrade, markets: Market[]): Trade {
  const m = markets.find(
    (x) => x.address.toLowerCase() === r.market.toLowerCase(),
  );
  return {
    market: r.market,
    marketLabel: m?.subject ?? `${r.market.slice(0, 6)}…`,
    side: r.side,
    trader: r.trader,
    outcomeIndex: r.outcomeIndex,
    outcomeLabel: outcomeLabelFor(m, r.outcomeIndex),
    amount: r.amount,
    shares: r.shares,
    txHash: r.txHash,
    blockNumber: r.blockNumber,
  };
}

/** Recent trades across all markets (for the homepage ticker). */
export function useRecentTrades(markets: Market[] | undefined, limit = 20) {
  return useQuery({
    queryKey: ["recent-trades", FACTORY_CONFIGURED, markets?.length ?? 0],
    queryFn: (): Trade[] => {
      if (!FACTORY_CONFIGURED || !markets) return mockTrades(limit);
      return snapshotLogs(markets)
        .slice(0, limit)
        .map((r) => toTrade(r, markets));
    },
    staleTime: 30_000,
    enabled: !FACTORY_CONFIGURED || (markets?.length ?? 0) >= 0,
  });
}

/** Trades for a single market (detail page). */
export function useMarketTrades(market: Market | undefined, limit = 30) {
  return useQuery({
    queryKey: ["market-trades", market?.address, FACTORY_CONFIGURED],
    queryFn: (): Trade[] => {
      if (!market) return [];
      if (!FACTORY_CONFIGURED || market.isMock) {
        return mockTrades(limit).map((t) => ({
          ...t,
          market: market.address,
          marketLabel: market.subject,
          outcomeLabel: outcomeLabelFor(
            market,
            t.outcomeIndex % market.outcomeCount,
          ),
          outcomeIndex: t.outcomeIndex % market.outcomeCount,
        }));
      }
      return snapshotLogs([market])
        .slice(0, limit)
        .map((r) => toTrade(r, [market]));
    },
    staleTime: 30_000,
    enabled: !!market,
  });
}

/**
 * Builds a probability history for a single outcome of a market. From snapshot
 * trades we approximate the outcome's probability over time from buy/sell pressure
 * on it; without a deployed factory we use a deterministic mock walk so the chart
 * always renders.
 */
export function usePriceHistory(
  market: Market | undefined,
  outcomeIndex: number,
) {
  const current = market?.outcomes[outcomeIndex]?.probability ?? 0;
  return useQuery({
    queryKey: [
      "price-history",
      market?.address,
      outcomeIndex,
      FACTORY_CONFIGURED,
    ],
    queryFn: (): PricePoint[] => {
      if (!market) return [];
      if (!FACTORY_CONFIGURED || market.isMock) {
        return mockPriceHistory(current);
      }
      const logs = snapshotLogs([market]).slice().reverse(); // oldest first
      const points: PricePoint[] = [];
      const now = Date.now();
      // walk backwards using each trade's pressure on the tracked outcome
      let p = current;
      const span = logs.length || 1;
      logs.forEach((r, i) => {
        const onThis = r.outcomeIndex === outcomeIndex;
        // a buy of this outcome pushes its prob up; a sell pushes it down
        const pressure = onThis ? (r.side === "buy" ? 1 : -1) : 0;
        const mag = Math.min(0.05, r.amount / 50000) * pressure;
        p = Math.min(0.98, Math.max(0.01, p + mag));
        points.push({ t: now - (span - i) * 60_000, p: +(p * 100).toFixed(2) });
      });
      points.push({ t: now, p: +(current * 100).toFixed(2) });
      return points.length > 1 ? points : mockPriceHistory(current);
    },
    staleTime: 30_000,
    enabled: !!market,
  });
}

/** Leaderboard derived from snapshot trades (volume + rough realized PnL proxy). */
export function useLeaderboard(markets: Market[] | undefined) {
  return useQuery({
    queryKey: ["leaderboard", FACTORY_CONFIGURED, markets?.length ?? 0],
    queryFn: (): LeaderRow[] => {
      if (!FACTORY_CONFIGURED || !markets) return mockLeaderboard();
      const byTrader = new Map<string, LeaderRow>();
      for (const r of snapshotLogs(markets)) {
        const key = r.trader.toLowerCase();
        const row =
          byTrader.get(key) ??
          ({
            trader: r.trader,
            volume: 0,
            buys: 0,
            sells: 0,
            realized: 0,
          } as LeaderRow);
        row.volume += r.amount;
        if (r.side === "buy") {
          row.buys += 1;
          row.realized -= r.amount; // collateral spent
        } else {
          row.sells += 1;
          row.realized += r.amount; // collateral received
        }
        byTrader.set(key, row);
      }
      return [...byTrader.values()].sort((a, b) => b.volume - a.volume);
    },
    staleTime: 30_000,
    enabled: !FACTORY_CONFIGURED || (markets?.length ?? 0) >= 0,
  });
}
