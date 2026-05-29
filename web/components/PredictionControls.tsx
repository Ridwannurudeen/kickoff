"use client";

import { useState } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { keccak256, encodeAbiParameters, toHex } from "viem";
import { useT } from "./I18nProvider";
import { txUrl } from "@/lib/config";
import { questEngineAbi } from "@/lib/v2-abis";
import { QUEST_ENGINE_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import { useToasts } from "@/lib/toast";
import { waitForTransactionAndRefresh } from "@/lib/tx";
import type { Quest } from "@/lib/v2-types";
import type { TranslationKey } from "@/lib/i18n";

const ZERO32 = `0x${"0".repeat(64)}`;
const SLOTS: { slot: number; key: TranslationKey }[] = [
  { slot: 0, key: "quests_pick_home" },
  { slot: 1, key: "quests_pick_draw" },
  { slot: 2, key: "quests_pick_away" },
];

type Stored = { slot: number; salt: `0x${string}` };

// The salt must survive until reveal; persist it locally, keyed by quest+wallet.
const predKey = (questId: string, addr: string) =>
  `kickoff.pred.${questId.toLowerCase()}.${addr.toLowerCase()}`;
function loadPred(questId: string, addr: string): Stored | null {
  try {
    const raw = localStorage.getItem(predKey(questId, addr));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}
function savePred(questId: string, addr: string, s: Stored): void {
  try {
    localStorage.setItem(predKey(questId, addr), JSON.stringify(s));
  } catch {
    /* private mode / quota — the commit tx still lands; reveal just needs the salt */
  }
}

/**
 * Commit→reveal UI for a PREDICTION quest. 1X2 slots (Home/Draw/Away).
 * commit = keccak256(abi.encode(uint8 slot, bytes32 salt)); the salt is kept in
 * localStorage and revealed via settlePrediction once the OptimisticOracle
 * settles the match condition. Only rendered when the quest is not yet completed.
 */
export function PredictionControls({
  quest,
  status,
  address,
  onDone,
}: {
  quest: Quest;
  status: "live" | "upcoming" | "closed";
  address?: `0x${string}`;
  onDone?: () => void;
}) {
  const { t } = useT();
  const { writeContractAsync, isPending } = useWriteContract();
  const { push, dismiss } = useToasts();
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<number | null>(null);
  const demo = !QUEST_ENGINE_CONFIGURED;

  const commitRead = useReadContract({
    address: V2_ADDRESSES.questEngine,
    abi: questEngineAbi,
    functionName: "predictionCommit",
    args: !demo && address ? [quest.id, address] : undefined,
    query: { enabled: !demo && !!address },
  });
  const committed = Boolean(commitRead.data && commitRead.data !== ZERO32);

  async function commit(): Promise<void> {
    if (demo) {
      push({ kind: "info", title: t("common_demo_banner"), ttl: 4000 });
      return;
    }
    if (!address) {
      push({ kind: "info", title: t("common_connect_first"), ttl: 4000 });
      return;
    }
    if (picked === null) return;
    const saltBytes = new Uint8Array(32);
    crypto.getRandomValues(saltBytes);
    const salt = toHex(saltBytes);
    const commitHash = keccak256(
      encodeAbiParameters(
        [{ type: "uint8" }, { type: "bytes32" }],
        [picked, salt],
      ),
    );
    const id = push({
      kind: "pending",
      title: t("quests_action_commit_pick"),
      ttl: 0,
    });
    try {
      // Persist BEFORE the tx so a confirmed commit always has its salt to reveal.
      savePred(quest.id, address, { slot: picked, salt });
      const hash = await writeContractAsync({
        address: V2_ADDRESSES.questEngine,
        abi: questEngineAbi,
        functionName: "commitPrediction",
        args: [quest.id, commitHash],
      });
      await waitForTransactionAndRefresh(hash, queryClient);
      await commitRead.refetch();
      push({
        kind: "success",
        title: t("quests_committed"),
        href: txUrl(hash),
        ttl: 9000,
      });
    } catch (e) {
      push({
        kind: "error",
        title: t("common_error"),
        message: e instanceof Error ? e.message.split("\n")[0] : undefined,
        ttl: 7000,
      });
    } finally {
      dismiss(id);
    }
  }

  async function reveal(): Promise<void> {
    if (!address) return;
    const stored = loadPred(quest.id, address);
    if (!stored) {
      push({
        kind: "info",
        title: t("quests_committed"),
        message: t("quests_reveal_other_device"),
        ttl: 6000,
      });
      return;
    }
    const id = push({
      kind: "pending",
      title: t("quests_action_reveal"),
      ttl: 0,
    });
    try {
      const hash = await writeContractAsync({
        address: V2_ADDRESSES.questEngine,
        abi: questEngineAbi,
        functionName: "settlePrediction",
        args: [quest.id, address, stored.slot, stored.salt],
      });
      await waitForTransactionAndRefresh(hash, queryClient);
      onDone?.();
      push({
        kind: "success",
        title: t("quests_status_completed"),
        href: txUrl(hash),
        ttl: 9000,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const notSettled = /ConditionNotResolved|not resolved/i.test(msg);
      push({
        kind: notSettled ? "info" : "error",
        title: notSettled ? t("quests_result_pending") : t("common_error"),
        message: notSettled ? undefined : msg.split("\n")[0],
        ttl: 7000,
      });
    } finally {
      dismiss(id);
    }
  }

  if (committed) {
    const stored = address ? loadPred(quest.id, address) : null;
    const pick = stored ? t(SLOTS[stored.slot]?.key ?? "quests_committed") : "";
    return (
      <div className="flex items-center gap-2">
        <span className="pill text-muted">
          {t("quests_committed")}
          {pick ? `: ${pick}` : ""}
        </span>
        <button
          disabled={isPending}
          onClick={reveal}
          className="btn-primary !px-3 !py-1.5 text-xs"
        >
          {isPending ? t("wallet_connecting") : t("quests_action_reveal")}
        </button>
      </div>
    );
  }

  if (status !== "live") {
    return (
      <span className="pill text-muted">
        {status === "upcoming"
          ? t("quests_status_upcoming")
          : t("quests_status_closed")}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-1">
        {SLOTS.map((s) => (
          <button
            key={s.slot}
            onClick={() => setPicked(s.slot)}
            className={`pill text-xs ${picked === s.slot ? "border-grass text-grass" : "text-muted hover:text-white"}`}
          >
            {t(s.key)}
          </button>
        ))}
      </div>
      <button
        disabled={picked === null || isPending}
        onClick={commit}
        className="btn-primary !px-3 !py-1.5 text-xs"
      >
        {isPending ? t("wallet_connecting") : t("quests_action_commit_pick")}
      </button>
    </div>
  );
}
