import { useQuery } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { publicClient } from "./client";
import { ADDRESSES, FACTORY_CONFIGURED } from "./config";
import { conditionalTokensAbi, fpmmAbi } from "./abis";
import { formatShares, formatUsdc } from "./format";
import type { LpPosition, Market, Position } from "./types";
import { mockLpPositions, mockPositions } from "./mock";

const BUY_EVENT = parseAbiItem(
  "event FPMMBuy(address indexed buyer, uint8 outcomeIndex, uint256 investmentAmount, uint256 feeAmount, uint256 outcomeTokensBought)",
);

/** How many recent blocks to scan for the account's trade history. */
const LOOKBACK_BLOCKS = 25_000n;

/**
 * Builds an average-entry-cost map keyed by `${market}-${outcomeIndex}` from the
 * account's own FPMMBuy logs: avg cost = total invested / total shares bought.
 * A buy-weighted average is a sufficient cost-basis proxy for the P&L column.
 */
async function fetchCostBasis(
  account: `0x${string}`,
  markets: Market[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (markets.length === 0) return out;
  const client = publicClient();
  const latest = await client.getBlockNumber();
  const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
  const addresses = markets.map((m) => m.address);

  const acc = new Map<string, { invested: number; shares: number }>();
  try {
    const buys = await client.getLogs({
      address: addresses,
      event: BUY_EVENT,
      args: { buyer: account },
      fromBlock,
      toBlock: latest,
    });
    for (const log of buys) {
      const a = log.args;
      const key = `${log.address.toLowerCase()}-${Number(a.outcomeIndex)}`;
      const row = acc.get(key) ?? { invested: 0, shares: 0 };
      row.invested += formatUsdc(a.investmentAmount ?? 0n);
      row.shares += formatShares(a.outcomeTokensBought ?? 0n);
      acc.set(key, row);
    }
  } catch {
    return out; // RPC may cap range; cost basis simply degrades to undefined
  }
  for (const [key, row] of acc) {
    if (row.shares > 0) out.set(key, row.invested / row.shares);
  }
  return out;
}

/**
 * Resolves the connected wallet's positions across all known markets by reading
 * the ConditionalTokens ERC1155 balance for each (positionId, outcome) pair.
 * Works for any outcome count via getPositionIds() -> uint256[].
 */
async function fetchPositions(
  account: `0x${string}`,
  markets: Market[],
): Promise<Position[]> {
  if (!FACTORY_CONFIGURED) return mockPositions();
  if (markets.length === 0) return [];

  const client = publicClient();
  const out: Position[] = [];
  const costBasis = await fetchCostBasis(account, markets);

  for (const m of markets) {
    const [positionIds, condStatus] = (await client.multicall({
      contracts: [
        {
          address: m.address,
          abi: fpmmAbi,
          functionName: "getPositionIds",
        },
        {
          address: ADDRESSES.conditionalTokens,
          abi: conditionalTokensAbi,
          functionName: "conditionStatus",
          args: [m.conditionId],
        },
      ],
      allowFailure: false,
    })) as [bigint[], number];

    const balances = (await client.multicall({
      contracts: positionIds.map((pid) => ({
        address: ADDRESSES.conditionalTokens,
        abi: conditionalTokensAbi,
        functionName: "balanceOf",
        args: [account, pid],
      })),
      allowFailure: false,
    })) as bigint[];

    const resolved = condStatus === 2;
    let payouts: bigint[] = [];
    if (resolved) {
      payouts = (await client.readContract({
        address: ADDRESSES.conditionalTokens,
        abi: conditionalTokensAbi,
        functionName: "payoutNumerators",
        args: [m.conditionId],
      })) as bigint[];
    }

    balances.forEach((bal, i) => {
      if (bal <= 0n) return;
      const outcome = m.outcomes[i];
      out.push({
        market: m.address,
        marketLabel: m.subject,
        outcomeIndex: i,
        outcomeName: outcome?.label ?? `Outcome ${i + 1}`,
        shares: formatShares(bal),
        mark: outcome?.probability ?? 0,
        conditionId: m.conditionId,
        resolved,
        isWinner: resolved && (payouts[i] ?? 0n) > 0n,
        avgCost: costBasis.get(`${m.address.toLowerCase()}-${i}`),
      });
    });
  }

  return out;
}

export function usePositions(
  account: `0x${string}` | undefined,
  markets: Market[] | undefined,
) {
  return useQuery({
    queryKey: ["positions", account, FACTORY_CONFIGURED, markets?.length ?? 0],
    queryFn: () => {
      if (!FACTORY_CONFIGURED) return mockPositions();
      if (!account || !markets) return [];
      return fetchPositions(account, markets);
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    enabled: !FACTORY_CONFIGURED || (!!account && !!markets),
  });
}

/**
 * Resolves the connected wallet's LP (kLP) positions: any market where the FPMM
 * ERC-20 balanceOf(account) > 0, with the claimable LP fees for that account.
 */
async function fetchLpPositions(
  account: `0x${string}`,
  markets: Market[],
): Promise<LpPosition[]> {
  if (!FACTORY_CONFIGURED) return mockLpPositions();
  if (markets.length === 0) return [];

  const client = publicClient();
  const balances = (await client.multicall({
    contracts: markets.map((m) => ({
      address: m.address,
      abi: fpmmAbi,
      functionName: "balanceOf",
      args: [account],
    })),
    allowFailure: false,
  })) as bigint[];

  const held = markets
    .map((m, i) => ({ m, bal: balances[i] }))
    .filter((x) => x.bal > 0n);
  if (held.length === 0) return [];

  const fees = (await client.multicall({
    contracts: held.map(({ m }) => ({
      address: m.address,
      abi: fpmmAbi,
      functionName: "feesWithdrawableBy",
      args: [account],
    })),
    allowFailure: false,
  })) as bigint[];

  return held.map(({ m, bal }, i) => ({
    market: m.address,
    marketLabel: m.subject,
    shares: formatShares(bal),
    claimableFees: formatUsdc(fees[i] ?? 0n),
    feeBps: m.feeBps,
  }));
}

export function useLpPositions(
  account: `0x${string}` | undefined,
  markets: Market[] | undefined,
) {
  return useQuery({
    queryKey: [
      "lp-positions",
      account,
      FACTORY_CONFIGURED,
      markets?.length ?? 0,
    ],
    queryFn: () => {
      if (!FACTORY_CONFIGURED) return mockLpPositions();
      if (!account || !markets) return [];
      return fetchLpPositions(account, markets);
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    enabled: !FACTORY_CONFIGURED || (!!account && !!markets),
  });
}
