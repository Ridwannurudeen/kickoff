"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import { QuestCard } from "@/components/QuestCard";
import { useCountUp } from "@/lib/useCountUp";
import { fmtInt } from "@/lib/format";
import { StatTile, SegmentedControl } from "@/components/ui";
import { QUESTS } from "@/lib/v2-catalog";
import { upcomingMatchQuests } from "@/lib/v2-match-quests";
import type { Quest, QuestType } from "@/lib/v2-types";

type Filter = "all" | "live" | "upcoming" | QuestType;

export default function QuestsPage() {
  const { t } = useT();
  const [filter, setFilter] = useState<Filter>("all");
  // `now` is captured once per render so quest status flickers stay rare;
  // a server-side guard isn't needed because the filter is purely cosmetic.
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  // Evergreen catalogue quests + the soonest real match-day quests (generated
  // from the fixtures with keeper-matching ids).
  const quests = [...QUESTS, ...upcomingMatchQuests(now, 8)];
  const filtered = quests.filter((q) => match(q, filter, now));

  const liveCount = quests.filter(
    (q) => q.startsAt <= now && q.endsAt > now,
  ).length;
  const upcomingCount = quests.filter((q) => q.startsAt > now).length;
  const totalCount = quests.length;

  const FILTERS: { id: Filter; labelKey: Parameters<typeof t>[0] }[] = [
    { id: "all", labelKey: "quests_filter_all" },
    { id: "live", labelKey: "quests_filter_live" },
    { id: "upcoming", labelKey: "quests_filter_upcoming" },
    { id: "SELF_ATTEST", labelKey: "quests_filter_self_attest" },
    { id: "PREDICTION", labelKey: "quests_filter_prediction" },
    { id: "EXTERNAL_PROOF", labelKey: "quests_filter_external_proof" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="animate-fade-up font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("quests_title")}
        </h1>
        <p className="animate-fade-up text-sm text-muted [animation-delay:80ms]">
          {t("quests_subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <QuestStat label={t("quests_stat_live")} value={liveCount} accent />
        <QuestStat label={t("quests_stat_upcoming")} value={upcomingCount} />
        <QuestStat label={t("quests_stat_total")} value={totalCount} />
      </div>

      <div className="divider-classical" />

      <SegmentedControl
        className="flex-wrap"
        tabs={FILTERS.map((f) => ({ id: f.id, label: t(f.labelKey) }))}
        active={filter}
        onChange={setFilter}
      />

      {filtered.length === 0 ? (
        /** Hardcoded English copy — translators can lift this into a new
         *  `quests_empty_hero` key when the locale files get a refresh. */
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <p className="text-sm text-muted">{t("quests_empty")}</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          {filtered.map((q) => (
            <QuestCard key={q.id} quest={q} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  const animated = useCountUp(value, { durationMs: 900 });
  return (
    <StatTile
      label={label}
      value={fmtInt(Math.floor(animated))}
      accent={accent}
    />
  );
}

function match(q: Quest, filter: Filter, now: number): boolean {
  if (filter === "all") return true;
  if (filter === "live") return now >= q.startsAt && now <= q.endsAt;
  if (filter === "upcoming") return now < q.startsAt;
  return q.type === filter;
}
