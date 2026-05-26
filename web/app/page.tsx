"use client";

import Link from "next/link";
import { useAccount, useWriteContract } from "wagmi";
import { useT } from "@/components/I18nProvider";
import { useFanScore } from "@/lib/v2-fan";
import { fanRepAbi } from "@/lib/v2-abis";
import { FAN_REP_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import { txUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";
import { DEMO_PROTOCOL_STATS } from "@/lib/v2-demo";
import { useToasts } from "@/lib/toast";

export default function HomePage() {
  const { t } = useT();
  const { address, isConnected } = useAccount();
  const fan = useFanScore(address);
  const { writeContractAsync, isPending } = useWriteContract();
  const { push, dismiss } = useToasts();

  const demo = !FAN_REP_CONFIGURED;

  async function mintFanId() {
    if (demo) {
      push({
        kind: "info",
        title: t("common_demo_banner"),
        ttl: 4000,
      });
      return;
    }
    const id = push({
      kind: "pending",
      title: t("home_hero_cta_mint"),
      ttl: 0,
    });
    try {
      const hash = await writeContractAsync({
        address: V2_ADDRESSES.fanRep,
        abi: fanRepAbi,
        functionName: "mint",
        args: [],
      });
      push({
        kind: "success",
        title: t("home_hero_cta_mint"),
        href: txUrl(hash),
        ttl: 9000,
      });
    } catch (e) {
      push({
        kind: "error",
        title: t("common_error"),
        message: e instanceof Error ? e.message.split("\n")[0] : undefined,
        ttl: 6000,
      });
    } finally {
      dismiss(id);
    }
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="card relative overflow-hidden p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <p className="pill mb-4 text-grass">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-grass" />
            {t("home_hero_eyebrow")}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Kick<span className="text-grass">off</span>
          </h1>
          <p className="mt-3 text-lg text-muted">{t("brand_subtitle")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!fan?.hasFanId && (
              <button
                onClick={mintFanId}
                disabled={isPending}
                className="btn-primary"
              >
                {isPending ? t("wallet_connecting") : t("home_hero_cta_mint")}
              </button>
            )}
            <Link href="/quests" className="btn-ghost">
              {t("home_hero_cta_explore")}
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 select-none text-[12rem] opacity-[0.06] md:text-[16rem]">
          ⚽
        </div>
      </section>

      {/* Protocol-wide stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("home_stats_fans")}
          value={fmtInt(DEMO_PROTOCOL_STATS.fansOnboarded)}
        />
        <StatCard
          label={t("home_stats_quests")}
          value={fmtInt(DEMO_PROTOCOL_STATS.questsCompleted)}
        />
        <StatCard
          label={t("home_stats_trophies")}
          value={fmtInt(DEMO_PROTOCOL_STATS.trophiesMinted)}
        />
        <StatCard
          label={t("home_stats_agents")}
          value={fmtInt(DEMO_PROTOCOL_STATS.agentsInLeague)}
        />
      </section>

      {demo && (
        <p className="text-center text-xs text-muted">
          {t("common_demo_banner")}
        </p>
      )}

      {/* My Fan ID */}
      <section>
        <h2 className="mb-4 text-xl font-bold">{t("home_my_fan_id")}</h2>
        {!isConnected ? (
          <div className="card p-8 text-center text-sm text-muted">
            {t("common_connect_first")}
          </div>
        ) : !fan || !fan.hasFanId ? (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <span className="text-3xl">○</span>
            <p className="font-semibold">{t("home_no_fan_id")}</p>
            <p className="max-w-md text-sm text-muted">
              {t("home_fan_id_mint_help")}
            </p>
            <button onClick={mintFanId} className="btn-primary mt-1">
              {t("home_hero_cta_mint")}
            </button>
          </div>
        ) : (
          <div className="card grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
            <FanStat
              label={t("home_fan_id_minted", { id: fan.fanId.toString() })}
              value={shortAddr(address ?? "")}
              mono
            />
            <FanStat
              label={t("home_total_xp")}
              value={fmtInt(fan.total)}
              accent
            />
            <FanStat
              label={t("home_prediction_acc")}
              value={`${(Number(fan.predictionAccuracyBps) / 100).toFixed(1)}%`}
            />
            <FanStat
              label={t("home_longevity")}
              value={fmtInt(fan.longevityDays)}
            />
          </div>
        )}
      </section>

      {/* Pillars */}
      <section>
        <h2 className="mb-4 text-xl font-bold">{t("home_pillars_title")}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Pillar
            href="/quests"
            title={t("home_pillar_quests_title")}
            body={t("home_pillar_quests_body")}
            glyph="◇"
          />
          <Pillar
            href="/trophies"
            title={t("home_pillar_trophies_title")}
            body={t("home_pillar_trophies_body")}
            glyph="★"
          />
          <Pillar
            href="/league"
            title={t("home_pillar_league_title")}
            body={t("home_pillar_league_body")}
            glyph="◎"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function FanStat({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 text-xl font-extrabold ${accent ? "text-grass" : "text-white"} ${mono ? "font-mono text-base" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function Pillar({
  href,
  title,
  body,
  glyph,
}: {
  href: string;
  title: string;
  body: string;
  glyph: string;
}) {
  return (
    <Link
      href={href}
      className="card group flex flex-col gap-2 p-6 transition-colors hover:border-grass/60"
    >
      <span className="text-3xl text-grass">{glyph}</span>
      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
      <span className="mt-2 text-xs font-medium text-grass group-hover:underline">
        {title} →
      </span>
    </Link>
  );
}
