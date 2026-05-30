"use client";

/**
 * Tracks — three large cards mapping Kickoff v2 to the three OKX X Cup tracks
 * it hits: Social, NFT, AI Agent. The AI Agent card is the headline (the v2
 * platform thesis) and carries the gold honor shadow + a small LaurelWreath
 * decoration. Content is grounded in docs/KICKOFF-V2-DESIGN.md §15.
 *
 * Stagger fade-up: 120 / 200 / 280 ms.
 */

"use client";

import Link from "next/link";
import { PillarIcon } from "@/components/ornaments";
import { useT } from "@/components/I18nProvider";
import { Card, SectionHeader } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

type Track = {
  label: TranslationKey;
  headline: TranslationKey;
  description: TranslationKey;
  features: [TranslationKey, TranslationKey, TranslationKey];
  href: string;
  cta: TranslationKey;
  pillar: "quests" | "trophies" | "league";
  champion?: boolean;
};

const TRACKS: Track[] = [
  {
    label: "tracks_social_label",
    headline: "tracks_social_headline",
    description: "tracks_social_desc",
    features: [
      "tracks_social_feature1",
      "tracks_social_feature2",
      "tracks_social_feature3",
    ],
    href: "/quests",
    cta: "tracks_social_cta",
    pillar: "quests",
  },
  {
    label: "tracks_nft_label",
    headline: "tracks_nft_headline",
    description: "tracks_nft_desc",
    features: [
      "tracks_nft_feature1",
      "tracks_nft_feature2",
      "tracks_nft_feature3",
    ],
    href: "/trophies",
    cta: "tracks_nft_cta",
    pillar: "trophies",
  },
  {
    label: "tracks_ai_label",
    headline: "tracks_ai_headline",
    description: "tracks_ai_desc",
    features: [
      "tracks_ai_feature1",
      "tracks_ai_feature2",
      "tracks_ai_feature3",
    ],
    href: "/league",
    cta: "tracks_ai_cta",
    pillar: "league",
    champion: true,
  },
];

export function Tracks(): JSX.Element {
  const { t } = useT();
  return (
    <section aria-labelledby="tracks-heading">
      <h2 id="tracks-heading" className="sr-only">
        {t("tracks_heading")}
      </h2>
      <SectionHeader label={t("tracks_heading")} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {TRACKS.map((track) => (
          <Card
            key={track.label}
            className={`flex flex-col gap-2.5 p-4 ${track.champion ? "shadow-honor" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="gold-ink text-[10px] uppercase tracking-[0.18em]">
                {t(track.label)}
              </span>
              <PillarIcon
                pillar={track.pillar}
                size={22}
                className={track.champion ? "text-honor" : "text-grass"}
              />
            </div>
            <h3 className="font-display text-base font-extrabold tracking-wide text-white">
              {t(track.headline)}
            </h3>
            <p className="text-xs text-muted">{t(track.description)}</p>
            <ul className="space-y-1 text-xs text-white/90">
              {track.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={`mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full ${
                      track.champion ? "bg-honor" : "bg-grass"
                    }`}
                  />
                  <span>{t(feature)}</span>
                </li>
              ))}
            </ul>
            <Link
              href={track.href}
              className={`mt-1 text-xs font-medium ${
                track.champion
                  ? "text-honor hover:underline"
                  : "text-grass hover:underline"
              }`}
            >
              {t(track.cta)} →
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
