// Laurel — a small classical wreath/branch SVG used as a restrained ornament.
//
// Renders as inline SVG so colour can be driven by the parent's `text-*`
// utility (the strokes/fills inherit `currentColor`). No external asset, no
// network fetch. Kept deliberately simple — three pairs of leaves stacked on
// a thin spine. Use at small sizes (12–24 px) for in-line decoration, or
// `size={48}` and up for the home-hero watermark.
//
// Use sparingly: at most three instances per page. Pair with a brand
// wordmark, an honor moment (top-3 rank, champion trophy), or a hero
// headline — never as a generic divider.

type LaurelProps = {
  size?: number;
  className?: string;
  /** Flip horizontally to use as the right-hand pair of a wreath. */
  flipped?: boolean;
  /** Optional aria-label; defaults to decorative (aria-hidden). */
  label?: string;
};

export function Laurel({
  size = 16,
  className,
  flipped = false,
  label,
}: LaurelProps): JSX.Element {
  const decorative = !label;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative}
      role={decorative ? "presentation" : "img"}
      aria-label={label}
      className={className}
      style={flipped ? { transform: "scaleX(-1)" } : undefined}
    >
      {/* central stem */}
      <path d="M12 3v18" />
      {/* upper pair */}
      <path d="M12 6c-3-.2-5 1.4-6 4" />
      <path d="M12 6c3-.2 5 1.4 6 4" />
      {/* middle pair */}
      <path d="M12 12c-3.2 0-5.4 1.6-6.5 4" />
      <path d="M12 12c3.2 0 5.4 1.6 6.5 4" />
      {/* lower pair, slightly tucked */}
      <path d="M12 17.5c-2.8.2-4.8 1.4-6 3" />
      <path d="M12 17.5c2.8.2 4.8 1.4 6 3" />
    </svg>
  );
}
