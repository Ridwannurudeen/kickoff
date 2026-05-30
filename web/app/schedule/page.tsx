"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Card, SegmentedControl, MatchRow, GroupTable } from "@/components/ui";
import { ALL_FIXTURES } from "@/lib/fixtures";
import { GROUP_LETTERS } from "@/lib/teams";

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

      <SegmentedControl<Tab>
        tabs={[
          { id: "fixtures", label: t("schedule_tab_fixtures") },
          { id: "groups", label: t("schedule_tab_groups") },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "fixtures" ? (
        <FixturesList />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROUP_LETTERS.map((g) => (
            <GroupTable key={g} group={g} />
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
          <div className="sticky top-0 z-10 -mx-1 mb-2 bg-pitch-bg/90 px-1 py-2 backdrop-blur">
            <span className="label">{longDate(block.date)}</span>
          </div>
          <Card className="overflow-hidden">
            {block.items.map((fx) => (
              <MatchRow
                key={`${fx.kickoffUnix}-${fx.team1}-${fx.team2}`}
                fixture={fx}
              />
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
