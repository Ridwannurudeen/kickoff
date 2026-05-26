"use client";

import { useReadContract } from "wagmi";
import { fanRepAbi } from "./v2-abis";
import { FAN_REP_CONFIGURED, V2_ADDRESSES } from "./v2-addresses";

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

  if (!enabled) return null;

  return {
    isLoading:
      score.isLoading ||
      hasFanId.isLoading ||
      fanId.isLoading ||
      faves.isLoading,
    hasFanId: Boolean(hasFanId.data),
    fanId: (fanId.data ?? 0n) as bigint,
    total: (score.data?.[0] ?? 0n) as bigint,
    predictionAccuracyBps: (score.data?.[1] ?? 0n) as bigint,
    engagementBreadth: (score.data?.[2] ?? 0n) as bigint,
    longevityDays: (score.data?.[3] ?? 0n) as bigint,
    favoriteTeams: (faves.data ?? []) as readonly number[],
  };
}
