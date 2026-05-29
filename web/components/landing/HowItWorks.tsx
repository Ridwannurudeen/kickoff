/**
 * HowItWorks — 4-step visual flow showing how a user enters Kickoff.
 *
 * Connect OKX Wallet → Mint Fan ID → Complete Quests → Earn Trophies + Run
 * Agents. Each step is a numbered tabula card with a Roman numeral, a glyph,
 * a 1-line title, and a 2-line subtitle. Horizontal row on md+, stacked on
 * mobile. Staggered fade-up: 80 / 160 / 240 / 320 ms.
 *
 * Section copy is hardcoded English; parent extracts to i18n later.
 */

import { ChampionshipMark, PillarIcon } from "@/components/ornaments";

type Step = {
  numeral: string;
  title: string;
  subtitle: string;
  delayMs: number;
  glyph: JSX.Element;
};

// TODO: i18n — extract titles/subtitles to translation keys.
const STEPS: Step[] = [
  {
    numeral: "1",
    title: "Connect OKX Wallet",
    subtitle: "OKB pays gas. No deposits, no sign-ups, no custody.",
    delayMs: 80,
    glyph: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={40}
        height={40}
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
    title: "Mint your Fan ID",
    subtitle: "One soulbound SBT per wallet. Free, gas-only, non-transferable.",
    delayMs: 160,
    glyph: <ChampionshipMark size={40} className="text-honor" aria-hidden />,
  },
  {
    numeral: "3",
    title: "Complete quests",
    subtitle:
      "Watch matches, predict scores, share posts. Every action earns XP on chain.",
    delayMs: 240,
    glyph: <PillarIcon pillar="quests" size={40} className="text-grass" />,
  },
  {
    numeral: "4",
    title: "Earn trophies, run agents",
    subtitle:
      "Claim ERC-1155 commemoratives. Deploy your own AI agent to the league.",
    delayMs: 320,
    glyph: (
      <span className="inline-flex items-center gap-1.5">
        <ChampionshipMark size={32} className="text-honor" aria-hidden />
        <PillarIcon pillar="league" size={28} className="text-grass" />
      </span>
    ),
  },
];

export function HowItWorks(): JSX.Element {
  return (
    <section aria-labelledby="how-it-works-heading">
      <h2
        id="how-it-works-heading"
        className="mb-6 font-display text-2xl tracking-wide sm:text-3xl"
      >
        How Kickoff works
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {STEPS.map((step) => (
          <div
            key={step.numeral}
            className="tabula card relative flex animate-fade-up flex-col gap-3 p-5"
            style={{ animationDelay: `${step.delayMs}ms` }}
          >
            <div className="flex items-center justify-between">
              <span
                className="font-display text-3xl text-grass"
                aria-label={`Step ${step.numeral}`}
              >
                {step.numeral}
              </span>
              <span className="flex h-10 w-10 items-center justify-center">
                {step.glyph}
              </span>
            </div>
            <h3 className="font-extrabold tracking-wide text-white">
              {step.title}
            </h3>
            <p className="text-sm text-muted">{step.subtitle}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
