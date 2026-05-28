/**
 * LaurelWreath — circular laurel wreath behind champion-tier elements.
 *
 * Two mirrored arcs of stylized laurel leaves meet at the top and bind at a
 * single ribbon node at the bottom. Strokes inherit `currentColor`: set the
 * parent to `text-honor` for strong gold, `text-honor/30` for a watermark.
 */
type LaurelWreathProps = {
  size?: number;
  className?: string;
  decorative?: boolean;
  label?: string;
};

export function LaurelWreath({
  size = 64,
  className,
  decorative = true,
  label,
}: LaurelWreathProps): JSX.Element {
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
      aria-hidden={decorative}
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : label}
      className={className}
    >
      {/* left arc spine, sweeping from the top meet-point down to the ribbon */}
      <path d="M32 8 C 18 12, 10 24, 10 36 C 10 46, 18 54, 30 56" />
      {/* right arc spine, mirrored */}
      <path d="M32 8 C 46 12, 54 24, 54 36 C 54 46, 46 54, 34 56" />
      {/* left leaves — outer five */}
      <path d="M20 14 c -3 -1 -5 1 -5 4" />
      <path d="M14 22 c -3 0 -4 2 -4 5" />
      <path d="M10 32 c -3 1 -3 4 -2 6" />
      <path d="M12 42 c -2 2 -1 5 1 6" />
      <path d="M18 50 c -1 2 0 4 3 5" />
      {/* right leaves — outer five, mirrored */}
      <path d="M44 14 c 3 -1 5 1 5 4" />
      <path d="M50 22 c 3 0 4 2 4 5" />
      <path d="M54 32 c 3 1 3 4 2 6" />
      <path d="M52 42 c 2 2 1 5 -1 6" />
      <path d="M46 50 c 1 2 0 4 -3 5" />
      {/* ribbon knot at the bottom centre */}
      <circle cx="32" cy="57" r="2.4" />
      <path d="M28 60 l -3 3" />
      <path d="M36 60 l 3 3" />
    </svg>
  );
}
