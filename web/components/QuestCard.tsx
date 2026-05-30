"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "./I18nProvider";
import { fmtInt } from "@/lib/format";
import { txUrl } from "@/lib/config";
import { questEngineAbi } from "@/lib/v2-abis";
import { QUEST_ENGINE_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import type { Quest } from "@/lib/v2-types";
import { useToasts } from "@/lib/toast";
import { useFanScore } from "@/lib/v2-fan";
import { waitForTransactionAndRefresh } from "@/lib/tx";
import { PredictionControls } from "./PredictionControls";
import { ListRow, StatusDot, Badge } from "./ui";

type Status = "live" | "upcoming" | "closed";

function statusOf(q: Quest, now: number): Status {
  if (now < q.startsAt) return "upcoming";
  if (now > q.endsAt) return "closed";
  return "live";
}

export function QuestCard({ quest, now }: { quest: Quest; now: number }) {
  const { t } = useT();
  const { address } = useAccount();
  const status = statusOf(quest, now);
  const demo = !QUEST_ENGINE_CONFIGURED;
  const { writeContractAsync, isPending } = useWriteContract();
  const { push, dismiss } = useToasts();
  const fan = useFanScore(address);
  const queryClient = useQueryClient();

  const completed = useReadContract({
    address: V2_ADDRESSES.questEngine,
    abi: questEngineAbi,
    functionName: "completed",
    args: !demo && address ? [quest.id, address] : undefined,
    query: { enabled: !demo && !!address },
  });
  const isCompleted = Boolean(completed.data);

  // PREDICTION quests use the commit→reveal slot picker (PredictionControls).
  // EXTERNAL_PROOF goes through an admin signing route (/api/attest) and the
  // user submits the returned signature on chain.
  const needsAttestation = quest.type === "EXTERNAL_PROOF";
  const isPrediction = quest.type === "PREDICTION";

  const ctaLabel = needsAttestation
    ? t("quests_action_submit_proof")
    : t("quests_action_complete");

  async function onPrimary() {
    if (demo) {
      push({ kind: "info", title: t("common_demo_banner"), ttl: 4000 });
      return;
    }
    if (!address) {
      push({ kind: "info", title: t("common_connect_first"), ttl: 4000 });
      return;
    }
    const id = push({ kind: "pending", title: ctaLabel, ttl: 0 });
    try {
      let hash: `0x${string}`;
      if (needsAttestation) {
        const res = await fetch("/api/attest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ questId: quest.id, userAddress: address }),
        });
        const data = (await res.json()) as {
          signature?: `0x${string}`;
          error?: string;
        };
        if (!data.signature) {
          push({
            kind: "error",
            title: t("common_error"),
            message: data.error ?? "could not get attestation",
            ttl: 8000,
          });
          return;
        }
        hash = await writeContractAsync({
          address: V2_ADDRESSES.questEngine,
          abi: questEngineAbi,
          functionName: "completeExternalProof",
          args: [quest.id, data.signature],
        });
      } else {
        hash = await writeContractAsync({
          address: V2_ADDRESSES.questEngine,
          abi: questEngineAbi,
          functionName: "completeSelfAttest",
          args: [quest.id],
        });
      }
      await waitForTransactionAndRefresh(hash, queryClient);
      push({
        kind: "success",
        title: t("quests_status_completed"),
        href: txUrl(hash),
        ttl: 9000,
      });
      await fan?.refetch();
      await completed.refetch();
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

  const dotTone = isCompleted ? "completed" : status;

  return (
    <ListRow
      left={<StatusDot tone={dotTone} pulse={status === "live"} />}
      title={t(quest.titleKey)}
      subtitle={
        <>
          {t(quest.bodyKey)}
          {quest.context && <span className="ml-1">· ⚽ {quest.context}</span>}
        </>
      }
      right={
        <div className="flex flex-none items-center gap-2">
          <Badge tone="grass">
            {t("quests_xp_reward", { xp: fmtInt(quest.xpReward) })}
          </Badge>
          {isCompleted ? (
            <Badge tone="grass">{t("quests_status_completed")}</Badge>
          ) : isPrediction ? (
            <PredictionControls
              quest={quest}
              status={status}
              address={address}
              onDone={() => completed.refetch()}
            />
          ) : (
            <button
              onClick={onPrimary}
              disabled={status !== "live" || isPending}
              className="btn-primary !px-3 !py-1.5 text-xs"
            >
              {isPending ? t("wallet_connecting") : ctaLabel}
            </button>
          )}
        </div>
      }
    />
  );
}
