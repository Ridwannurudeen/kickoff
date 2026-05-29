"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Flag } from "@/components/Flag";
import { FixtureCard } from "@/components/FixtureCard";
import { ALL_FIXTURES } from "@/lib/fixtures";
import { GROUP_LETTERS, teamsByGroup } from "@/lib/teams";

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

function longDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

type Tab = "fixtures" | "groups";

export default function SchedulePage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("fixtures");

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("schedule_title")}
        </h1>
        <p className="text-sm text-muted">{t("schedule_subtitle")}</p>
      </div>

      <div className="grid w-full max-w-xs grid-cols-2 gap-1 rounded-lg bg-pitch-bg p-1">
        {(["fixtures", "groups"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key ? "bg-pitch-card text-white" : "text-muted"
            }`}
          >
            {t(
              key === "fixtures"
                ? "schedule_tab_fixtures"
                : "schedule_tab_groups",
            )}
          </button>
        ))}
      </div>

      {tab === "fixtures" ? (
        <FixturesList />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROUP_LETTERS.map((g) => (
            <div key={g} className="card overflow-hidden">
              <div className="border-b border-pitch-border bg-pitch-panel px-4 py-2 font-display text-sm uppercase tracking-wide">
                {t("schedule_group_label", { group: g })}
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {teamsByGroup(g).map((tm) => (
                    <tr
                      key={tm.id}
                      className="border-b border-pitch-border/50 last:border-0"
                    >
                      <td className="py-2.5 pl-4 pr-3">
                        <Link
                          href={`/team/${tm.id}`}
                          className="flex items-center gap-3 hover:text-grass"
                        >
                          <Flag
                            code={tm.flag}
                            title={tm.name}
                            className="h-4 w-6"
                          />
                          <span className="text-white">{tm.name}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FixturesList() {
  // ALL_FIXTURES is pre-sorted chronologically; insert a date header whenever
  // the calendar day changes so the list reads like a real match calendar.
  const blocks: { date: string; items: typeof ALL_FIXTURES }[] = [];
  for (const fx of ALL_FIXTURES) {
    const last = blocks[blocks.length - 1];
    if (last && last.date === fx.date) last.items.push(fx);
    else blocks.push({ date: fx.date, items: [fx] });
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <section key={block.date}>
          <h2 className="mb-3 font-display text-lg uppercase tracking-wide text-muted">
            {longDate(block.date)}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {block.items.map((fx) => (
              <FixtureCard
                key={`${fx.kickoffUnix}-${fx.team1}-${fx.team2}`}
                fixture={fx}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
