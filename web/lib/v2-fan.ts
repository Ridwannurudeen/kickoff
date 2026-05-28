"use client";

import { useReadContract } from "wagmi";
import { keccak256, toBytes } from "viem";
import { fanRepAbi } from "./v2-abis";
import { FAN_REP_CONFIGURED, V2_ADDRESSES } from "./v2-addresses";

const DIM_AGENT_LEAGUE = keccak256(toBytes("AGENT_LEAGUE"));
const DIM_DONOR = keccak256(toBytes("DONOR"));

/** Live read of a wallet's FanRep score. Returns null in demo mode (when
 *  the FanRep contract isn't configured). */
export function useFanScore(user: `0x${string}` | undefined) {
  const enabled = FAN_REP_CONFIGURED && !!user;
  const score = useReadContract({
    address: V2_ADDRESSES.fanRep,
    abi: fanRepAbi,
    functionName: "score",
    args: enabled ? [user!] : undefined,
    query: { enabled },
  });
  const hasFanId = useReadContract({
    address: V2_ADDRESSES.fanRep,
    abi: fanRepAbi,
    functionName: "hasFanId",
    args: enabled ? [user!] : undefined,
    query: { enabled },
  });
  const fanId = useReadContract({
    address: V2_ADDRESSES.fanRep,
    abi: fanRepAbi,
    functionName: "fanIdOf",
    args: enabled ? [user!] : undefined,
    query: { enabled },
  });
  const faves = useReadContract({
    address: V2_ADDRESSES.fanRep,
    abi: fanRepAbi,
    functionName: "favoriteTeamsOf",
    args: enabled ? [user!] : undefined,
    query: { enabled },
  });
  const mintedAt = useReadContract({
    address: V2_ADDRESSES.fanRep,
    abi: fanRepAbi,
    functionName: "mintedAt",
    args: enabled ? [user!] : undefined,
    query: { enabled },
  });
  const agentLeagueXp = useReadContract({
    address: V2_ADDRESSES.fanRep,
    abi: fanRepAbi,
    functionName: "xpOf",
    args: enabled ? [user!, DIM_AGENT_LEAGUE] : undefined,
    query: { enabled },
  });
  const donorXp = useReadContract({
    address: V2_ADDRESSES.fanRep,
    abi: fanRepAbi,
    functionName: "xpOf",
    args: enabled ? [user!, DIM_DONOR] : undefined,
    query: { enabled },
  });

  if (!enabled) return null;

  return {
    isLoading:
      score.isLoading ||
      hasFanId.isLoading ||
      fanId.isLoading ||
      faves.isLoading ||
      mintedAt.isLoading ||
      agentLeagueXp.isLoading ||
      donorXp.isLoading,
    hasFanId: Boolean(hasFanId.data),
    fanId: (fanId.data ?? 0n) as bigint,
    mintedAt: (mintedAt.data ?? 0n) as bigint,
    total: (score.data?.[0] ?? 0n) as bigint,
    predictionAccuracyBps: (score.data?.[1] ?? 0n) as bigint,
    engagementBreadth: (score.data?.[2] ?? 0n) as bigint,
    longevityDays: (score.data?.[3] ?? 0n) as bigint,
    agentLeagueXp: (agentLeagueXp.data ?? 0n) as bigint,
    donorXp: (donorXp.data ?? 0n) as bigint,
    favoriteTeams: (faves.data ?? []) as readonly number[],
    refetch: async () => {
      await Promise.all([
        score.refetch(),
        hasFanId.refetch(),
        fanId.refetch(),
        faves.refetch(),
        mintedAt.refetch(),
        agentLeagueXp.refetch(),
        donorXp.refetch(),
      ]);
    },
  };
}
