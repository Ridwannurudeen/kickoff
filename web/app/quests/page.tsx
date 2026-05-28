"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Laurel } from "@/components/Laurel";
import { QuestCard } from "@/components/QuestCard";
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
        <h1 className="font-display text-3xl tracking-wide sm:text-4xl">
          {t("quests_title")}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-muted">{t("quests_subtitle")}</p>
          <Laurel size={16} className="text-honor/40" />
        </div>
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
                : "border border-pitch-border bg-pitch-panel text-muted hover:text-white"
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card py-16 text-center text-sm text-muted">
          {t("quests_empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((q) => (
            <QuestCard key={q.id} quest={q} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function match(q: Quest, filter: Filter, now: number): boolean {
  if (filter === "all") return true;
  if (filter === "live") return now >= q.startsAt && now <= q.endsAt;
  if (filter === "upcoming") return now < q.startsAt;
  return q.type === filter;
}
