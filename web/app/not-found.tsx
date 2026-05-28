import Link from "next/link";
import type { Metadata } from "next";
import { LaurelWreath } from "@/components/ornaments";

export const metadata: Metadata = {
  title: "404 — page not found",
  description: "The page you were looking for isn't here.",
};

// Custom 404. Reuses the classical design language (tabula + LaurelWreath +
// honor accent) so the broken-path landing reads as part of the site, not
// a stock Next.js fallback. Server-rendered, no client state.
export default function NotFound(): JSX.Element {
  return (
    <div className="mx-auto max-w-xl py-12">
      <section className="card tabula relative overflow-hidden p-10 text-center">
        <LaurelWreath
          size={200}
          className="pointer-events-none absolute -right-6 -top-6 select-none text-honor/15"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <span className="gold-ink text-5xl tracking-wider" aria-hidden="true">
            IV · O · IV
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-wide">
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
      </section>
    </div>
  );
}
