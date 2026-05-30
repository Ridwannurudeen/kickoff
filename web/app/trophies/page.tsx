"use client";

import { useAccount } from "wagmi";
import { useT } from "@/components/I18nProvider";
import { TrophyCard } from "@/components/TrophyCard";
import { TROPHIES } from "@/lib/v2-catalog";
import { useFanScore } from "@/lib/v2-fan";

export default function TrophiesPage() {
  const { t } = useT();
  const { address } = useAccount();
  const fan = useFanScore(address);
  const userXp = fan ? Number(fan.total) : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("trophies_title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("trophies_subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TROPHIES.map((tr) => (
          <TrophyCard key={tr.id} trophy={tr} userXp={userXp} />
        ))}
      </div>
    </div>
  );
}
