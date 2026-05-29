"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Flag } from "@/components/Flag";
import { FixtureCard } from "@/components/FixtureCard";
import { TEAMS, teamById, teamsByGroup } from "@/lib/teams";
import { fixturesForTeam } from "@/lib/fixtures";
import { QUESTS } from "@/lib/v2-catalog";
import { QuestCard } from "@/components/QuestCard";

export default function TeamPage() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const tid = Number(params?.id ?? "0");
  const team = teamById(tid);
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  if (!team) {
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted">{t("common_error")}</p>
        <Link href="/schedule" className="text-sm text-grass hover:underline">
          ← {t("schedule_title")}
        </Link>
      </div>
    );
  }

  const groupTeams = teamsByGroup(team.group);
  const fixtures = fixturesForTeam(team.name);
  const teamQuests = QUESTS.filter((q) =>
    q.context ? q.context.includes(team.name) : false,
  );

  return (
    <div className="space-y-8">
      <header className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <Flag code={team.flag} title={team.name} className="h-10 w-[60px]" />
          <div>
            <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
              {team.name}
            </h1>
            <p className="text-sm text-muted">
              {t("team_group_label", { group: team.group })}
            </p>
          </div>
        </div>
        <Link href="/schedule" className="btn-ghost !py-1.5 text-xs">
          {t("schedule_title")} ↗
        </Link>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">
          {t("team_group_table")}
        </h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {groupTeams.map((tm) => (
                <tr
                  key={tm.id}
                  className={`border-b border-pitch-border/50 last:border-0 ${
                    tm.id === team.id ? "bg-pitch-panel/60" : ""
                  }`}
                >
                  <td className="py-3 pl-4 pr-3">
                    <Link
                      href={`/team/${tm.id}`}
                      className="flex items-center gap-3 hover:text-grass"
                    >
                      <Flag
                        code={tm.flag}
                        title={tm.name}
                        className="h-4 w-6"
                      />
                      <span
                        className={
                          tm.id === team.id
                            ? "font-semibold text-white"
                            : "text-white"
                        }
                      >
                        {tm.name}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs text-muted">
                    P0 · Pts 0
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">
          {t("team_fixtures")}
        </h2>
        {fixtures.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted">
            {t("team_no_quests")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fixtures.map((fx, i) => (
              <div
                key={`${fx.kickoffUnix}-${fx.team1}-${fx.team2}`}
                className="animate-fade-up"
                style={{ animationDelay: `${120 + i * 50}ms` }}
              >
                <FixtureCard fixture={fx} />
              </div>
            ))}
          </div>
        )}
      </section>

      {teamQuests.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-muted">
            {t("team_quests_title")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teamQuests.map((q, i) => (
              <div
                key={q.id}
                className="animate-fade-up"
                style={{ animationDelay: `${160 + i * 60}ms` }}
              >
                <QuestCard quest={q} now={now} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">All teams</h2>
        <div className="flex flex-wrap gap-2">
          {TEAMS.map((tm) => (
            <Link
              key={tm.id}
              href={`/team/${tm.id}`}
              className={`pill ${
                tm.id === team.id
                  ? "border-grass/60 text-grass"
                  : "hover:border-grass/40"
              }`}
            >
              <Flag code={tm.flag} title={tm.name} className="h-3 w-[18px]" />
              {tm.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
