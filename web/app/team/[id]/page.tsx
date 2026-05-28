"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Laurel } from "@/components/Laurel";
import { TEAMS, teamById, teamsByGroup } from "@/lib/teams";
import { QUESTS } from "@/lib/v2-catalog";
import { QuestCard } from "@/components/QuestCard";

export default function TeamPage() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const tid = Number(params?.id ?? "0");
  const team = teamById(tid);
  const now = useMemo(() => Math.floor(Date.now() / 1000), []);

  if (!team) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">{t("common_error")}</p>
        <Link
          href="/leaderboard"
          className="text-sm text-grass hover:underline"
        >
          ← {t("leaderboard_title")}
        </Link>
      </div>
    );
  }

  const groupMates = teamsByGroup(team.group).filter((tm) => tm.id !== team.id);

  // Any quest whose context name-checks this team is shown here.
  const teamQuests = QUESTS.filter((q) =>
    q.context ? q.context.includes(team.name) : false,
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-pitch-panel px-3 py-2 font-mono text-lg font-bold">
            {team.flag}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl tracking-wide sm:text-4xl">
                {team.name}
              </h1>
              <Laurel size={16} className="text-honor/50" />
            </div>
            <p className="text-sm text-muted">
              {t("team_group_label", { group: team.group })}
            </p>
          </div>
        </div>
        <Link href={`/leaderboard`} className="btn-ghost !py-1.5 text-xs">
          {t("leaderboard_title")} ↗
        </Link>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">
          {t("team_overview")}
        </h2>
        <div className="card p-5">
          <p className="text-sm text-muted">
            {t("team_group_label", { group: team.group })} · {team.name}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {groupMates.map((tm) => (
              <Link
                key={tm.id}
                href={`/team/${tm.id}`}
                className="pill hover:border-grass/60"
              >
                {tm.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="divider-classical" />

      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">
          {t("team_quests_title")}
        </h2>
        {teamQuests.length === 0 ? (
          <div className="card py-10 text-center text-sm text-muted">
            {t("team_no_quests")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teamQuests.map((q) => (
              <QuestCard key={q.id} quest={q} now={now} />
            ))}
          </div>
        )}
      </section>

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
              {tm.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
