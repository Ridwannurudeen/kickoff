import { LaurelWreath } from "./LaurelWreath";

/**
 * TrophyGlyph — per-trophy inline SVG keyed by catalogue id.
 *
 * Switches on `id` to render one of seven Kickoff v2 trophy glyphs. All
 * strokes/fills inherit `currentColor`; champion trophies (id 5, 7) are
 * wrapped in `text-honor` by the parent TrophyCard. Pass `honor` to add the
 * gold drop-shadow filter for the champion-glow look.
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
  const wrapperClass = className;

  switch (id) {
    case 1:
      // whistle on a lanyard
      return (
        <svg
          {...SHARED_SVG_PROPS}
          width={size}
          height={size}
          viewBox="0 0 56 56"
          className={wrapperClass}
          style={style}
        >
          {/* lanyard loop */}
          <path d="M28 4 l -10 14" />
          <path d="M28 4 l 10 14" />
          {/* whistle body */}
          <rect x="14" y="22" width="22" height="14" rx="3" />
          {/* mouthpiece */}
          <rect x="36" y="26" width="8" height="6" rx="1.5" />
          {/* pea hole */}
          <circle cx="22" cy="29" r="2" />
        </svg>
      );
    case 2:
      // shield
      return (
        <svg
          {...SHARED_SVG_PROPS}
          width={size}
          height={size}
          viewBox="0 0 56 56"
          className={wrapperClass}
          style={style}
        >
          <path d="M28 6 L46 12 L46 28 C 46 40, 38 48, 28 52 C 18 48, 10 40, 10 28 L 10 12 Z" />
          <path d="M28 14 v 30" />
          <path d="M14 22 h 28" />
        </svg>
      );
    case 3:
      // owl — Athena's bird
      return (
        <svg
          {...SHARED_SVG_PROPS}
          width={size}
          height={size}
          viewBox="0 0 56 56"
          className={wrapperClass}
          style={style}
        >
          {/* ear tufts */}
          <path d="M14 14 l 4 6" />
          <path d="M42 14 l -4 6" />
          {/* round head */}
          <circle cx="28" cy="24" r="12" />
          {/* eye discs */}
          <circle cx="22" cy="24" r="3.5" />
          <circle cx="34" cy="24" r="3.5" />
          {/* pupils */}
          <circle cx="22" cy="24" r="1" fill="currentColor" />
          <circle cx="34" cy="24" r="1" fill="currentColor" />
          {/* beak */}
          <path d="M28 28 l -1.5 3 h 3 z" />
          {/* perched body + branch */}
          <path d="M20 36 c 4 6 12 6 16 0" />
          <path d="M14 42 h 28" />
          <path d="M24 42 v 4" />
          <path d="M32 42 v 4" />
        </svg>
      );
    case 4:
      // bow + arrow on target (concentric rings + arrow at centre)
      return (
        <svg
          {...SHARED_SVG_PROPS}
          width={size}
          height={size}
          viewBox="0 0 56 56"
          className={wrapperClass}
          style={style}
        >
          <circle cx="28" cy="28" r="20" />
          <circle cx="28" cy="28" r="13" />
          <circle cx="28" cy="28" r="6" />
          {/* arrow shaft running NE → centre */}
          <path d="M46 10 L 28 28" />
          {/* arrowhead */}
          <path d="M30 26 L 28 28 L 30 30" />
          {/* fletching */}
          <path d="M44 8 l 4 4" />
          <path d="M42 12 l 2 2" />
        </svg>
      );
    case 5:
      // AI Champion — circular laurel wreath
      return (
        <div className={wrapperClass} style={style}>
          <LaurelWreath size={size} />
        </div>
      );
    case 6:
      // Knockout — crossed swords
      return (
        <svg
          {...SHARED_SVG_PROPS}
          width={size}
          height={size}
          viewBox="0 0 56 56"
          className={wrapperClass}
          style={style}
        >
          {/* sword 1: NW → SE */}
          <path d="M8 8 L 36 36" />
          <path d="M36 36 l 6 2 l -2 -6 z" fill="currentColor" />
          {/* sword 1 guard + grip */}
          <path d="M6 14 L 14 6" />
          <path d="M4 16 L 12 24" />
          {/* sword 2: NE → SW */}
          <path d="M48 8 L 20 36" />
          <path d="M20 36 l -6 2 l 2 -6 z" fill="currentColor" />
          {/* sword 2 guard + grip */}
          <path d="M50 14 L 42 6" />
          <path d="M52 16 L 44 24" />
        </svg>
      );
    case 7:
      // Champion of Champions — laurel wreath with a crown above
      return (
        <div
          className={`relative inline-block ${wrapperClass ?? ""}`}
          style={style}
        >
          <LaurelWreath size={size} />
          <svg
            {...SHARED_SVG_PROPS}
            width={size * 0.55}
            height={size * 0.32}
            viewBox="0 0 32 18"
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3"
          >
            {/* crown band */}
            <path d="M2 14 h 28" />
            {/* three points with jewels */}
            <path d="M2 14 L 6 4 L 10 12 L 16 2 L 22 12 L 26 4 L 30 14" />
            <circle cx="6" cy="4" r="1.5" fill="currentColor" />
            <circle cx="16" cy="2" r="1.5" fill="currentColor" />
            <circle cx="26" cy="4" r="1.5" fill="currentColor" />
          </svg>
        </div>
      );
    default:
      // generic medallion — circle with a star
      return (
        <svg
          {...SHARED_SVG_PROPS}
          width={size}
          height={size}
          viewBox="0 0 56 56"
          className={wrapperClass}
          style={style}
        >
          <circle cx="28" cy="28" r="20" />
          <path d="M28 14 l 4 9 l 10 1 l -7.5 6.5 l 2.5 9.5 l -9 -5 l -9 5 l 2.5 -9.5 l -7.5 -6.5 l 10 -1 z" />
        </svg>
      );
  }
}
