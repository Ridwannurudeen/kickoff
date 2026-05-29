"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { isAddress } from "viem";
import { useReadContracts } from "wagmi";
import { useT } from "@/components/I18nProvider";
import { Flag } from "@/components/Flag";
import { useFanScore } from "@/lib/v2-fan";
import { useCountUp } from "@/lib/useCountUp";
import { addressUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";
import { teamById } from "@/lib/teams";
import { questEngineAbi } from "@/lib/v2-abis";
import { QUESTS } from "@/lib/v2-catalog";
import {
  FAN_REP_CONFIGURED,
  QUEST_ENGINE_CONFIGURED,
  V2_ADDRESSES,
} from "@/lib/v2-addresses";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Deterministic UTC date — avoids the SSR/client locale hydration mismatch
 *  that `toLocaleDateString()` causes. */
function fmtUtcDate(unix: number): string {
  const d = new Date(unix * 1000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export default function ProfilePage() {
  const params = useParams<{ address: string }>();
  const { t } = useT();
  const raw = params?.address ?? "";
  const valid = isAddress(raw);
  const addr = valid ? (raw as `0x${string}`) : undefined;
  const fan = useFanScore(addr);

  const totalXp = fan ? Number(fan.total) : 0;
  const predAccBps = fan ? Number(fan.predictionAccuracyBps) : 0;
  const breadth = fan ? Number(fan.engagementBreadth) : 0;
  const longevity = fan ? Number(fan.longevityDays) : 0;

  const hasFanId = !!fan?.hasFanId;
  const faves = fan?.favoriteTeams ?? [];
  const live = FAN_REP_CONFIGURED && !!fan?.hasFanId;
  const questCompletionContracts = useMemo(
    () =>
      addr && QUEST_ENGINE_CONFIGURED
        ? QUESTS.map((quest) => ({
            address: V2_ADDRESSES.questEngine,
            abi: questEngineAbi,
            functionName: "completed",
            args: [quest.id, addr] as const,
          }))
        : [],
    [addr],
  );
  const questCompletions = useReadContracts({
    allowFailure: false,
    contracts: questCompletionContracts,
    query: { enabled: questCompletionContracts.length > 0 },
  });
  if (!valid) {
    return (
      <div className="card flex flex-col items-center gap-3 py-16 text-center text-sm text-muted">
        <p>{t("common_error")}</p>
      </div>
    );
  }
  const completedFlags =
    (questCompletions.data as readonly boolean[] | undefined) ?? [];
  const completedQuests = QUESTS.filter((_, i) => completedFlags[i]);
  const xpBreakdown = [
    {
      label: t("profile_dim_engagement"),
      value: breadth,
      tone: "bg-grass",
    },
    {
      label: t("profile_dim_prediction"),
      value: predAccBps,
      tone: "bg-honor",
    },
    {
      label: t("profile_dim_agent_league"),
      value: Number(fan?.agentLeagueXp ?? 0n),
      tone: "bg-grass-glow",
    },
    {
      label: t("profile_dim_donor"),
      value: Number(fan?.donorXp ?? 0n),
      tone: "bg-no",
    },
  ];
  const maxBreakdown = Math.max(...xpBreakdown.map((x) => x.value), 1);
  const mintedAt = Number(fan?.mintedAt ?? 0n);
  const activity = [
    ...(mintedAt > 0
      ? [
          {
            title: t("profile_activity_fan_minted"),
            detail: fmtUtcDate(mintedAt),
          },
        ]
      : []),
    ...completedQuests.map((quest) => ({
      title: t("profile_activity_quest_completed", {
        quest: t(quest.titleKey),
      }),
      detail: t("quests_xp_reward", { xp: fmtInt(quest.xpReward) }),
    })),
    ...(Number(fan?.agentLeagueXp ?? 0n) > 0
      ? [
          {
            title: t("profile_activity_agent_xp"),
            detail: t("quests_xp_reward", {
              xp: fmtInt(fan?.agentLeagueXp ?? 0n),
            }),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
            {t("profile_title")}
          </h1>
          <p className="mt-1 font-mono text-sm text-muted">
            {shortAddr(addr!)}
          </p>
        </div>
        <a
          href={addressUrl(addr!)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost !py-1.5 text-xs"
        >
          {t("profile_view_on_explorer")} ↗
        </a>
      </div>

      {!hasFanId ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center text-sm text-muted">
          <p>{t("profile_no_fan_id")}</p>
        </div>
      ) : (
        <>
          <div className="divider-classical" />

          <section className="relative">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              <span
                className={`h-1.5 w-1.5 animate-pulse-dot rounded-full ${live ? "bg-grass-glow" : "bg-honor/60"}`}
              />
              Live on-chain
            </div>
            <div className="tabula card grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
              <AnimatedStat
                label={t("home_total_xp")}
                target={totalXp}
                delayMs={160}
                accent
              />
              <AnimatedStat
                label={t("profile_dim_prediction")}
                target={predAccBps}
                delayMs={220}
                format={(v) => `${(v / 100).toFixed(1)}%`}
              />
              <AnimatedStat
                label={t("profile_dim_engagement")}
                target={breadth}
                delayMs={280}
              />
              <AnimatedStat
                label={t("profile_dim_longevity")}
                target={longevity}
                delayMs={340}
              />
            </div>
          </section>

          {faves.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-muted">
                {t("profile_favorite_teams")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {faves.map((tid) => {
                  const tm = teamById(Number(tid));
                  return (
                    <Link
                      key={tid}
                      href={`/team/${tid}`}
                      className="pill border-grass/30 hover:border-grass/60"
                    >
                      {tm && (
                        <Flag
                          code={tm.flag}
                          title={tm.name}
                          className="h-3 w-[18px]"
                        />
                      )}
                      {tm ? `${tm.name} · ${tm.group}` : `Team #${tid}`}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-bold text-muted">
              {t("profile_xp_breakdown")}
            </h2>
            <div className="card space-y-4 p-5">
              {xpBreakdown.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted">{row.label}</span>
                    <span className="font-mono tabular-nums text-white">
                      {fmtInt(row.value)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-sm bg-pitch-bg">
                    <div
                      className={`h-full ${row.tone}`}
                      style={{
                        width:
                          row.value === 0
                            ? "0%"
                            : `${Math.max(4, (row.value / maxBreakdown) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold text-muted">
              {t("profile_activity")}
            </h2>
            <div className="card divide-y divide-pitch-border/60 overflow-hidden">
              {activity.length === 0 ? (
                <p className="p-5 text-sm text-muted">
                  {t("profile_activity_empty")}
                </p>
              ) : (
                activity.map((item, i) => (
                  <div
                    key={`${item.title}-${i}`}
                    className="flex items-center justify-between gap-4 p-4 text-sm"
                  >
                    <span className="text-white">{item.title}</span>
                    <span className="font-mono text-xs tabular-nums text-muted">
                      {item.detail}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function AnimatedStat({
  label,
  target,
  delayMs,
  accent,
  format,
}: {
  label: string;
  target: number;
  delayMs: number;
  accent?: boolean;
  format?: (v: number) => string;
}) {
  const value = useCountUp(target, { durationMs: 1200 });
  const rendered = format ? format(value) : fmtInt(Math.floor(value));
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delayMs}ms` }}>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 font-display text-xl tabular-nums ${accent ? "text-grass" : "text-white"}`}
      >
        {rendered}
      </p>
    </div>
  );
}
