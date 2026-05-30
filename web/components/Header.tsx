"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useT } from "./I18nProvider";
import { CHAIN_ID } from "@/lib/config";
import type { TranslationKey } from "@/lib/i18n";

// X Layer testnet faucet URL (override via NEXT_PUBLIC_FAUCET_URL).
const FAUCET_URL =
  process.env.NEXT_PUBLIC_FAUCET_URL ?? "https://www.okx.com/xlayer/faucet";

const NAV: { href: string; key: TranslationKey }[] = [
  { href: "/", key: "nav_home" },
  { href: "/schedule", key: "nav_schedule" },
  { href: "/quests", key: "nav_quests" },
  { href: "/trophies", key: "nav_trophies" },
  { href: "/league", key: "nav_league" },
  { href: "/leaderboard", key: "nav_leaderboard" },
  { href: "/companion", key: "nav_companion" },
];

export function Header() {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-pitch-border bg-pitch-bg/85 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl uppercase tracking-wide">
              Kick<span className="text-grass">off</span>
            </span>
            <span className="hidden rounded bg-pitch-raised px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted sm:inline">
              WC 2026
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {CHAIN_ID !== 196 && (
              <a
                href={FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open X Layer testnet faucet (opens in a new tab)"
                title="Get free testnet OKB"
                className="hidden items-center gap-1.5 rounded-md border border-pitch-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-grass/40 hover:text-white sm:inline-flex"
              >
                Faucet
              </a>
            )}
            <LocaleSwitcher />
            <ConnectButton />
          </div>
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => {
            const active =
              n.href === "/"
                ? pathname === "/"
                : pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-grass text-white"
                    : "border-transparent text-muted hover:text-white"
                }`}
              >
                {t(n.key)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
