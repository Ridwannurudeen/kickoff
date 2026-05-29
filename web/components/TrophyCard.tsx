"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "./I18nProvider";
import { TrophyGlyph } from "./ornaments";
import { fmtInt } from "@/lib/format";
import { txUrl } from "@/lib/config";
import { questEngineAbi, trophyAbi } from "@/lib/v2-abis";
import {
  QUEST_ENGINE_CONFIGURED,
  TROPHY_CONFIGURED,
  V2_ADDRESSES,
} from "@/lib/v2-addresses";
import type { Trophy } from "@/lib/v2-types";
import { useToasts } from "@/lib/toast";
import { waitForTransactionAndRefresh } from "@/lib/tx";

// Honor heuristic: the AI Champion (id 5) and Champion of Champions (id 7)
// trophies are the two top-tier "champion" awards in lib/v2-catalog.ts. Only
// those get the gold tabula treatment — every other trophy stays grass-green.
// We additionally check the nameKey so the heuristic survives a future re-id
// of the catalogue without silently turning every card gold.
const CHAMPION_TROPHY_IDS = new Set<number>([5, 7]);
function isChampionTrophy(trophy: Trophy): boolean {
  return (
    CHAMPION_TROPHY_IDS.has(trophy.id) || trophy.nameKey.includes("champion")
  );
}

export function TrophyCard({
  trophy,
  userXp,
}: {
  trophy: Trophy;
  userXp: number;
}) {
  const { t } = useT();
  const { address } = useAccount();
  const demo = !TROPHY_CONFIGURED;
  const { writeContractAsync, isPending } = useWriteContract();
  const { push, dismiss } = useToasts();
  const queryClient = useQueryClient();
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  const owned = useReadContract({
    address: V2_ADDRESSES.trophy,
    abi: trophyAbi,
    functionName: "balanceOf",
    args: !demo && address ? [address, BigInt(trophy.id)] : undefined,
    query: { enabled: !demo && !!address },
  });
  const isOwned = (owned.data ?? 0n) > 0n;

  const rule = useReadContract({
    address: V2_ADDRESSES.trophy,
    abi: trophyAbi,
    functionName: "getRule",
    args: !demo ? [BigInt(trophy.id)] : undefined,
    query: { enabled: !demo },
  });
  const ruleData = rule.data as
    | readonly [bigint, bigint, readonly `0x${string}`[], boolean]
    | undefined;
  const liveRequiredXp = Number(ruleData?.[0] ?? BigInt(trophy.requiredXP));
  const windowEnd = Number(ruleData?.[1] ?? 0n);
  const requiredQuestIds = useMemo(
    () => [...(ruleData?.[2] ?? [])],
    [ruleData],
  );
  const questCompletionContracts = useMemo(
    () =>
      !demo && address && QUEST_ENGINE_CONFIGURED
        ? requiredQuestIds.map((questId) => ({
            address: V2_ADDRESSES.questEngine,
            abi: questEngineAbi,
            functionName: "completed",
            args: [questId, address] as const,
          }))
        : [],
    [address, demo, requiredQuestIds],
  );
  const questCompletions = useReadContracts({
    allowFailure: false,
    contracts: questCompletionContracts,
    query: { enabled: questCompletionContracts.length > 0 },
  });
  const completedRequiredQuests =
    requiredQuestIds.length === 0 ||
    ((questCompletions.data as readonly boolean[] | undefined)?.every(
      Boolean,
    ) ??
      false);
  const windowOpen = windowEnd === 0 || now <= windowEnd;
  const ruleExists = Boolean(ruleData?.[3]);
  // In demo mode, fall back to a simple XP-threshold check so the UI is
  // still informative — users can see which trophies they'd be eligible for.
  const isClaimable = demo
    ? userXp >= trophy.requiredXP && trophy.requiredXP > 0
    : ruleExists &&
      !isOwned &&
      userXp >= liveRequiredXp &&
      windowOpen &&
      completedRequiredQuests;

  async function onClaim() {
    if (demo) {
      push({ kind: "info", title: t("common_demo_banner"), ttl: 4000 });
      return;
    }
    if (!address) {
      push({ kind: "info", title: t("common_connect_first"), ttl: 4000 });
      return;
    }
    const id = push({ kind: "pending", title: t("trophies_claim"), ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: V2_ADDRESSES.trophy,
        abi: trophyAbi,
        functionName: "claim",
        args: [BigInt(trophy.id)],
      });
      await waitForTransactionAndRefresh(hash, queryClient);
      push({
        kind: "success",
        title: t("trophies_claimed"),
        href: txUrl(hash),
        ttl: 9000,
      });
    } catch (e) {
      push({
        kind: "error",
        title: t("common_error"),
        message: e instanceof Error ? e.message.split("\n")[0] : undefined,
        ttl: 6000,
      });
    } finally {
      dismiss(id);
    }
  }

  const isChampion = isChampionTrophy(trophy);

  const body = (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <TrophyGlyph
          id={trophy.id}
          size={64}
          honor={isChampion}
          className={isChampion ? "text-honor" : "text-grass"}
        />
        {isOwned ? (
          <span className="pill border-grass/60 text-grass">
            {t("trophies_claimed")}
          </span>
        ) : (
          <span className="pill">{t("trophies_locked")}</span>
        )}
      </div>
      <div>
        <h3
          className={
            isChampion
              ? "gold-ink font-bold"
              : "font-extrabold tracking-wide text-white"
          }
        >
          {t(trophy.nameKey)}
        </h3>
        <p className="mt-1 text-sm text-muted">{t(trophy.descKey)}</p>
      </div>
      <div className="mt-1 text-xs text-muted">
        <p>{t(trophy.conditionKey)}</p>
        {liveRequiredXp > 0 && (
          <p className="mt-1">
            {t("trophies_progress", {
              have: fmtInt(Math.min(userXp, liveRequiredXp)),
              need: fmtInt(liveRequiredXp),
            })}
          </p>
        )}
      </div>
      {!isOwned && (
        <button
          onClick={onClaim}
          disabled={!isClaimable || isPending}
          className={
            isChampion
              ? "btn !py-1.5 text-xs bg-honor text-pitch-bg hover:bg-honor-glow"
              : "btn-primary !py-1.5 text-xs"
          }
        >
          {isPending ? t("wallet_connecting") : t("trophies_claim")}
        </button>
      )}
    </div>
  );

  if (isChampion) {
    return (
      <div className="tabula card shadow-honor animate-glow-pulse animate-fade-up relative overflow-hidden ring-1 ring-honor/40">
        {body}
      </div>
    );
  }

  return (
    <div
      className={`card animate-fade-up relative overflow-hidden ${
        isOwned ? "border-grass/40 shadow-glow" : ""
      }`}
    >
      {body}
    </div>
  );
}
