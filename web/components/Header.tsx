"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useT } from "./I18nProvider";
import type { TranslationKey } from "@/lib/i18n";

const NAV: { href: string; key: TranslationKey }[] = [
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
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <span className="text-lg font-extrabold tracking-tight">
              Kick<span className="text-grass">off</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active =
                pathname === n.href || pathname.startsWith(`${n.href}/`);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-muted hover:text-white"
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
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
