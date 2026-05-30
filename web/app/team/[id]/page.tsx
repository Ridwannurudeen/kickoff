"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Flag } from "@/components/Flag";
import { Card, SectionHeader, MatchRow, GroupTable } from "@/components/ui";
import { TEAMS, teamById } from "@/lib/teams";
import { fixturesForTeam } from "@/lib/fixtures";
import { matchQuestsForTeam } from "@/lib/v2-match-quests";
import { QuestCard } from "@/components/QuestCard";

export default function TeamPage() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const tid = Number(params?.id ?? "0");
  const team = teamById(tid);
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  if (!team) {
    return (
      <Card className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted">{t("common_error")}</p>
        <Link href="/schedule" className="text-sm text-grass hover:underline">
          ← {t("schedule_title")}
        </Link>
      </Card>
    );
  }

  const fixtures = fixturesForTeam(team.name);
  const teamQuests = matchQuestsForTeam(team.name);

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
        <SectionHeader label={t("team_group_table")} />
        <GroupTable group={team.group} highlightId={team.id} />
      </section>

      <section>
        <SectionHeader label={t("team_fixtures")} />
        {fixtures.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            {t("team_no_quests")}
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {fixtures.map((fx) => (
              <MatchRow
                key={`${fx.kickoffUnix}-${fx.team1}-${fx.team2}`}
                fixture={fx}
              />
            ))}
          </Card>
        )}
      </section>

      {teamQuests.length > 0 && (
        <section>
          <SectionHeader label={t("team_quests_title")} />
          <div className="card overflow-hidden p-0">
            {teamQuests.map((q) => (
              <QuestCard key={q.id} quest={q} now={now} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader label={t("team_all_teams")} />
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
