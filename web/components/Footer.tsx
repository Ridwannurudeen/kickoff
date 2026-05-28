"use client";

import Link from "next/link";
import { useT } from "./I18nProvider";
import { BuiltOnXLayerBadge } from "./BuiltOnXLayerBadge";
import { ChampionshipMark } from "./ornaments";
import type { TranslationKey } from "@/lib/i18n";

const PRODUCT_LINKS: { href: string; key: TranslationKey }[] = [
  { href: "/quests", key: "nav_quests" },
  { href: "/trophies", key: "nav_trophies" },
  { href: "/companion", key: "nav_companion" },
  { href: "/league", key: "nav_league" },
  { href: "/leaderboard", key: "nav_leaderboard" },
];

const RESOURCE_LINKS: { href: string; label: string }[] = [
  {
    href: "https://github.com/Ridwannurudeen/kickoff",
    label: "GitHub repo",
  },
  {
    href: "https://github.com/Ridwannurudeen/kickoff/blob/main/docs/KICKOFF-V2-DESIGN.md",
    label: "Design doc",
  },
  {
    href: "https://github.com/Ridwannurudeen/kickoff/tree/main/agents/v2-example-byo",
    label: "BYO tutorial",
  },
  {
    href: "https://github.com/Ridwannurudeen/kickoff/blob/main/docs/DEMO_SCRIPT_V2.md",
    label: "Demo script",
  },
];

export function Footer() {
  const { t } = useT();
  return (
    <footer className="mt-16 border-t border-pitch-border bg-pitch-panel/40">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Logo column */}
          <div className="flex flex-col gap-3">
            <ChampionshipMark size={40} className="text-honor/70" />
            <span className="text-lg font-extrabold tracking-tight">
              Kick<span className="text-grass">off</span>
            </span>
            <p className="max-w-[18ch] text-xs text-muted">
              {t("brand_tagline")}
            </p>
          </div>

          {/* Product column */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs uppercase tracking-wide text-marble">
              Product
            </h4>
            <ul className="flex flex-col gap-2">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted transition-colors hover:text-grass"
                  >
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources column */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs uppercase tracking-wide text-marble">
              Resources
            </h4>
            <ul className="flex flex-col gap-2">
              {RESOURCE_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${l.label} (opens in a new tab)`}
                    className="text-sm text-muted transition-colors hover:text-grass"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Brand column */}
          <div className="flex flex-col gap-3">
            <BuiltOnXLayerBadge size="md" />
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Honest scope — not affiliated with or endorsed by FIFA. World Cup
              is a generic phrase here; no licensed marks are displayed.
            </p>
          </div>
        </div>

        <div className="divider-classical mx-auto mt-10 max-w-md" />
        <p className="mt-4 text-center text-xs text-muted">
          © 2026 Kickoff · {t("brand_tagline")} · Free-skill, on-chain · X Layer
          testnet 1952
        </p>
      </div>
    </footer>
  );
}
