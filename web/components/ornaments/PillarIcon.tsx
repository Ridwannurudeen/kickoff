/**
 * PillarIcon — three unique stroke-illustration icons for home Pillar cards.
 *
 * Strokes inherit `currentColor`: parent passes `text-grass` for the default
 * action tone, `text-honor` for champion moments. No fills.
 */
type Pillar = "quests" | "trophies" | "league";

type PillarIconProps = {
  pillar: Pillar;
  size?: number;
  className?: string;
};

const SHARED = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function PillarIcon({
  pillar,
  size = 32,
  className,
}: PillarIconProps): JSX.Element {
  switch (pillar) {
    case "quests":
      // faceted angular rune/diamond
      return (
        <svg
          {...SHARED}
          width={size}
          height={size}
          viewBox="0 0 32 32"
          className={className}
        >
          <path d="M16 3 L 28 13 L 16 29 L 4 13 Z" />
          <path d="M4 13 H 28" />
          <path d="M11 8 L 16 13 L 21 8" />
          <path d="M16 13 V 29" />
        </svg>
      );
    case "trophies":
      // chalice with a single laurel leaf above
      return (
        <svg
          {...SHARED}
          width={size}
          height={size}
          viewBox="0 0 32 32"
          className={className}
        >
          {/* single laurel leaf above */}
          <path d="M16 2 c -3 1 -4 4 -2 6 c 2 -1 3 -4 2 -6 z" />
          {/* cup bowl */}
          <path d="M9 11 h 14 v 3 c 0 5 -3 8 -7 8 c -4 0 -7 -3 -7 -8 z" />
          {/* handles */}
          <path d="M9 13 c -3 0 -4 3 -1 5" />
          <path d="M23 13 c 3 0 4 3 1 5" />
          {/* stem + foot */}
          <path d="M16 22 v 5" />
          <path d="M11 28 h 10" />
        </svg>
      );
    case "league":
      // three-ring overlap (Olympic-style outlines, no fills)
      return (
        <svg
          {...SHARED}
          width={size}
          height={size}
          viewBox="0 0 32 32"
          className={className}
        >
          <circle cx="9" cy="14" r="6" />
          <circle cx="16" cy="20" r="6" />
          <circle cx="23" cy="14" r="6" />
        </svg>
      );
  }
}
