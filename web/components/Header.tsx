"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useT } from "./I18nProvider";
import { BuiltOnXLayerBadge } from "./BuiltOnXLayerBadge";
import { CHAIN_ID } from "@/lib/config";
import type { TranslationKey } from "@/lib/i18n";

// X Layer testnet faucet URL. Could not be auto-verified from this
// build environment (the OKX docs endpoints refused our connections);
// this is the conventional path used by ecosystem projects. Override via
// NEXT_PUBLIC_FAUCET_URL if the official URL changes.
const FAUCET_URL =
  process.env.NEXT_PUBLIC_FAUCET_URL ?? "https://www.okx.com/xlayer/faucet";

const NAV: { href: string; key: TranslationKey }[] = [
  { href: "/schedule", key: "nav_schedule" },
  { href: "/quests", key: "nav_quests" },
  { href: "/trophies", key: "nav_trophies" },
  { href: "/companion", key: "nav_companion" },
  { href: "/league", key: "nav_league" },
  { href: "/leaderboard", key: "nav_leaderboard" },
];

export function Header() {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-pitch-border bg-pitch-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-display text-xl uppercase tracking-wide">
              Kick<span className="text-grass">off</span>
            </span>
          </Link>
          <BuiltOnXLayerBadge
            size="sm"
            className="ml-3 hidden md:inline-flex"
          />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active =
                pathname === n.href || pathname.startsWith(`${n.href}/`);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
                    active
                      ? "border-grass/70 text-white"
                      : "border-transparent text-muted hover:text-white"
                  }`}
                >
                  {t(n.key)}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {/* Testnet-only faucet chip — sits immediately to the left of the
              wallet button so users can grab gas before connecting. Hidden
              on mainnet (chain 196) where it'd be misleading. */}
          {CHAIN_ID !== 196 && (
            <a
              href={FAUCET_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open X Layer testnet faucet (opens in a new tab)"
              className="hidden items-center gap-1.5 rounded-full border border-honor/40 bg-pitch-panel px-3 py-1 text-xs font-semibold text-honor transition-colors hover:border-honor/70 hover:text-honor-glow sm:inline-flex"
              title="Get free testnet OKB"
            >
              <span aria-hidden="true">⛽</span>
              Faucet
            </a>
          )}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
