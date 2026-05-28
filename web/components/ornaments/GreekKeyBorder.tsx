import type { ReactNode } from "react";

/**
 * GreekKeyBorder — thin classical meander border drawn around children.
 *
 * Four absolutely-positioned SVG edges tile a 16px meander unit. Stroke
 * inherits `currentColor` — set the parent to `text-honor/30` for a restrained
 * gold border, `text-marble/40` for an off-white classical edge.
 */
type GreekKeyBorderProps = {
  children: ReactNode;
  className?: string;
  strokeWidth?: number;
};

// One unit of the meander (16 wide × 8 tall): a stepped square spiral that
// tiles cleanly. Drawn from left to right.
const MEANDER_PATH = "M0 7 L0 1 L14 1 L14 5 L4 5 L4 3 L12 3 L12 7 L16 7";

export function GreekKeyBorder({
  children,
  className,
  strokeWidth = 1.5,
}: GreekKeyBorderProps): JSX.Element {
  const patternId = "greek-key-h";
  const patternIdV = "greek-key-v";
  return (
    <div className={`relative ${className ?? ""}`}>
      {/* top edge */}
      <svg
        className="pointer-events-none absolute left-0 top-0 h-2 w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width="16"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <path
              d={MEANDER_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
            />
          </pattern>
        </defs>
        <rect width="100%" height="8" fill={`url(#${patternId})`} />
      </svg>
      {/* bottom edge — flipped vertically so the spiral faces inward */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 h-2 w-full"
        preserveAspectRatio="none"
        aria-hidden
        style={{ transform: "scaleY(-1)" }}
      >
        <rect width="100%" height="8" fill={`url(#${patternId})`} />
      </svg>
      {/* left edge — rotated meander */}
      <svg
        className="pointer-events-none absolute left-0 top-0 h-full w-2"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <pattern
            id={patternIdV}
            x="0"
            y="0"
            width="8"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d={MEANDER_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              transform="rotate(90 4 4) translate(0 -8)"
            />
          </pattern>
        </defs>
        <rect width="8" height="100%" fill={`url(#${patternIdV})`} />
      </svg>
      {/* right edge — same pattern, mirrored on X */}
      <svg
        className="pointer-events-none absolute right-0 top-0 h-full w-2"
        preserveAspectRatio="none"
        aria-hidden
        style={{ transform: "scaleX(-1)" }}
      >
        <rect width="8" height="100%" fill={`url(#${patternIdV})`} />
      </svg>
      {children}
    </div>
  );
}
