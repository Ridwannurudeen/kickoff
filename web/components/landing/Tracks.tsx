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
  delayMs: number;
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
    delayMs: 120,
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
    delayMs: 200,
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
    delayMs: 280,
  },
];

export function Tracks(): JSX.Element {
  const { t } = useT();
  return (
    <section aria-labelledby="tracks-heading">
      <h2
        id="tracks-heading"
        className="mb-6 font-display text-2xl uppercase tracking-wide sm:text-3xl"
      >
        {t("tracks_heading")}
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {TRACKS.map((track) => (
          <article
            key={track.label}
            className={`tabula card relative flex animate-fade-up flex-col gap-4 overflow-hidden p-6 ${
              track.champion ? "shadow-honor" : ""
            }`}
            style={{ animationDelay: `${track.delayMs}ms` }}
          >
            <div className="relative z-10 flex items-center justify-between">
              <span className="gold-ink text-[11px] uppercase tracking-[0.18em]">
                {t(track.label)}
              </span>
              <PillarIcon
                pillar={track.pillar}
                size={32}
                className={track.champion ? "text-honor" : "text-grass"}
              />
            </div>
            <h3 className="relative z-10 font-display text-xl font-extrabold tracking-wide text-white">
              {t(track.headline)}
            </h3>
            <p className="relative z-10 text-sm text-muted">
              {t(track.description)}
            </p>
            <ul className="relative z-10 space-y-1.5 text-sm text-white/90">
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
              className={`relative z-10 mt-1 text-xs font-medium ${
                track.champion
                  ? "text-honor hover:underline"
                  : "text-grass hover:underline"
              }`}
            >
              {t(track.cta)} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}