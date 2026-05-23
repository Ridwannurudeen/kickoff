import { useQuery } from "@tanstack/react-query";
import { publicClient } from "./client";
import { ADDRESSES, ORACLE_CONFIGURED } from "./config";
import { oracleAbi } from "./abis";
import type { Market, OracleState, OracleStatus } from "./types";

const STATUS: OracleStatus[] = ["none", "proposed", "disputed", "settled"];

/**
 * Reads a market's resolution state from the OptimisticOracle: whether a payout
 * has been proposed, is in the dispute window, is disputed, or is settled.
 * Returns undefined when the oracle isn't configured (nice-to-have surface).
 */
async function fetchOracleState(
  market: Market,
): Promise<OracleState | undefined> {
  if (!ORACLE_CONFIGURED) return undefined;
  const client = publicClient();
  try {
    const [proposal, liveness] = (await client.multicall({
      contracts: [
        {
          address: ADDRESSES.oracle,
          abi: oracleAbi,
          functionName: "getProposal",
          args: [market.conditionId],
        },
        { address: ADDRESSES.oracle, abi: oracleAbi, functionName: "liveness" },
      ],
      allowFailure: false,
    })) as [[`0x${string}`, `0x${string}`, bigint, number, bigint[]], bigint];

    const [proposer, disputer, proposedAt, statusIdx, payouts] = proposal;
    const status = STATUS[statusIdx] ?? "none";
    const proposedAtSec = Number(proposedAt);
    const livenessSec = Number(liveness);
    const elapsed = Math.floor(Date.now() / 1000) - proposedAtSec;
    const livenessRemaining =
      status === "proposed" && proposedAtSec > 0
        ? Math.max(0, livenessSec - elapsed)
        : 0;

    return {
      status,
      proposer,
      disputer,
      proposedAt: proposedAtSec,
      livenessRemaining,
      payouts: payouts.map((p) => Number(p)),
    };
  } catch {
    return undefined;
  }
}

export function useOracleState(market: Market | undefined) {
  return useQuery({
    queryKey: ["oracle", market?.conditionId, ORACLE_CONFIGURED],
    queryFn: () => (market ? fetchOracleState(market) : undefined),
    staleTime: 20_000,
    refetchInterval: 30_000,
    enabled: !!market && ORACLE_CONFIGURED,
  });
}
