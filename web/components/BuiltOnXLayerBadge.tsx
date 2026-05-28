"use client";

// BuiltOnXLayerBadge — a typographic "Built on X Layer" mark.
//
// IMPORTANT: this is a text-and-Tailwind composition, NOT a reconstruction of
// the OKX / X Layer brand mark. We do not have the official brand assets
// pre-bundled in this repo (the OKX brand-kit endpoints refused our connection
// during the upgrade pass). The badge is brand-safe to display because it
// uses only the literal text "Built on" + "X Layer" — no proprietary mark.
//
// When the user supplies the official SVG, swap the typographic glyph in the
// `<span aria-hidden="true">X</span>` slot for an inline <svg> while keeping
// the surrounding chip layout. The wordmark accent colour ("Layer") uses the
// existing grass-green action token so the badge stays palette-consistent.

import Link from "next/link";

type BuiltOnXLayerBadgeProps = {
  /** When true, links out to the OKX X Layer page. Defaults true. */
  link?: boolean;
  /** Size variant. */
  size?: "sm" | "md";
  className?: string;
};

export function BuiltOnXLayerBadge({
  link = true,
  size = "md",
  className,
}: BuiltOnXLayerBadgeProps): JSX.Element {
  const padding = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";
  const text = size === "sm" ? "text-[10px]" : "text-xs";

  const content = (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-pitch-border bg-pitch-panel ${padding} ${text} font-medium tracking-wide text-marble ${className ?? ""}`}
    >
      <span className="text-muted">Built on</span>
      <span className="inline-flex items-baseline gap-0.5 font-extrabold">
        {/* The X glyph: bold, kerned tight; serves as our typographic
            stand-in for the X Layer brand mark until the official SVG is
            wired in. */}
        <span aria-hidden="true" className="text-white">
          X
        </span>
        <span className="text-grass">Layer</span>
      </span>
    </span>
  );

  if (!link) return content;
  return (
    <Link
      href="https://www.okx.com/xlayer"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex"
      aria-label="Built on X Layer (opens in a new tab)"
    >
      {content}
    </Link>
  );
}
