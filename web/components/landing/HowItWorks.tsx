"use client";

/**
 * HowItWorks — 4-step visual flow showing how a user enters Kickoff.
 *
 * Connect OKX Wallet → Mint Fan ID → Complete Quests → Earn Trophies + Run
 * Agents. Each step is a numbered card with an Arabic numeral, a glyph,
 * a 1-line title, and a 2-line subtitle. Horizontal row on md+, stacked on
 * mobile. Staggered fade-up: 80 / 160 / 240 / 320 ms.
 *
 * Section copy is hardcoded English; parent extracts to i18n later.
 */

"use client";

import { ChampionshipMark, PillarIcon } from "@/components/ornaments";
import { useT } from "@/components/I18nProvider";
import { Card, ListRow, SectionHeader } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n";

type Step = {
  numeral: string;
  title: TranslationKey;
  subtitle: TranslationKey;
  glyph: JSX.Element;
};

const STEPS: Step[] = [
  {
    numeral: "1",
    title: "how_step1_title",
    subtitle: "how_step1_subtitle",
    glyph: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={24}
        height={24}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-grass"
        aria-hidden
      >
        {/* wallet body */}
        <path d="M4 9 h 22 a 2 2 0 0 1 2 2 v 12 a 2 2 0 0 1 -2 2 H 6 a 2 2 0 0 1 -2 -2 Z" />
        {/* flap */}
        <path d="M4 9 V 8 a 2 2 0 0 1 2 -2 h 16 v 3" />
        {/* coin slot */}
        <circle cx="23" cy="17" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    numeral: "2",
    title: "how_step2_title",
    subtitle: "how_step2_subtitle",
    glyph: <ChampionshipMark size={24} className="text-honor" aria-hidden />,
  },
  {
    numeral: "3",
    title: "how_step3_title",
    subtitle: "how_step3_subtitle",
    glyph: <PillarIcon pillar="quests" size={24} className="text-grass" />,
  },
  {
    numeral: "4",
    title: "how_step4_title",
    subtitle: "how_step4_subtitle",
    glyph: (
      <span className="inline-flex items-center gap-1">
        <ChampionshipMark size={20} className="text-honor" aria-hidden />
        <PillarIcon pillar="league" size={18} className="text-grass" />
      </span>
    ),
  },
];

export function HowItWorks(): JSX.Element {
  const { t } = useT();
  return (
    <section aria-labelledby="how-it-works-heading">
      <h2 id="how-it-works-heading" className="sr-only">
        {t("how_heading")}
      </h2>
      <SectionHeader label={t("how_heading")} />
      <Card className="divide-y divide-pitch-line p-0">
        {STEPS.map((step) => (
          <ListRow
            key={step.numeral}
            left={
              <span
                className="font-display text-xl text-grass"
                aria-label={t("how_step_aria", { numeral: step.numeral })}
              >
                {step.numeral}
              </span>
            }
            title={t(step.title)}
            subtitle={t(step.subtitle)}
            right={
              <span className="flex h-8 w-8 flex-none items-center justify-center">
                {step.glyph}
              </span>
            }
          />
        ))}
      </Card>
    </section>
  );
}
