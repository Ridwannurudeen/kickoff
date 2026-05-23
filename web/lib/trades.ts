import { useQuery } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { publicClient } from "./client";
import { FACTORY_CONFIGURED } from "./config";
import { formatShares, formatUsdc } from "./format";
import type { LeaderRow, Market, PricePoint, Trade } from "./types";
import { mockLeaderboard, mockPriceHistory, mockTrades } from "./mock";

const BUY_EVENT = parseAbiItem(
  "event FPMMBuy(address indexed buyer, uint8 outcomeIndex, uint256 investmentAmount, uint256 feeAmount, uint256 outcomeTokensBought)",
);
const SELL_EVENT = parseAbiItem(
  "event FPMMSell(address indexed seller, uint8 outcomeIndex, uint256 returnAmount, uint256 feeAmount, uint256 outcomeTokensSold)",
);

/** How many recent blocks to scan for activity. ~1s blocks → ~7h window. */
const LOOKBACK_BLOCKS = 25_000n;

interface RawLog {
  side: "buy" | "sell";
  market: `0x${string}`;
  trader: `0x${string}`;
  outcomeIndex: number;
  amount: number;
  shares: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

/** Scan FPMMBuy/FPMMSell logs across the given markets. */
async function scanLogs(markets: Market[]): Promise<RawLog[]> {
  if (markets.length === 0) return [];
  const client = publicClient();
  const latest = await client.getBlockNumber();
  const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
  const addresses = markets.map((m) => m.address);

  const [buys, sells] = await Promise.all([
    client.getLogs({
      address: addresses,
      event: BUY_EVENT,
      fromBlock,
      toBlock: latest,
    }),
    client.getLogs({
      address: addresses,
      event: SELL_EVENT,
      fromBlock,
      toBlock: latest,
    }),
  ]);

  const out: RawLog[] = [];
  for (const log of buys) {
    const a = log.args;
    out.push({
      side: "buy",
      market: log.address as `0x${string}`,
      trader: a.buyer as `0x${string}`,
      outcomeIndex: Number(a.outcomeIndex),
      amount: formatUsdc(a.investmentAmount as bigint),
      shares: formatShares(a.outcomeTokensBought as bigint),
      txHash: log.transactionHash as `0x${string}`,
      blockNumber: log.blockNumber as bigint,
    });
  }
  for (const log of sells) {
    const a = log.args;
    out.push({
      side: "sell",
      market: log.address as `0x${string}`,
      trader: a.seller as `0x${string}`,
      outcomeIndex: Number(a.outcomeIndex),
      amount: formatUsdc(a.returnAmount as bigint),
      shares: formatShares(a.outcomeTokensSold as bigint),
      txHash: log.transactionHash as `0x${string}`,
      blockNumber: log.blockNumber as bigint,
    });
  }
  out.sort((x, y) => Number(y.blockNumber - x.blockNumber));
  return out;
}

function outcomeLabelFor(market: Market | undefined, index: number): string {
  return market?.outcomes[index]?.label ?? `Outcome ${index + 1}`;
}

function toTrade(r: RawLog, markets: Market[]): Trade {
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
    queryFn: async (): Promise<Trade[]> => {
      if (!FACTORY_CONFIGURED || !markets) return mockTrades(limit);
      const logs = await scanLogs(markets);
      return logs.slice(0, limit).map((r) => toTrade(r, markets));
    },
    staleTime: 10_000,
    refetchInterval: 12_000,
    enabled: !FACTORY_CONFIGURED || (markets?.length ?? 0) >= 0,
  });
}

/** Trades for a single market (detail page). */
export function useMarketTrades(market: Market | undefined, limit = 30) {
  return useQuery({
    queryKey: ["market-trades", market?.address, FACTORY_CONFIGURED],
    queryFn: async (): Promise<Trade[]> => {
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
      const logs = await scanLogs([market]);
      return logs.slice(0, limit).map((r) => toTrade(r, [market]));
    },
    staleTime: 8_000,
    refetchInterval: 12_000,
    enabled: !!market,
  });
}

/**
 * Builds a probability history for a single outcome of a market. With logs we
 * approximate the outcome's probability over time from buy/sell pressure on it;
 * without a deployed factory we use a deterministic mock walk so the chart always
 * renders.
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
    queryFn: async (): Promise<PricePoint[]> => {
      if (!market) return [];
      if (!FACTORY_CONFIGURED || market.isMock) {
        return mockPriceHistory(current);
      }
      const logs = (await scanLogs([market])).slice().reverse(); // oldest first
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
    refetchInterval: 30_000,
    enabled: !!market,
  });
}

/** Leaderboard derived from event logs (volume + rough realized PnL proxy). */
export function useLeaderboard(markets: Market[] | undefined) {
  return useQuery({
    queryKey: ["leaderboard", FACTORY_CONFIGURED, markets?.length ?? 0],
    queryFn: async (): Promise<LeaderRow[]> => {
      if (!FACTORY_CONFIGURED || !markets) return mockLeaderboard();
      const logs = await scanLogs(markets);
      const byTrader = new Map<string, LeaderRow>();
      for (const r of logs) {
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
    refetchInterval: 30_000,
    enabled: !FACTORY_CONFIGURED || (markets?.length ?? 0) >= 0,
  });
}
