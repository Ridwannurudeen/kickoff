"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { ChampionshipMark, LaurelWreath, Podium } from "@/components/ornaments";
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

  const topThree = ([1, 2, 3] as const).map((rank) => {
    const entry = rows[rank - 1];
    return {
      rank,
      label: entry ? shortAddr(entry.address) : "—",
      sublabel: entry ? `${fmtInt(entry.totalXp)} XP` : undefined,
    };
  });
  const rest = rows.slice(3);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl tracking-wide sm:text-4xl">
            {t("leaderboard_title")}
          </h1>
          <ChampionshipMark size={36} className="text-honor/70" />
        </div>
        <p className="animate-fade-up text-sm text-muted [animation-delay:80ms]">
          {t("leaderboard_subtitle")}
        </p>
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
        /** Hardcoded English copy — translators can lift this into a new
         *  `leaderboard_empty_hero` key when the locale files get a refresh. */
        <div className="card tabula flex flex-col items-center gap-3 p-12 text-center">
          <LaurelWreath size={48} className="text-muted/40" />
          <p className="text-sm text-muted">
            No fans on the board yet — be the first.
          </p>
        </div>
      ) : (
        <>
          {/** Hardcoded English label — translators can lift this into a new
           *  `leaderboard_podium_label` key when the locale files get a refresh. */}
          <div className="tabula card mx-auto max-w-2xl animate-fade-up p-6 [animation-delay:140ms] md:p-8">
            <div className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Top fans · all-time
            </div>
            <Podium topThree={topThree} className="mx-auto w-full" />
          </div>

          {rest.length > 0 && (
            <>
              <div className="divider-classical" />
              <div className="card animate-fade-up overflow-x-auto p-4 [animation-delay:240ms]">
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
                    {rest.map((r, i) => (
                      <tr
                        key={r.address}
                        className="border-b border-pitch-border/50 transition-colors last:border-0 hover:bg-pitch-panel/60"
                      >
                        <td className="py-3 pr-3 font-display tracking-wide text-muted">
                          {i + 4}
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
                              rel="noopener noreferrer"
                              className="text-xs text-muted hover:text-grass"
                            >
                              ↗
                            </a>
                          </div>
                        </td>
                        <td
                          className={`py-3 pr-3 font-semibold tabular-nums ${
                            r.totalXp > 0 ? "text-grass" : "text-muted"
                          }`}
                        >
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
            </>
          )}
        </>
      )}
    </div>
  );
}
