"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isAddress } from "viem";
import { useT } from "@/components/I18nProvider";
import { Laurel } from "@/components/Laurel";
import { useFanScore } from "@/lib/v2-fan";
import { addressUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";
import { teamById } from "@/lib/teams";
import { DEMO_LEADERBOARD } from "@/lib/v2-demo";

export default function ProfilePage() {
  const params = useParams<{ address: string }>();
  const { t } = useT();
  const raw = params?.address ?? "";
  const valid = isAddress(raw);
  const addr = valid ? (raw as `0x${string}`) : undefined;
  const fan = useFanScore(addr);

  // Demo overlay: when contracts aren't deployed, show the demo-leaderboard
  // entry for this address (if present) so the page still tells a story.
  const demoRow = addr
    ? DEMO_LEADERBOARD.find(
        (r) => r.address.toLowerCase() === addr.toLowerCase(),
      )
    : undefined;

  if (!valid) {
    return (
      <div className="card py-16 text-center text-sm text-muted">
        {t("common_error")}
      </div>
    );
  }

  const totalXp = fan ? Number(fan.total) : (demoRow?.totalXp ?? 0);
  const predAcc = fan
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl tracking-wide sm:text-4xl">
              {t("profile_title")}
            </h1>
            <Laurel size={16} className="text-honor" />
          </div>
          <p className="gold-ink mt-1 font-mono text-sm">{shortAddr(addr!)}</p>
        </div>
        <a
          href={addressUrl(addr!)}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost !py-1.5 text-xs"
        >
          {t("profile_view_on_explorer")} ↗
        </a>
      </div>

      {!hasFanId ? (
        <div className="card py-16 text-center text-sm text-muted">
          {t("profile_no_fan_id")}
        </div>
      ) : (
        <>
          <div className="divider-classical" />
          <section className="card tabula grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
            <Stat label={t("home_total_xp")} value={fmtInt(totalXp)} accent />
            <Stat
              label={t("profile_dim_prediction")}
              value={`${(predAcc / 100).toFixed(1)}%`}
            />
            <Stat label={t("profile_dim_engagement")} value={fmtInt(breadth)} />
            <Stat
              label={t("profile_dim_longevity")}
              value={fmtInt(longevity)}
            />
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 text-xl font-extrabold ${accent ? "text-grass" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
