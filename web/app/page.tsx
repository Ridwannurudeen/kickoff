"use client";

import Link from "next/link";
import { useAccount, useWriteContract } from "wagmi";
import { useT } from "@/components/I18nProvider";
import { LaurelWreath, PillarIcon } from "@/components/ornaments";
import { TxTicker } from "@/components/TxTicker";
import { useCountUp } from "@/lib/useCountUp";
import { useFanScore } from "@/lib/v2-fan";
import { fanRepAbi } from "@/lib/v2-abis";
import { FAN_REP_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import { txUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";
import { DEMO_PROTOCOL_STATS } from "@/lib/v2-demo";
import { useToasts } from "@/lib/toast";

const TICKER: Array<{ label: string; abbreviated: string; href: string }> = [
  {
    label: "AgentLeague.openSeason",
    abbreviated: "0x5c0db17e…b51ab2",
    href: "https://www.oklink.com/xlayer-test/tx/0x5c0db17e1ece60d6751b0caf36ca3f3400e1ed9221d7369ce0dd6570aab51ab2",
  },
  {
    label: "BYO submitPrediction",
    abbreviated: "0x1832db03…ef3606ec",
    href: "https://www.oklink.com/xlayer-test/tx/0x1832db0349509010c9d48e11385d1904728c39ab8c98ca9361398692ef3606ec",
  },
  {
    label: "BYO scorePrediction +1000 XP",
    abbreviated: "0xa9b688d1…b461c1a",
    href: "https://www.oklink.com/xlayer-test/tx/0xa9b688d1724cc80cae9a30ad3b2a30e65a0c0ba5001217d955674ce35e946f24",
  },
  {
    label: "match-analyst submitResult",
    abbreviated: "0xd97e0d3f…b6038",
    href: "https://www.oklink.com/xlayer-test/tx/0xd97e0d3fb725ad533f7e77a7373c95f04cb935949e6437f2f47b71f8119b6038",
  },
  {
    label: "personal-stats submitResult",
    abbreviated: "0x5a6bee5c…05c51d",
    href: "https://www.oklink.com/xlayer-test/tx/0x5a6bee5c32daf4f68695ba8b002004e1b79863c707869ae1123ae1d89505c51d",
  },
  {
    label: "highlights submitResult",
    abbreviated: "0x3e8dd75c…d9c94",
    href: "https://www.oklink.com/xlayer-test/tx/0x3e8dd75cf73d6ac182774996c90add0a2dd6606a1fbd01900de289353a9d9c94",
  },
];

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
        <LaurelWreath
          size={360}
          className="pointer-events-none absolute -right-12 -top-6 select-none text-honor/10"
        />
        <div className="relative z-10 max-w-2xl">
          <p className="pill mb-4 text-grass">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-grass" />
            {t("home_hero_eyebrow")}
          </p>
          <h1 className="animate-fade-up font-display text-4xl font-extrabold leading-tight tracking-wide sm:text-6xl">
            Kick<span className="text-grass">off</span>
          </h1>
          <p className="mt-3 animate-fade-up text-lg text-muted [animation-delay:60ms]">
            {t("brand_subtitle")}
          </p>
          <div className="mt-6 flex animate-fade-up flex-wrap items-center gap-3 [animation-delay:120ms]">
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
      </section>

      {/* Protocol-wide stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AnimatedStatCard
          label={t("home_stats_fans")}
          target={DEMO_PROTOCOL_STATS.fansOnboarded}
          delayMs={160}
        />
        <AnimatedStatCard
          label={t("home_stats_quests")}
          target={DEMO_PROTOCOL_STATS.questsCompleted}
          delayMs={220}
        />
        <AnimatedStatCard
          label={t("home_stats_trophies")}
          target={DEMO_PROTOCOL_STATS.trophiesMinted}
          delayMs={280}
        />
        <AnimatedStatCard
          label={t("home_stats_agents")}
          target={DEMO_PROTOCOL_STATS.agentsInLeague}
          delayMs={340}
        />
      </section>

      {demo && (
        <p className="text-center text-xs text-muted">
          {t("common_demo_banner")}
        </p>
      )}

      <div className="divider-classical" />

      {/* My Fan ID */}
      <section>
        <h2 className="mb-4 text-xl font-bold">{t("home_my_fan_id")}</h2>
        {!isConnected ? (
          <div className="card p-8 text-center text-sm text-muted">
            {t("common_connect_first")}
          </div>
        ) : !fan || !fan.hasFanId ? (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <LaurelWreath size={48} className="text-honor/40" />
            <p className="font-semibold">{t("home_no_fan_id")}</p>
            <p className="max-w-md text-sm text-muted">
              {t("home_fan_id_mint_help")}
            </p>
            <button onClick={mintFanId} className="btn-primary mt-1">
              {t("home_hero_cta_mint")}
            </button>
          </div>
        ) : (
          <div className="card tabula grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
            <FanStat
              label={t("home_fan_id_minted", { id: fan.fanId.toString() })}
              value={shortAddr(address ?? "")}
              mono
              gold
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
            pillar="quests"
            delayMs={440}
          />
          <Pillar
            href="/trophies"
            title={t("home_pillar_trophies_title")}
            body={t("home_pillar_trophies_body")}
            pillar="trophies"
            delayMs={500}
          />
          <Pillar
            href="/league"
            title={t("home_pillar_league_title")}
            body={t("home_pillar_league_body")}
            pillar="league"
            delayMs={560}
          />
        </div>
      </section>

      <div className="divider-classical" />

      {/* Live on-chain ticker */}
      <section className="space-y-2">
        <p className="pill text-grass">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-grass-glow" />
          Live on-chain · X Layer testnet
        </p>
        <TxTicker
          items={TICKER}
          className="text-xs text-muted hover:text-grass"
        />
      </section>
    </div>
  );
}

function AnimatedStatCard({
  label,
  target,
  delayMs,
}: {
  label: string;
  target: number;
  delayMs: number;
}) {
  const value = useCountUp(target, { durationMs: 1200 });
  return (
    <div
      className="card relative animate-fade-up p-4 transition-colors hover:border-grass/40"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="absolute right-3 top-3 h-1.5 w-1.5 animate-pulse-dot rounded-full bg-grass-glow" />
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-white">
        {fmtInt(Math.floor(value))}
      </p>
    </div>
  );
}

function FanStat({
  label,
  value,
  accent,
  mono,
  gold,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
  gold?: boolean;
}) {
  const tone = gold
    ? "gold-ink"
    : accent
      ? "text-grass"
      : "text-white";
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 text-xl font-extrabold ${tone} ${mono ? "font-mono text-base" : ""}`}
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
  pillar,
  delayMs,
}: {
  href: string;
  title: string;
  body: string;
  pillar: "quests" | "trophies" | "league";
  delayMs: number;
}) {
  return (
    <Link
      href={href}
      className="card group relative flex animate-fade-up flex-col gap-2 overflow-hidden p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-grass/60 hover:shadow-glow"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(60,240,138,0.55),transparent)] bg-[length:200%_100%] opacity-0 group-hover:animate-shimmer group-hover:opacity-100" />
      <PillarIcon
        pillar={pillar}
        size={40}
        className="text-grass transition-colors group-hover:text-grass-glow"
      />
      <h3 className="font-extrabold tracking-wide text-white">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
      <span className="mt-2 text-xs font-medium text-grass group-hover:underline">
        {title} →
      </span>
    </Link>
  );
}
