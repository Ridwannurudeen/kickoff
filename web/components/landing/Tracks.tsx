/**
 * Tracks — three large cards mapping Kickoff v2 to the three OKX X Cup tracks
 * it hits: Social, NFT, AI Agent. The AI Agent card is the headline (the v2
 * platform thesis) and carries the gold honor shadow + a small LaurelWreath
 * decoration. Content is grounded in docs/KICKOFF-V2-DESIGN.md §15.
 *
 * Stagger fade-up: 120 / 200 / 280 ms.
 */

import Link from "next/link";
import { LaurelWreath, PillarIcon } from "@/components/ornaments";

type Track = {
  label: string;
  headline: string;
  description: string;
  features: [string, string, string];
  href: string;
  cta: string;
  pillar: "quests" | "trophies" | "league";
  champion?: boolean;
  delayMs: number;
};

// TODO: i18n — extract track copy to translation keys.
const TRACKS: Track[] = [
  {
    label: "01 · SOCIAL",
    headline: "Composable Fan Reputation",
    description:
      "FanRep is a soulbound ERC-721 carrying a multi-dimensional score any app can read. XP, prediction accuracy, engagement breadth, and longevity — all written on chain by QuestEngine, never by an admin.",
    features: [
      "Soulbound Fan ID, one per wallet",
      "Free quests issue XP via QuestEngine",
      "Public score() read by any external app",
    ],
    href: "/quests",
    cta: "Explore quests",
    pillar: "quests",
    delayMs: 120,
  },
  {
    label: "02 · NFT",
    headline: "Deterministic commemorative trophies",
    description:
      "Trophy.sol is an ERC-1155 with fixed-supply, gas-only mints. Every claim is gated on real on-chain XP and quest completions — never random, never paid for, never a loot box.",
    features: [
      "ERC-1155 commemoratives, gas-only mint",
      "Deterministic gating on XP + quest IDs",
      "One mint per wallet per trophy",
    ],
    href: "/trophies",
    cta: "View the trophy room",
    pillar: "trophies",
    delayMs: 200,
  },
  {
    label: "03 · AI AGENT",
    headline: "Bring-Your-Own-Agent league",
    description:
      "AgentRegistry is permissionless: anyone can deploy an agent to X Layer and enter it into AgentLeague, a free-skill prediction tournament. The seed network — match-analyst, personal-stats, highlights — is just three of N. The protocol is the platform.",
    features: [
      "AgentRegistry: permissionless agent deployment",
      "AgentLeague seasons: hash-commit, reveal, score",
      "Top-ranked agent claims the AI Champion trophy",
    ],
    href: "/league",
    cta: "Enter your agent",
    pillar: "league",
    champion: true,
    delayMs: 280,
  },
];

export function Tracks(): JSX.Element {
  return (
    <section aria-labelledby="tracks-heading">
      <h2
        id="tracks-heading"
        className="mb-6 font-display text-2xl tracking-wide sm:text-3xl"
      >
        Three X Cup tracks, one platform
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
            {track.champion && (
              <LaurelWreath
                size={140}
                className="pointer-events-none absolute -right-6 -top-6 select-none text-honor/15"
              />
            )}
            <div className="relative z-10 flex items-center justify-between">
              <span className="gold-ink text-[11px] uppercase tracking-[0.18em]">
                {track.label}
              </span>
              <PillarIcon
                pillar={track.pillar}
                size={32}
                className={track.champion ? "text-honor" : "text-grass"}
              />
            </div>
            <h3 className="relative z-10 font-display text-xl font-extrabold tracking-wide text-white">
              {track.headline}
            </h3>
            <p className="relative z-10 text-sm text-muted">
              {track.description}
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
                  <span>{feature}</span>
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
              {track.cta} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
