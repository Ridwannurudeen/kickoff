/**
 * TrophyGlyph — per-trophy inline SVG keyed by catalogue id.
 *
 * Football motifs throughout: whistle, shield, golden boot, target, cup,
 * goal-net, and a star cup. All strokes/fills inherit `currentColor`;
 * champion trophies (id 5, 7) are wrapped in `text-honor` by TrophyCard.
 * Pass `honor` to add the gold drop-shadow champion-glow.
 */
type TrophyGlyphProps = {
  id: number;
  size?: number;
  className?: string;
  honor?: boolean;
};

const SHARED_SVG_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function TrophyGlyph({
  id,
  size = 56,
  className,
  honor = false,
}: TrophyGlyphProps): JSX.Element {
  const style = honor
    ? { filter: "drop-shadow(0 0 8px rgba(244,211,94,0.55))" }
    : undefined;
  const svg = (children: JSX.Element) => (
    <svg
      {...SHARED_SVG_PROPS}
      width={size}
      height={size}
      viewBox="0 0 56 56"
      className={className}
      style={style}
    >
      {children}
    </svg>
  );

  switch (id) {
    case 1:
      // First Whistle — referee whistle on a lanyard
      return svg(
        <>
          <path d="M28 4 l -10 14" />
          <path d="M28 4 l 10 14" />
          <rect x="14" y="22" width="22" height="14" rx="3" />
          <rect x="36" y="26" width="8" height="6" rx="1.5" />
          <circle cx="22" cy="29" r="2" />
        </>,
      );
    case 2:
      // Group Survivor — crest / shield
      return svg(
        <>
          <path d="M28 6 L46 12 L46 28 C 46 40, 38 48, 28 52 C 18 48, 10 40, 10 28 L 10 12 Z" />
          <path d="M28 14 v 30" />
          <path d="M14 22 h 28" />
        </>,
      );
    case 3:
      // Pollster (top predictor) — golden boot
      return svg(
        <>
          {/* boot upper + toe */}
          <path d="M12 18 v12 c0 2 1 4 4 4 h26 c2 0 4 -2 3 -5 c-1 -4 -6 -6 -12 -8 c-5 -2 -8 -4 -13 -5 z" />
          {/* sole */}
          <path d="M12 34 h33" />
          {/* studs */}
          <path d="M18 34 v3" />
          <path d="M26 34 v3" />
          <path d="M34 34 v3" />
          {/* laces */}
          <path d="M17 22 h7" />
          <path d="M17 26 h6" />
        </>,
      );
    case 4:
      // Sharpshooter — target with an arrow at centre
      return svg(
        <>
          <circle cx="28" cy="28" r="20" />
          <circle cx="28" cy="28" r="13" />
          <circle cx="28" cy="28" r="6" />
          <path d="M46 10 L 28 28" />
          <path d="M30 26 L 28 28 L 30 30" />
          <path d="M44 8 l 4 4" />
          <path d="M42 12 l 2 2" />
        </>,
      );
    case 5:
      // AI Champion — winners' cup
      return svg(<Cup />);
    case 6:
      // Knockout — ball hitting the back of the net
      return svg(
        <>
          {/* goal frame */}
          <rect x="8" y="12" width="40" height="26" rx="1" />
          {/* net mesh */}
          <path d="M16 12 v26 M24 12 v26 M32 12 v26 M40 12 v26" />
          <path d="M8 20 h40 M8 28 h40" />
          {/* ball */}
          <circle cx="28" cy="42" r="7" fill="var(--pitch-bg,#0a0e0a)" />
          <path
            d="M28 36 l 3 4 l -1.5 5 h -3 l -1.5 -5 z"
            fill="currentColor"
          />
        </>,
      );
    case 7:
      // Champion of Champions — cup crowned with a star
      return svg(
        <>
          <Cup />
          <path
            d="M28 2 l1.6 3.6 l3.9 0.4 l-2.9 2.6 l0.8 3.8 l-3.4 -2 l-3.4 2 l0.8 -3.8 l-2.9 -2.6 l3.9 -0.4 z"
            fill="currentColor"
            stroke="none"
          />
        </>,
      );
    default:
      // generic medallion — circle with a star
      return svg(
        <>
          <circle cx="28" cy="28" r="20" />
          <path d="M28 14 l 4 9 l 10 1 l -7.5 6.5 l 2.5 9.5 l -9 -5 l -9 5 l 2.5 -9.5 l -7.5 -6.5 l 10 -1 z" />
        </>,
      );
  }
}

/** Shared winners'-cup path (bowl + handles + stem + base). */
function Cup(): JSX.Element {
  return (
    <>
      {/* bowl */}
      <path d="M17 16 H39 V20 A11 11 0 0 1 17 20 Z" />
      {/* handles */}
      <path d="M17 17 H12 A5 5 0 0 0 12 27 H16" />
      <path d="M39 17 H44 A5 5 0 0 1 44 27 H40" />
      {/* stem + base */}
      <path d="M28 31 V38" />
      <path d="M24 38 H32 V44 H24 Z" />
      <path d="M20 48 H36" />
      <path d="M24 44 L22 48 M32 44 L34 48" />
    </>
  );
}
