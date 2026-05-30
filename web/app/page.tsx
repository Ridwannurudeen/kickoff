"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useT } from "@/components/I18nProvider";
import { BuiltOnXLayerBadge } from "@/components/BuiltOnXLayerBadge";
import { Countdown } from "@/components/Countdown";
import { TxTicker } from "@/components/TxTicker";
import {
  Card,
  MatchRow,
  SectionHeader,
  StatTile,
  StatusDot,
} from "@/components/ui";
import {
  Architecture,
  CTASection,
  FAQ,
  HowItWorks,
  OnChainProof,
  Tracks,
} from "@/components/landing";
import { useFanScore } from "@/lib/v2-fan";
import { fanRepAbi } from "@/lib/v2-abis";
import { FAN_REP_CONFIGURED, V2_ADDRESSES } from "@/lib/v2-addresses";
import { txUrl } from "@/lib/config";
import { fmtInt, shortAddr } from "@/lib/format";
import { ALL_FIXTURES, KICKOFF_UNIX, nextFixtures } from "@/lib/fixtures";
import { TEAMS } from "@/lib/teams";
import { useToasts } from "@/lib/toast";
import { waitForTransactionAndRefresh } from "@/lib/tx";

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

// Real tournament facts, derived from the fixtures dataset — never fabricated.
const HOST_CITY_COUNT = new Set(ALL_FIXTURES.map((f) => f.ground)).size;
const TOURNAMENT_FACTS = [
  { value: TEAMS.length, labelKey: "home_fact_teams" as const },
  { value: ALL_FIXTURES.length, labelKey: "home_fact_matches" as const },
  { value: HOST_CITY_COUNT, labelKey: "home_fact_cities" as const },
  { value: 3, labelKey: "home_fact_nations" as const },
];

export default function HomePage() {
  const { t } = useT();
  const { address, isConnected } = useAccount();
  const fan = useFanScore(address);
  const { writeContractAsync, isPending } = useWriteContract();
  const { push, dismiss } = useToasts();
  const queryClient = useQueryClient();
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const upcoming = nextFixtures(now, 6);

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
    if (!address) {
      push({ kind: "info", title: t("common_connect_first"), ttl: 4000 });
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
      await waitForTransactionAndRefresh(hash, queryClient);
      await fan?.refetch();
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
    <div className="space-y-8">
      {/* Compact hero — wordmark + live countdown + subtitle + CTAs */}
      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill text-grass">
            <StatusDot tone="grass" pulse />
            {t("home_hero_eyebrow")}
          </span>
          <BuiltOnXLayerBadge size="sm" />
        </div>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-4xl uppercase leading-none tracking-wide sm:text-5xl">
              Kick<span className="text-grass">off</span>
            </h1>
            <p className="mt-2 text-sm text-muted">{t("brand_subtitle")}</p>
          </div>
          <div>
            <p className="label mb-1.5">{t("home_kickoff_in")}</p>
            <Countdown
              targetUnix={KICKOFF_UNIX}
              passedLabel={t("home_kickoff_live")}
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!fan?.hasFanId && (
            <button
              onClick={mintFanId}
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? t("wallet_connecting") : t("home_hero_cta_mint")}
            </button>
          )}
          <Link href="/schedule" className="btn-ghost">
            {t("home_hero_cta_schedule")}
          </Link>
        </div>
      </section>

      {/* Real tournament facts — derived from the fixtures dataset, not invented */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {TOURNAMENT_FACTS.map((f) => (
          <StatTile
            key={f.labelKey}
            label={t(f.labelKey)}
            value={fmtInt(f.value)}
          />
        ))}
      </section>

      {/* Next matches */}
      <section>
        <SectionHeader
          label={t("home_next_matches")}
          action={{ href: "/schedule", label: t("home_full_schedule") }}
        />
        <Card className="divide-y divide-pitch-line p-0">
          {upcoming.map((fx) => (
            <MatchRow
              key={`${fx.kickoffUnix}-${fx.team1}-${fx.team2}`}
              fixture={fx}
            />
          ))}
        </Card>
      </section>

      {demo && (
        <p className="text-center text-xs text-muted">
          {t("common_demo_banner")}
        </p>
      )}

      {/* Your Fan ID — compact summary */}
      <section>
        <SectionHeader label={t("home_my_fan_id")} />
        {!isConnected ? (
          <Card className="p-6 text-center text-sm text-muted">
            {t("common_connect_first")}
          </Card>
        ) : !fan || !fan.hasFanId ? (
          <Card className="flex flex-col items-center gap-3 p-6 text-center">
            <p className="font-semibold">{t("home_no_fan_id")}</p>
            <p className="max-w-md text-sm text-muted">
              {t("home_fan_id_mint_help")}
            </p>
            <button onClick={mintFanId} className="btn-primary mt-1">
              {t("home_hero_cta_mint")}
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label={t("home_fan_id_minted", { id: fan.fanId.toString() })}
              value={shortAddr(address ?? "")}
            />
            <StatTile
              label={t("home_total_xp")}
              value={fmtInt(fan.total)}
              accent
            />
            <StatTile
              label={t("home_prediction_acc")}
              value={`${(Number(fan.predictionAccuracyBps) / 100).toFixed(1)}%`}
            />
            <StatTile
              label={t("home_longevity")}
              value={fmtInt(fan.longevityDays)}
            />
          </div>
        )}
      </section>

      <div className="divider-classical" />

      {/* How it works / about — demoted, dense marketing area */}
      <div className="space-y-8">
        <HowItWorks />
        <Tracks />
        <Architecture />
        <OnChainProof />
        <FAQ />
        <CTASection />
      </div>

      <div className="divider-classical" />

      {/* Live on-chain ticker (existing, kept at the bottom) */}
      <section className="space-y-2">
        <p className="pill text-grass">
          <StatusDot tone="grass" pulse />
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
