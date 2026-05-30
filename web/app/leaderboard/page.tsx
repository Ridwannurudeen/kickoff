"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/components/I18nProvider";
import { Flag } from "@/components/Flag";
import { Card, StatTile, SectionHeader, Badge } from "@/components/ui";
import { useFanScore } from "@/lib/v2-fan";
import { teamById, TEAMS } from "@/lib/teams";
import { addressUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";

type LeaderRow = {
  address: `0x${string}`;
  total: number;
  predictionAccuracyBps: number;
  engagementBreadth: number;
  longevityDays: number;
  favoriteTeams?: number[];
};

export default function LeaderboardPage() {
  const { t } = useT();
  const { address, isConnected } = useAccount();
  const fan = useFanScore(address);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("leaderboard_title")}
        </h1>
        <p className="animate-fade-up text-sm text-muted [animation-delay:80ms]">
          {t("leaderboard_subtitle")}
        </p>
      </div>

      {/* Your standing — real on-chain FanRep score for the connected wallet */}
      <section className="animate-fade-up [animation-delay:140ms]">
        <SectionHeader label={t("leaderboard_your_standing")} />
        {!isConnected ? (
          <Card className="p-8 text-center text-sm text-muted">
            {t("leaderboard_connect")}
          </Card>
        ) : !fan || !fan.hasFanId ? (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-muted">{t("leaderboard_no_fanid")}</p>
            <Link href="/" className="btn-primary">
              {t("home_hero_cta_mint")}
            </Link>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <Link
                href={`/profile/${address}`}
                className="statnum text-base hover:text-grass"
              >
                {shortAddr(address ?? "")}
              </Link>
              <a
                href={addressUrl(address ?? "")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted hover:text-grass"
              >
                {t("profile_view_on_explorer")} ↗
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <StatTile
                label={t("leaderboard_col_xp")}
                value={fmtInt(fan.total)}
                accent
              />
              <StatTile
                label={t("leaderboard_col_accuracy")}
                value={`${(Number(fan.predictionAccuracyBps) / 100).toFixed(1)}%`}
              />
              <StatTile
                label={t("leaderboard_col_breadth")}
                value={fmtInt(fan.engagementBreadth)}
              />
              <StatTile
                label={t("home_longevity")}
                value={fmtInt(fan.longevityDays)}
              />
            </div>
            {fan.favoriteTeams.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-pitch-line px-1 pt-4">
                {fan.favoriteTeams.map((tid) => {
                  const team = teamById(Number(tid));
                  if (!team) return null;
                  return (
                    <Link key={tid} href={`/team/${team.id}`}>
                      <Badge tone="grass">
                        <Flag
                          code={team.flag}
                          title={team.name}
                          className="h-3 w-[18px]"
                        />
                        {team.name}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </section>

      {/* Global ranking — real, from the indexer; honest note as fallback. */}
      <section className="animate-fade-up [animation-delay:200ms]">
        <SectionHeader label={t("leaderboard_global_title")} />
        <GlobalRanking address={address} />
      </section>
    </div>
  );
}

function GlobalRanking({ address }: { address?: `0x${string}` }) {
  const { t } = useT();
  const [teamId, setTeamId] = useState<number | "all">("all");
  const { data, isLoading } = useQuery({
    queryKey: ["global-leaderboard"],
    queryFn: async (): Promise<LeaderRow[]> => {
      const res = await fetch("/api/leaderboard");
      const json = (await res.json()) as { rows: LeaderRow[] };
      return json.rows ?? [];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        {t("common_loading")}
      </Card>
    );
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    // No holders yet, or the indexer is unreachable — stay honest.
    return (
      <Card className="p-8 text-center text-sm text-muted">
        {t("leaderboard_global_note")}
      </Card>
    );
  }

  const filtered =
    teamId === "all"
      ? rows
      : rows.filter((r) => r.favoriteTeams?.includes(teamId));

  const teamFilter = (
    <select
      value={teamId}
      onChange={(e) =>
        setTeamId(e.target.value === "all" ? "all" : Number(e.target.value))
      }
      className="input mb-3 max-w-xs"
    >
      <option value="all">{t("leaderboard_filter_all")}</option>
      {TEAMS.map((tm) => (
        <option key={tm.id} value={tm.id}>
          {tm.name} · {t("team_group_label", { group: tm.group })}
        </option>
      ))}
    </select>
  );

  if (filtered.length === 0) {
    return (
      <div>
        {teamFilter}
        <Card className="p-8 text-center text-sm text-muted">
          {t("leaderboard_team_empty")}
        </Card>
      </div>
    );
  }

  return (
    <div>
      {teamFilter}
      <Card className="overflow-hidden p-0">
        {/* Column header */}
        <div className="row label border-b border-pitch-border">
          <span className="w-8 flex-none text-center">
            {t("leaderboard_col_rank")}
          </span>
          <span className="min-w-0 flex-1">{t("leaderboard_col_fan")}</span>
          <span className="w-16 flex-none text-right">
            {t("leaderboard_col_xp")}
          </span>
          <span className="hidden w-24 flex-none text-right sm:block">
            {t("leaderboard_col_accuracy")}
          </span>
          <span className="hidden w-16 flex-none text-right sm:block">
            {t("leaderboard_col_breadth")}
          </span>
        </div>
        {filtered.map((r, i) => {
          const isYou =
            address && r.address.toLowerCase() === address.toLowerCase();
          const rank = i + 1;
          return (
            <div
              key={r.address}
              className={`row ${isYou ? "bg-pitch-raised" : ""}`}
            >
              <span
                className={`statnum w-8 flex-none text-center text-base ${
                  rank <= 3 ? "text-honor" : "text-muted"
                }`}
              >
                {rank}
              </span>
              <Link
                href={`/profile/${r.address}`}
                className="min-w-0 flex-1 truncate font-mono text-sm hover:text-grass"
              >
                {shortAddr(r.address)}
              </Link>
              <span
                className={`statnum w-16 flex-none text-right text-sm ${
                  r.total > 0 ? "text-grass" : "text-muted"
                }`}
              >
                {fmtInt(r.total)}
              </span>
              <span className="hidden w-24 flex-none text-right text-sm tabular-nums text-muted sm:block">
                {(r.predictionAccuracyBps / 100).toFixed(1)}%
              </span>
              <span className="hidden w-16 flex-none text-right text-sm tabular-nums text-muted sm:block">
                {fmtInt(r.engagementBreadth)}
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
