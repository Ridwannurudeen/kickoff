import { useQuery } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { publicClient } from "./client";
import { ADDRESSES, PARLAY_CONFIGURED } from "./config";
import { conditionalTokensAbi, fpmmAbi, parlayBookAbi } from "./abis";

/**
 * Parlay odds math + data hooks around the ParlayBook.
 *
 * Each leg's decimal odds = 1e18 / prices()[outcome]; combined odds are the
 * product of the per-leg decimal odds. Potential payout = stake × combined.
 * Stake/payout are 6-dec USDC; prices() are 1e18-scaled implied probabilities.
 */

/** Decimal odds for a single leg from its 1e18-scaled implied probability. */
export function legDecimalOdds(priceWei: bigint): number {
  if (priceWei <= 0n) return 0;
  return 1e18 / Number(priceWei);
}

/** Combined decimal odds for all legs (product of per-leg decimal odds). */
export function combinedOdds(legPrices: bigint[]): number {
  if (legPrices.length === 0) return 0;
  return legPrices.reduce((acc, p) => acc * legDecimalOdds(p), 1);
}

/** Lifecycle/result for a parlay shown in the "My parlays" view. */
export type ParlayResult = "open" | "won" | "lost" | "void";

export interface MyParlay {
  id: bigint;
  bettor: `0x${string}`;
  stake: bigint;
  payout: bigint;
  settled: boolean;
  markets: `0x${string}`[];
  outcomes: number[];
  result: ParlayResult;
  /** true once every leg's condition has resolved (settle is callable). */
  settleable: boolean;
}

const PARLAY_PLACED = parseAbiItem(
  "event ParlayPlaced(uint256 indexed id, address indexed bettor, uint256 stake, uint256 payout, uint256 legs)",
);
const PARLAY_SETTLED = parseAbiItem(
  "event ParlaySettled(uint256 indexed id, uint8 result, uint256 paid)",
);

/** The ParlayBook's exposure params + house liquidity, read once. */
export interface ParlayConfig {
  freeLiquidity: bigint;
  maxExposureBps: bigint;
  minLegs: number;
  maxLegs: number;
  /** the largest payout a single parlay may lock, = freeLiquidity × bps / 10000. */
  maxPayout: bigint;
}

async function fetchParlayConfig(): Promise<ParlayConfig | undefined> {
  if (!PARLAY_CONFIGURED) return undefined;
  const client = publicClient();
  const [freeLiquidity, maxExposureBps, minLegs, maxLegs] =
    (await client.multicall({
      contracts: [
        {
          address: ADDRESSES.parlayBook,
          abi: parlayBookAbi,
          functionName: "freeLiquidity",
        },
        {
          address: ADDRESSES.parlayBook,
          abi: parlayBookAbi,
          functionName: "maxExposureBps",
        },
        {
          address: ADDRESSES.parlayBook,
          abi: parlayBookAbi,
          functionName: "minLegs",
        },
        {
          address: ADDRESSES.parlayBook,
          abi: parlayBookAbi,
          functionName: "maxLegs",
        },
      ],
      allowFailure: false,
    })) as [bigint, bigint, number, number];

  return {
    freeLiquidity,
    maxExposureBps,
    minLegs,
    maxLegs,
    maxPayout: (freeLiquidity * maxExposureBps) / 10_000n,
  };
}

export function useParlayConfig() {
  return useQuery({
    queryKey: ["parlay-config", PARLAY_CONFIGURED],
    queryFn: fetchParlayConfig,
    staleTime: 15_000,
    refetchInterval: 20_000,
    enabled: PARLAY_CONFIGURED,
  });
}

/**
 * True when every leg's condition is resolved (status 2 disputed-window-closed or
 * 3 settled), so settleParlay won't revert. Matches the contract's settle gate.
 */
async function legsResolved(
  markets: `0x${string}`[],
  conditionalTokens: `0x${string}`,
): Promise<boolean> {
  if (markets.length === 0) return false;
  const client = publicClient();
  // each leg's conditionId lives on its FPMM; read them, then the condition status.
  const ids = (await client.multicall({
    contracts: markets.map((m) => ({
      address: m,
      abi: fpmmAbi,
      functionName: "conditionId",
    })),
    allowFailure: false,
  })) as `0x${string}`[];

  const statuses = (await client.multicall({
    contracts: ids.map((cid) => ({
      address: conditionalTokens,
      abi: conditionalTokensAbi,
      functionName: "conditionStatus",
      args: [cid],
    })),
    allowFailure: false,
  })) as number[];

  return statuses.every((s) => s >= 2);
}

async function fetchMyParlays(account: `0x${string}`): Promise<MyParlay[]> {
  if (!PARLAY_CONFIGURED) return [];
  const client = publicClient();

  const placed = await client.getLogs({
    address: ADDRESSES.parlayBook,
    event: PARLAY_PLACED,
    args: { bettor: account },
    fromBlock: 0n,
    toBlock: "latest",
  });
  if (placed.length === 0) return [];

  const ids = placed
    .map((l) => l.args.id)
    .filter((id): id is bigint => typeof id === "bigint");

  // map id -> settle result from ParlaySettled logs (last write wins).
  const settledLogs = await client.getLogs({
    address: ADDRESSES.parlayBook,
    event: PARLAY_SETTLED,
    fromBlock: 0n,
    toBlock: "latest",
  });
  const resultById = new Map<string, number>();
  for (const l of settledLogs) {
    const id = l.args.id;
    const r = l.args.result;
    if (typeof id === "bigint" && typeof r === "number")
      resultById.set(id.toString(), r);
  }

  const conditionalTokens = (await client.readContract({
    address: ADDRESSES.parlayBook,
    abi: parlayBookAbi,
    functionName: "conditionalTokens",
  })) as `0x${string}`;

  const parlays = (await client.multicall({
    contracts: ids.map((id) => ({
      address: ADDRESSES.parlayBook,
      abi: parlayBookAbi,
      functionName: "getParlay",
      args: [id],
    })),
    allowFailure: false,
  })) as unknown as readonly [
    `0x${string}`,
    bigint,
    bigint,
    boolean,
    readonly `0x${string}`[],
    readonly number[],
  ][];

  const out: MyParlay[] = [];
  for (let i = 0; i < ids.length; i++) {
    const [bettor, stake, payout, settled, marketsRaw, outcomesRaw] =
      parlays[i];
    const markets = [...marketsRaw];
    const outcomes = [...outcomesRaw];
    const resultCode = resultById.get(ids[i].toString());
    let result: ParlayResult;
    if (settled) {
      result = resultCode === 1 ? "won" : resultCode === 2 ? "void" : "lost";
    } else {
      result = "open";
    }
    const settleable = settled
      ? false
      : await legsResolved(markets, conditionalTokens);
    out.push({
      id: ids[i],
      bettor,
      stake,
      payout,
      settled,
      markets,
      outcomes,
      result,
      settleable,
    });
  }
  return out.sort((a, b) => Number(b.id - a.id));
}

export function useMyParlays(account: `0x${string}` | undefined) {
  return useQuery({
    queryKey: ["my-parlays", account, PARLAY_CONFIGURED],
    queryFn: () => {
      if (!account) return [];
      return fetchMyParlays(account);
    },
    staleTime: 12_000,
    refetchInterval: 18_000,
    enabled: PARLAY_CONFIGURED && !!account,
  });
}
