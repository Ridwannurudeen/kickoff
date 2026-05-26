"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useT } from "./I18nProvider";
import { fmtInt } from "@/lib/format";
import { txUrl } from "@/lib/config";
import { trophyAbi } from "@/lib/v2-abis";
import { TROPHY_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import type { Trophy } from "@/lib/v2-types";
import { useToasts } from "@/lib/toast";

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

  const owned = useReadContract({
    address: V2_ADDRESSES.trophy,
    abi: trophyAbi,
    functionName: "balanceOf",
    args: !demo && address ? [address, BigInt(trophy.id)] : undefined,
    query: { enabled: !demo && !!address },
  });
  const isOwned = (owned.data ?? 0n) > 0n;

  const claimable = useReadContract({
    address: V2_ADDRESSES.trophy,
    abi: trophyAbi,
    functionName: "claimable",
    args: !demo && address ? [address, BigInt(trophy.id)] : undefined,
    query: { enabled: !demo && !!address },
  });
  // In demo mode, fall back to a simple XP-threshold check so the UI is
  // still informative — users can see which trophies they'd be eligible for.
  const isClaimable = demo
    ? userXp >= trophy.requiredXP && trophy.requiredXP > 0
    : Boolean(claimable.data);

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

  return (
    <div
      className={`card relative flex flex-col gap-3 overflow-hidden p-5 ${
        isOwned ? "border-grass/40 shadow-glow" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-4xl ${isOwned ? "text-grass" : "text-muted/60"}`}
        >
          {trophy.glyph}
        </span>
        {isOwned ? (
          <span className="pill border-grass/60 text-grass">
            {t("trophies_claimed")}
          </span>
        ) : (
          <span className="pill">{t("trophies_locked")}</span>
        )}
      </div>
      <div>
        <h3 className="font-bold text-white">{t(trophy.nameKey)}</h3>
        <p className="mt-1 text-sm text-muted">{t(trophy.descKey)}</p>
      </div>
      <div className="mt-1 text-xs text-muted">
        <p>{t(trophy.conditionKey)}</p>
        {trophy.requiredXP > 0 && (
          <p className="mt-1">
            {t("trophies_progress", {
              have: fmtInt(Math.min(userXp, trophy.requiredXP)),
              need: fmtInt(trophy.requiredXP),
            })}
          </p>
        )}
      </div>
      {!isOwned && (
        <button
          onClick={onClaim}
          disabled={!isClaimable || isPending}
          className="btn-primary !py-1.5 text-xs"
        >
          {isPending ? t("wallet_connecting") : t("trophies_claim")}
        </button>
      )}
    </div>
  );
}
