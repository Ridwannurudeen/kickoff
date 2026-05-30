"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { isAddress } from "viem";
import { useReadContracts } from "wagmi";
import { useT } from "@/components/I18nProvider";
import { Flag } from "@/components/Flag";
import { Card, SectionHeader, StatTile, ListRow } from "@/components/ui";
import { useFanScore } from "@/lib/v2-fan";
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
      <Card className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted">
        <p>{t("common_error")}</p>
      </Card>
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
      <header className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
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
      </header>

      {!hasFanId ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted">
          <p>{t("profile_no_fan_id")}</p>
        </Card>
      ) : (
        <>
          <section className="animate-fade-up">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              <span
                className={`h-1.5 w-1.5 animate-pulse-dot rounded-full ${live ? "bg-grass-glow" : "bg-honor/60"}`}
              />
              Live on-chain
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <StatTile
                label={t("home_total_xp")}
                value={fmtInt(totalXp)}
                accent
              />
              <StatTile
                label={t("profile_dim_prediction")}
                value={`${(predAccBps / 100).toFixed(1)}%`}
              />
              <StatTile
                label={t("profile_dim_engagement")}
                value={fmtInt(breadth)}
              />
              <StatTile
                label={t("profile_dim_longevity")}
                value={fmtInt(longevity)}
              />
            </div>
          </section>

          {faves.length > 0 && (
            <section>
              <SectionHeader label={t("profile_favorite_teams")} />
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
            <SectionHeader label={t("profile_xp_breakdown")} />
            <Card className="space-y-4 p-5">
              {xpBreakdown.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted">{row.label}</span>
                    <span className="statnum text-white">
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
            </Card>
          </section>

          <section>
            <SectionHeader label={t("profile_activity")} />
            {activity.length === 0 ? (
              <Card className="p-5 text-sm text-muted">
                {t("profile_activity_empty")}
              </Card>
            ) : (
              <Card className="overflow-hidden p-0">
                {activity.map((item, i) => (
                  <ListRow
                    key={`${item.title}-${i}`}
                    title={item.title}
                    right={
                      <span className="statnum text-xs text-muted">
                        {item.detail}
                      </span>
                    }
                  />
                ))}
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
