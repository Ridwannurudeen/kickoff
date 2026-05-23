import { useQuery } from "@tanstack/react-query";
import { parseAbiItem } from "viem";
import { publicClient } from "./client";
import { ADDRESSES, FACTORY_CONFIGURED } from "./config";
import { factoryAbi, fpmmAbi } from "./abis";
import { pricesToProbabilities, reservesToProbabilities } from "./prob";
import { outcomeLabels, parseMetadata, questionFor } from "./labels";
import { deployedMeta } from "./deployed";
import type { Market, Outcome } from "./types";
import { MOCK_MARKETS, getMockMarket } from "./mock";

const MARKET_CREATED = parseAbiItem(
  "event MarketCreated(address indexed market, bytes32 indexed conditionId, address collateral, uint8 outcomeSlotCount, string metadataURI)",
);

/** Reads MarketCreated logs once and maps market address -> metadataURI. */
async function fetchMetadataMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!FACTORY_CONFIGURED) return map;
  try {
    const logs = await publicClient().getLogs({
      address: ADDRESSES.factory,
      event: MARKET_CREATED,
      fromBlock: 0n,
      toBlock: "latest",
    });
    for (const log of logs) {
      const m = log.args.market as `0x${string}` | undefined;
      const uri = log.args.metadataURI as string | undefined;
      if (m) map.set(m.toLowerCase(), uri ?? "");
    }
  } catch {
    // RPC may cap the block range; metadata simply falls back to bundled/generic.
  }
  return map;
}

/** Reads all markets from the factory and hydrates each with live FPMM state. */
async function fetchMarkets(): Promise<Market[]> {
  if (!FACTORY_CONFIGURED) return MOCK_MARKETS;

  const client = publicClient();
  const len = (await client.readContract({
    address: ADDRESSES.factory,
    abi: factoryAbi,
    functionName: "marketsLength",
  })) as bigint;

  const count = Number(len);
  if (count === 0) return [];

  const indexes = Array.from({ length: count }, (_, i) => BigInt(i));
  const addresses = (await client.multicall({
    contracts: indexes.map((i) => ({
      address: ADDRESSES.factory,
      abi: factoryAbi,
      functionName: "allMarkets",
      args: [i],
    })),
    allowFailure: false,
  })) as `0x${string}`[];

  const metaMap = await fetchMetadataMap();
  return Promise.all(addresses.map((addr) => hydrateMarket(addr, metaMap)));
}

async function hydrateMarket(
  address: `0x${string}`,
  metaMap: Map<string, string>,
): Promise<Market> {
  const client = publicClient();
  const [countRaw, condId, fee, isClosed, pricesRaw, reservesRaw] =
    (await client.multicall({
      contracts: [
        { address, abi: fpmmAbi, functionName: "outcomeCount" },
        { address, abi: fpmmAbi, functionName: "conditionId" },
        { address, abi: fpmmAbi, functionName: "feeBps" },
        { address, abi: fpmmAbi, functionName: "closed" },
        { address, abi: fpmmAbi, functionName: "prices" },
        { address, abi: fpmmAbi, functionName: "getReserves" },
      ],
      allowFailure: false,
    })) as [bigint, `0x${string}`, bigint, boolean, bigint[], bigint[]];

  const count = Number(countRaw);
  const probs =
    pricesRaw && pricesRaw.length === count
      ? pricesToProbabilities(pricesRaw)
      : reservesToProbabilities(reservesRaw);

  const uri = metaMap.get(address.toLowerCase()) ?? "";
  const parsed = parseMetadata(uri);
  const bundled = deployedMeta(address);
  const category = bundled?.category ?? parsed.category;
  const subject = bundled?.subject ?? parsed.subject;
  const labels =
    bundled?.outcomeLabels.length === count
      ? bundled.outcomeLabels
      : outcomeLabels(category, count, parsed);

  const outcomes: Outcome[] = labels.map((label, i) => ({
    index: i,
    label,
    probability: probs[i] ?? 0,
  }));

  return {
    address,
    conditionId: condId,
    category,
    question: bundled?.title ?? questionFor(category, subject, count),
    subject: subject || `Market ${address.slice(0, 6)}`,
    outcomeCount: count,
    outcomes,
    volume24h: 0,
    isMock: false,
    closed: isClosed,
    feeBps: Number(fee),
    inPlay: false,
  };
}

export function useMarkets() {
  return useQuery({
    queryKey: ["markets", FACTORY_CONFIGURED],
    queryFn: fetchMarkets,
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
}

/** Fetch a single market by FPMM address (real or mock). */
async function fetchMarket(address: string): Promise<Market | undefined> {
  if (!FACTORY_CONFIGURED) return getMockMarket(address);
  const all = await fetchMarkets();
  return all.find((m) => m.address.toLowerCase() === address.toLowerCase());
}

export function useMarket(address: string) {
  return useQuery({
    queryKey: ["market", address, FACTORY_CONFIGURED],
    queryFn: () => fetchMarket(address),
    staleTime: 10_000,
    refetchInterval: 15_000,
    enabled: !!address,
  });
}
