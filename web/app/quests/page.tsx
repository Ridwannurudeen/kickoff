"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { LaurelWreath } from "@/components/ornaments";
import { QuestCard } from "@/components/QuestCard";
import { useCountUp } from "@/lib/useCountUp";
import { fmtInt } from "@/lib/format";
import { QUESTS } from "@/lib/v2-catalog";
import type { Quest, QuestType } from "@/lib/v2-types";

type Filter = "all" | "live" | "upcoming" | QuestType;

export default function QuestsPage() {
  const { t } = useT();
  const [filter, setFilter] = useState<Filter>("all");
  // `now` is captured once per render so quest status flickers stay rare;
  // a server-side guard isn't needed because the filter is purely cosmetic.
  const now = useMemo(() => Math.floor(Date.now() / 1000), []);

  const filtered = QUESTS.filter((q) => match(q, filter, now));

  const liveCount = QUESTS.filter(
    (q) => q.startsAt <= now && q.endsAt > now,
  ).length;
  const upcomingCount = QUESTS.filter((q) => q.startsAt > now).length;
  const totalCount = QUESTS.length;

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
        <div className="flex items-center gap-3">
          <h1 className="animate-fade-up font-display text-3xl tracking-wide sm:text-4xl">
            {t("quests_title")}
          </h1>
          <LaurelWreath size={28} className="text-honor/70" />
        </div>
        <p className="animate-fade-up text-sm text-muted [animation-delay:80ms]">
          {t("quests_subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <QuestStat label="Live" value={liveCount} delayMs={160} />
        <QuestStat label="Upcoming" value={upcomingCount} delayMs={220} />
        <QuestStat label="Total" value={totalCount} delayMs={280} />
      </div>

      <div className="divider-classical" />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.id
                ? "bg-grass text-black"
                : "border border-pitch-border bg-pitch-panel text-muted hover:bg-pitch-panel/60 hover:text-white"
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        /** Hardcoded English copy — translators can lift this into a new
         *  `quests_empty_hero` key when the locale files get a refresh. */
        <div className="card tabula flex flex-col items-center gap-3 p-12 text-center">
          <LaurelWreath size={48} className="text-muted/40" />
          <p className="text-sm text-muted">{t("quests_empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((q, i) => (
            <div
              key={q.id}
              className="animate-fade-up"
              style={{ animationDelay: `${(i % 4) * 60 + 320}ms` }}
            >
              <QuestCard quest={q} now={now} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestStat({
  label,
  value,
  delayMs,
}: {
  label: string;
  value: number;
  delayMs: number;
}) {
  const animated = useCountUp(value, { durationMs: 900 });
  return (
    <div
      className="card animate-fade-up p-4"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tracking-wide text-white">
        {fmtInt(Math.floor(animated))}
      </p>
    </div>
  );
}

function match(q: Quest, filter: Filter, now: number): boolean {
  if (filter === "all") return true;
  if (filter === "live") return now >= q.startsAt && now <= q.endsAt;
  if (filter === "upcoming") return now < q.startsAt;
  return q.type === filter;
}
