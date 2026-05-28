/**
 * ColumnOrnament — Doric-column corner ornament.
 *
 * A small SVG with a capital (abacus + echinus) atop a fluted shaft section.
 * Strokes inherit `currentColor` — set the parent to `text-marble/30` or
 * `text-honor/40` for the page-corner detailing on /league and /trophies.
 */
type ColumnOrnamentProps = {
  size?: number;
  className?: string;
  flipped?: boolean;
};

export function ColumnOrnament({
  size = 48,
  className,
  flipped = false,
}: ColumnOrnamentProps): JSX.Element {
  const height = size;
  const width = size / 2;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={flipped ? { transform: "scaleX(-1)" } : undefined}
    >
      {/* abacus (top slab) */}
      <rect x="2" y="4" width="20" height="3" />
      {/* echinus (curve under abacus) */}
      <path d="M4 7 c 2 2 14 2 16 0" />
      {/* necking ring */}
      <path d="M6 11 h 12" />
      {/* shaft outline */}
      <path d="M7 11 v 32" />
      <path d="M17 11 v 32" />
      {/* fluting — three vertical channels inside the shaft */}
      <path d="M10 13 v 28" />
      <path d="M12 13 v 28" />
      <path d="M14 13 v 28" />
      {/* base hint at bottom */}
      <path d="M5 44 h 14" />
    </svg>
  );
}
