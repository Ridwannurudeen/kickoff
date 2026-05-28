"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useT } from "./I18nProvider";
import { fmtInt } from "@/lib/format";
import { txUrl } from "@/lib/config";
import { questEngineAbi } from "@/lib/v2-abis";
import { QUEST_ENGINE_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import type { Quest } from "@/lib/v2-types";
import { useToasts } from "@/lib/toast";
import { useFanScore } from "@/lib/v2-fan";

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

  const completed = useReadContract({
    address: V2_ADDRESSES.questEngine,
    abi: questEngineAbi,
    functionName: "completed",
    args: !demo && address ? [quest.id, address] : undefined,
    query: { enabled: !demo && !!address },
  });
  const isCompleted = Boolean(completed.data);

  const statusLabel =
    status === "live"
      ? t("quests_status_live")
      : status === "upcoming"
        ? t("quests_status_upcoming")
        : t("quests_status_closed");

  // PREDICTION still needs a slot picker tied to a live ConditionalTokens
  // condition; that UI ships with v2.1, so we render the button as a
  // visibly-pending pill. EXTERNAL_PROOF now goes through an admin signing
  // route (/api/attest) and the user submits the returned signature on chain.
  const needsAttestation = quest.type === "EXTERNAL_PROOF";
  const isV21Only = quest.type === "PREDICTION";

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
    if (isV21Only) {
      push({
        kind: "info",
        title: "Prediction quests · v2.1",
        message:
          "PREDICTION quests need a slot picker tied to a live ConditionalTokens condition — that UI ships with v2.1. The on-chain quest itself is registered; the BYO example agent already exercises the same commit-reveal path end-to-end.",
        ttl: 10000,
      });
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
      push({
        kind: "success",
        title: t("quests_status_completed"),
        href: txUrl(hash),
        ttl: 9000,
      });
      fan?.refetch();
      void completed.refetch();
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

  return (
    <div className="card flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-grass/40">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`pill ${
            status === "live"
              ? "border-grass/60 text-grass"
              : status === "upcoming"
                ? "border-pitch-border text-muted"
                : "border-no/50 text-no"
          }`}
        >
          {statusLabel}
        </span>
        <span className="pill border-grass/40 text-grass">
          {t("quests_xp_reward", { xp: fmtInt(quest.xpReward) })}
        </span>
      </div>
      <div>
        <h3 className="font-bold text-white">{t(quest.titleKey)}</h3>
        <p className="mt-1 text-sm text-muted">{t(quest.bodyKey)}</p>
        {quest.context && (
          <p className="mt-2 text-xs text-muted">⚽ {quest.context}</p>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wide text-muted">
          {quest.type}
        </span>
        {isCompleted ? (
          <span className="pill border-grass/60 text-grass">
            {t("quests_status_completed")}
          </span>
        ) : isV21Only ? (
          <button
            onClick={onPrimary}
            className="pill border-honor/40 bg-pitch-panel text-[10px] uppercase tracking-wide text-honor transition-colors hover:border-honor/70"
            title="Prediction quests ship in v2.1 — click for details"
          >
            Soon · v2.1
          </button>
        ) : (
          <button
            onClick={onPrimary}
            disabled={status !== "live" || isPending}
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            {isPending ? t("wallet_connecting") : ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}
