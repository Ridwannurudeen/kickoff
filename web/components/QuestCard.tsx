"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useT } from "./I18nProvider";
import { fmtInt } from "@/lib/format";
import { txUrl } from "@/lib/config";
import { questEngineAbi } from "@/lib/v2-abis";
import { QUEST_ENGINE_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import type { Quest } from "@/lib/v2-types";
import { useToasts } from "@/lib/toast";

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

  const ctaLabel =
    quest.type === "SELF_ATTEST"
      ? t("quests_action_complete")
      : quest.type === "PREDICTION"
        ? t("quests_action_commit")
        : t("quests_action_submit_proof");

  async function onPrimary() {
    if (demo) {
      push({ kind: "info", title: t("common_demo_banner"), ttl: 4000 });
      return;
    }
    if (!address) {
      push({ kind: "info", title: t("common_connect_first"), ttl: 4000 });
      return;
    }
    if (quest.type !== "SELF_ATTEST") {
      // Prediction commits + external-proof submissions need additional input
      // surfaces (prediction picker, signature blob) we haven't built yet for
      // v1. Surface a clear message rather than half-doing it.
      push({
        kind: "info",
        title: ctaLabel,
        message:
          "This action needs an additional input (prediction or admin attestation) — that surface ships with the on-chain seed.",
        ttl: 6000,
      });
      return;
    }
    const id = push({ kind: "pending", title: ctaLabel, ttl: 0 });
    try {
      const hash = await writeContractAsync({
        address: V2_ADDRESSES.questEngine,
        abi: questEngineAbi,
        functionName: "completeSelfAttest",
        args: [quest.id],
      });
      push({
        kind: "success",
        title: t("quests_status_completed"),
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
