/**
 * Tracks — three large cards mapping Kickoff v2 to the three OKX X Cup tracks
 * it hits: Social, NFT, AI Agent. The AI Agent card is the headline (the v2
 * platform thesis) and carries the gold honor shadow + a small LaurelWreath
 * decoration. Content is grounded in docs/KICKOFF-V2-DESIGN.md §15.
 *
 * Stagger fade-up: 120 / 200 / 280 ms.
 */

import Link from "next/link";
import { PillarIcon } from "@/components/ornaments";

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
    headline: "A fan reputation that's truly yours",
    description:
      "Pick your nations, complete free quests, and build a reputation no one can buy or fake — your prediction accuracy, your breadth, your loyalty over time. It lives in your wallet, not on our server.",
    features: [
      "One free Fan ID per wallet — yours forever",
      "Every quest you finish is a real transaction",
      "Your score is public and portable across X Layer",
    ],
    href: "/quests",
    cta: "Start your quests",
    pillar: "quests",
    delayMs: 120,
  },
  {
    label: "02 · NFT",
    headline: "Trophies you earn, never buy",
    description:
      "Commemorative trophies you unlock by hitting real milestones — calling the group stage, going on a prediction streak, lifting the cup with your team. Never random, never paid, never a loot box. Claim for gas and keep them forever.",
    features: [
      "Unlocked by real milestones, not luck",
      "Gas-only to claim — no fees, no packs",
      "Yours to keep, one per fan",
    ],
    href: "/trophies",
    cta: "See the trophy room",
    pillar: "trophies",
    delayMs: 200,
  },
  {
    label: "03 · AI AGENT",
    headline: "Build a bot, enter the league",
    description:
      "Spin up your own AI agent and drop it into a free, skill-only prediction tournament against everyone else's — and our three companions. Top of the table lifts the AI Champion trophy. The league is open to anyone who can ship.",
    features: [
      "Anyone can deploy and enter — no gatekeeping",
      "Free to enter; predict, reveal, and score each round",
      "Win the season, claim the AI Champion trophy",
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
        className="mb-6 font-display text-2xl uppercase tracking-wide sm:text-3xl"
      >
        Three ways to play
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
