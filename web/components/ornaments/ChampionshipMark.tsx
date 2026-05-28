// ChampionshipMark — a stylized championship-cup SVG used as a heritage motif
// throughout the site (hero corner, footer column, /trophies header, etc.).
//
// IMPORTANT: this is our own art, NOT the FIFA World Cup 2026 logo (which is
// trademarked). The shape evokes the universal "trophy" silhouette (bowl,
// handles, stem, base) flanked by laurel leaves — recognisable as the kind
// of trophy a champion wins, without copying any licensed mark.
//
// Strokes/fills inherit `currentColor` so parent classes drive colour:
//   <ChampionshipMark size={48} className="text-honor" />     // gold
//   <ChampionshipMark size={32} className="text-marble/40" /> // muted
//
// Use sparingly as a brand-anchor — once in the hero corner, once in the
// footer. Not a decoration; it's the heritage mark.

type ChampionshipMarkProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
  label?: string;
};

export function ChampionshipMark({
  size = 48,
  className,
  decorative = true,
  label,
}: ChampionshipMarkProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative && !label}
      role={decorative && !label ? "presentation" : "img"}
      aria-label={label}
      className={className}
    >
      {/* Left laurel branch */}
      <path d="M10 38c-2 3-3 7-2 11" opacity="0.55" />
      <path d="M14 38c-2 1-3 2-3.5 4" opacity="0.55" />
      <path d="M18 39c-2 1-3 2-3 4" opacity="0.55" />
      {/* Right laurel branch */}
      <path d="M54 38c2 3 3 7 2 11" opacity="0.55" />
      <path d="M50 38c2 1 3 2 3.5 4" opacity="0.55" />
      <path d="M46 39c2 1 3 2 3 4" opacity="0.55" />

      {/* Trophy bowl — wider at top, tapered toward stem */}
      <path d="M20 14h24c0 10-4 18-12 19-8-1-12-9-12-19z" />
      {/* Left handle */}
      <path d="M20 18c-4 0-7 2-7 6s3 6 7 6" />
      {/* Right handle */}
      <path d="M44 18c4 0 7 2 7 6s-3 6-7 6" />
      {/* Stem under the bowl */}
      <path d="M28 33v6" />
      <path d="M36 33v6" />
      <path d="M26 39h12" />
      {/* Pedestal */}
      <path d="M22 47h20" />
      <path d="M20 51h24" />
      {/* Inner inscribed accent — a small star where the inscription would go */}
      <circle cx="32" cy="22" r="2.5" opacity="0.6" />
    </svg>
  );
}
