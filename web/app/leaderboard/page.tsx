"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { TEAMS } from "@/lib/teams";
import { DEMO_LEADERBOARD } from "@/lib/v2-demo";
import { addressUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";

type Scope = "global" | "team";

export default function LeaderboardPage() {
  const { t } = useT();
  const [scope, setScope] = useState<Scope>("global");
  const [teamId, setTeamId] = useState<number>(TEAMS[0].id);

  // Demo data is global; a real team filter would require an indexer mapping
  // wallets → favoriteTeams. Until then, the team scope renders the same
  // global ordering with the chosen team shown in the breakdown.
  const rows = DEMO_LEADERBOARD;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide sm:text-4xl">
          {t("leaderboard_title")}
        </h1>
        <p className="text-sm text-muted">{t("leaderboard_subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-pitch-bg p-1">
          <button
            onClick={() => setScope("global")}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              scope === "global" ? "bg-pitch-card text-white" : "text-muted"
            }`}
          >
            {t("leaderboard_sort_global")}
          </button>
          <button
            onClick={() => setScope("team")}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              scope === "team" ? "bg-pitch-card text-white" : "text-muted"
            }`}
          >
            {t("leaderboard_sort_team")}
          </button>
        </div>
        {scope === "team" && (
          <select
            value={teamId}
            onChange={(e) => setTeamId(Number(e.target.value))}
            className="input max-w-xs"
          >
            {TEAMS.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name} · Group {tm.group}
              </option>
            ))}
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card py-16 text-center text-sm text-muted">
          {t("leaderboard_empty")}
        </div>
      ) : (
        <div className="card overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-pitch-border text-left text-xs text-muted">
                <th className="py-2 pr-3 font-medium">
                  {t("leaderboard_col_rank")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("leaderboard_col_fan")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("leaderboard_col_xp")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("leaderboard_col_accuracy")}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t("leaderboard_col_breadth")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.address}
                  className="border-b border-pitch-border/50 last:border-0"
                >
                  <td className="py-3 pr-3 font-bold text-muted">
                    {i === 0 ? (
                      <span className="gold-ink">I</span>
                    ) : i === 1 || i === 2 ? (
                      <span className="font-display font-semibold text-honor-glow">
                        {i + 1}
                      </span>
                    ) : (
                      i + 1
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${r.address}`}
                        className="font-mono hover:text-grass"
                      >
                        {shortAddr(r.address)}
                      </Link>
                      <a
                        href={addressUrl(r.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted hover:text-grass"
                      >
                        ↗
                      </a>
                    </div>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-grass">
                    {fmtInt(r.totalXp)}
                  </td>
                  <td className="py-3 pr-3 text-muted">
                    {(r.predAccBps / 100).toFixed(1)}%
                  </td>
                  <td className="py-3 pr-3 text-muted">
                    {fmtInt(r.engagement)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
