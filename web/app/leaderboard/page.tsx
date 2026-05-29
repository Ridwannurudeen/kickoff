"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useT } from "@/components/I18nProvider";
import { Flag } from "@/components/Flag";
import { useFanScore } from "@/lib/v2-fan";
import { teamById } from "@/lib/teams";
import { addressUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";

export default function LeaderboardPage() {
  const { t } = useT();
  const { address, isConnected } = useAccount();
  const fan = useFanScore(address);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("leaderboard_title")}
        </h1>
        <p className="animate-fade-up text-sm text-muted [animation-delay:80ms]">
          {t("leaderboard_subtitle")}
        </p>
      </div>

      {/* Your standing — real on-chain FanRep score for the connected wallet */}
      <section className="animate-fade-up [animation-delay:140ms]">
        <h2 className="mb-3 text-sm font-bold text-muted">
          {t("leaderboard_your_standing")}
        </h2>
        {!isConnected ? (
          <div className="card p-8 text-center text-sm text-muted">
            {t("leaderboard_connect")}
          </div>
        ) : !fan || !fan.hasFanId ? (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-muted">{t("leaderboard_no_fanid")}</p>
            <Link href="/" className="btn-primary">
              {t("home_hero_cta_mint")}
            </Link>
          </div>
        ) : (
          <div className="card tabula p-6">
            <div className="mb-4 flex items-center justify-between">
              <Link
                href={`/profile/${address}`}
                className="font-mono text-sm hover:text-grass"
              >
                {shortAddr(address ?? "")}
              </Link>
              <a
                href={addressUrl(address ?? "")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted hover:text-grass"
              >
                {t("profile_view_on_explorer")} ↗
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat
                label={t("leaderboard_col_xp")}
                value={fmtInt(fan.total)}
                accent
              />
              <Stat
                label={t("leaderboard_col_accuracy")}
                value={`${(Number(fan.predictionAccuracyBps) / 100).toFixed(1)}%`}
              />
              <Stat
                label={t("leaderboard_col_breadth")}
                value={fmtInt(fan.engagementBreadth)}
              />
              <Stat
                label={t("home_longevity")}
                value={fmtInt(fan.longevityDays)}
              />
            </div>
            {fan.favoriteTeams.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-pitch-border pt-4">
                {fan.favoriteTeams.map((tid) => {
                  const team = teamById(Number(tid));
                  if (!team) return null;
                  return (
                    <Link
                      key={tid}
                      href={`/team/${team.id}`}
                      className="pill hover:border-grass/60"
                    >
                      <Flag
                        code={team.flag}
                        title={team.name}
                        className="h-3 w-[18px]"
                      />
                      {team.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="divider-classical" />

      {/* Global ranking — honest: every score is on-chain, public ranking needs
          the events indexer (roadmap). No fabricated rows. */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-muted">
          {t("leaderboard_global_title")}
        </h2>
        <div className="card p-8 text-center text-sm text-muted">
          {t("leaderboard_global_note")}
        </div>
      </section>
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
        className={`mt-1 font-display text-xl font-extrabold tabular-nums ${accent ? "text-grass" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
