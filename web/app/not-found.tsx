import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "404 — page not found",
  description: "The page you were looking for isn't here.",
};

// Custom 404 styled as an "out of bounds" pitch moment so the broken-path
// landing reads as part of the site, not a stock Next.js fallback.
// Server-rendered, no client state.
export default function NotFound(): JSX.Element {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="p-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <span
            className="statnum text-6xl tracking-wider text-grass"
            aria-hidden="true"
          >
            4 · 0 · 4
          </span>
          <h1 className="font-display text-3xl uppercase tracking-wide">
            Out of bounds
          </h1>
          <p className="max-w-sm text-sm text-muted">
            The page you tried isn&rsquo;t on the pitch. Pick a route from the
            options below to get back in play.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Link href="/" className="btn-primary">
              Home
            </Link>
            <Link href="/quests" className="btn-ghost">
              Quests
            </Link>
            <Link href="/companion" className="btn-ghost">
              Companion
            </Link>
            <Link href="/league" className="btn-ghost">
              League
            </Link>
            <Link href="/trophies" className="btn-ghost">
              Trophies
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
