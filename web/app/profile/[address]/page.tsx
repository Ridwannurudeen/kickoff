"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isAddress } from "viem";
import { useT } from "@/components/I18nProvider";
import { ChampionshipMark, LaurelWreath } from "@/components/ornaments";
import { useFanScore } from "@/lib/v2-fan";
import { useCountUp } from "@/lib/useCountUp";
import { addressUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";
import { teamById } from "@/lib/teams";
import { DEMO_LEADERBOARD } from "@/lib/v2-demo";
import { FAN_REP_CONFIGURED } from "@/lib/v2-addresses";

export default function ProfilePage() {
  const params = useParams<{ address: string }>();
  const { t } = useT();
  const raw = params?.address ?? "";
  const valid = isAddress(raw);
  const addr = valid ? (raw as `0x${string}`) : undefined;
  const fan = useFanScore(addr);

  // Demo overlay: when contracts aren't deployed, show the demo-leaderboard
  // entry for this address (if present) so the page still tells a story.
  const demoIdx = addr
    ? DEMO_LEADERBOARD.findIndex(
        (r) => r.address.toLowerCase() === addr.toLowerCase(),
      )
    : -1;
  const demoRow = demoIdx >= 0 ? DEMO_LEADERBOARD[demoIdx] : undefined;

  if (!valid) {
    return (
      <div className="tabula card flex flex-col items-center gap-3 py-16 text-center text-sm text-muted">
        <LaurelWreath size={48} className="text-muted/40" />
        <p>{t("common_error")}</p>
      </div>
    );
  }

  const totalXp = fan ? Number(fan.total) : (demoRow?.totalXp ?? 0);
  const predAccBps = fan
    ? Number(fan.predictionAccuracyBps)
    : (demoRow?.predAccBps ?? 0);
  const breadth = fan
    ? Number(fan.engagementBreadth)
    : (demoRow?.engagement ?? 0);
  const longevity = fan
    ? Number(fan.longevityDays)
    : (demoRow?.longevityDays ?? 0);

  const hasFanId = fan?.hasFanId || !!demoRow;
  const faves = fan?.favoriteTeams ?? [];
  const live = FAN_REP_CONFIGURED && !!fan?.hasFanId;
  const demoRank = demoRow ? demoIdx + 1 : 0;
  const isHonorRank = demoRank > 0 && demoRank <= 3;

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl tracking-wide sm:text-4xl">
              {t("profile_title")}
            </h1>
            <LaurelWreath size={28} className="text-honor/70" />
            <ChampionshipMark
              size={20}
              className="hidden text-honor/40 sm:inline-block"
            />
          </div>
          <p className="gold-ink mt-1 font-mono text-sm">{shortAddr(addr!)}</p>
        </div>
        <a
          href={addressUrl(addr!)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost !py-1.5 text-xs"
        >
          {t("profile_view_on_explorer")} ↗
        </a>
      </div>

      {!hasFanId ? (
        <div className="tabula card flex flex-col items-center gap-3 py-16 text-center text-sm text-muted">
          <LaurelWreath size={40} className="text-muted/40" />
          <p>{t("profile_no_fan_id")}</p>
        </div>
      ) : (
        <>
          {demoRow && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <ChampionshipMark
                size={16}
                className={`inline-block ${isHonorRank ? "text-honor/80" : "text-honor/40"}`}
              />
              <span className="font-display tracking-wide text-marble/80">
                Rank #{demoRank}
              </span>
              <span className="text-muted/60">·</span>
              <span>{t("common_demo_banner")}</span>
            </div>
          )}

          <div className="divider-classical" />

          <section className="relative">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              <span
                className={`h-1.5 w-1.5 animate-pulse-dot rounded-full ${live ? "bg-grass-glow" : "bg-honor/60"}`}
              />
              {live ? "Live on-chain" : t("common_demo_banner")}
            </div>
            <div className="tabula card grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
              <AnimatedStat
                label={t("home_total_xp")}
                target={totalXp}
                delayMs={160}
                accent
              />
              <AnimatedStat
                label={t("profile_dim_prediction")}
                target={predAccBps}
                delayMs={220}
                format={(v) => `${(v / 100).toFixed(1)}%`}
              />
              <AnimatedStat
                label={t("profile_dim_engagement")}
                target={breadth}
                delayMs={280}
              />
              <AnimatedStat
                label={t("profile_dim_longevity")}
                target={longevity}
                delayMs={340}
              />
            </div>
          </section>

          {faves.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-muted">
                {t("profile_favorite_teams")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {faves.map((tid) => {
                  const tm = teamById(tid);
                  return (
                    <Link
                      key={tid}
                      href={`/team/${tid}`}
                      className="pill border-grass/30 hover:border-grass/60"
                    >
                      {tm ? `${tm.name} · ${tm.group}` : `Team #${tid}`}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function AnimatedStat({
  label,
  target,
  delayMs,
  accent,
  format,
}: {
  label: string;
  target: number;
  delayMs: number;
  accent?: boolean;
  format?: (v: number) => string;
}) {
  const value = useCountUp(target, { durationMs: 1200 });
  const rendered = format ? format(value) : fmtInt(Math.floor(value));
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${delayMs}ms` }}>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 text-xl font-extrabold tabular-nums ${accent ? "text-grass" : "text-white"}`}
      >
        {rendered}
      </p>
    </div>
  );
}
