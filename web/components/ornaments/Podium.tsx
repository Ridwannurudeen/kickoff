import { LaurelWreath } from "./LaurelWreath";

/**
 * Podium — 3-step ranking podium with cascading entrance animation.
 *
 * Renders top three in podium order (rank 2 left, rank 1 centre/tallest, rank 3
 * right). Each step cascades in via `animate-podium-rise` (rank 3 first, then
 * rank 2, then rank 1). Strokes/fills inherit `currentColor`; per-step accents
 * use Tailwind tokens directly (honor / honor-glow / honor-dark).
 */
type Rank = 1 | 2 | 3;

type PodiumProps = {
  topThree: Array<{ rank: Rank; label: string; sublabel?: string }>;
  className?: string;
  size?: { width?: number; height?: number };
};

const STEP_FILL: Record<Rank, string> = {
  1: "fill-honor",
  2: "fill-honor-glow",
  3: "fill-honor-dark",
};

const STEP_DELAY_MS: Record<Rank, number> = {
  1: 260,
  2: 120,
  3: 0,
};

// Step geometry inside the 240×180 viewBox: x, y (top), width, height.
const STEP_BOX: Record<Rank, { x: number; y: number; w: number; h: number }> = {
  2: { x: 30, y: 70, w: 60, h: 100 },
  1: { x: 90, y: 40, w: 60, h: 130 },
  3: { x: 150, y: 90, w: 60, h: 80 },
};

export function Podium({
  topThree,
  className,
  size,
}: PodiumProps): JSX.Element {
  const width = size?.width ?? 240;
  const height = size?.height ?? 220;
  const byRank = new Map<Rank, { label: string; sublabel?: string }>();
  for (const entry of topThree) {
    byRank.set(entry.rank, { label: entry.label, sublabel: entry.sublabel });
  }
  const order: Rank[] = [2, 1, 3];
  return (
    <div className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 240 200"
        role="img"
        aria-label="Top three podium"
      >
        {order.map((rank) => {
          const box = STEP_BOX[rank];
          const fillClass = STEP_FILL[rank];
          const delay = STEP_DELAY_MS[rank];
          return (
            <g
              key={rank}
              className="animate-podium-rise"
              style={{ animationDelay: `${delay}ms` }}
            >
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                className={fillClass}
                rx={2}
              />
              {/* top edge highlight */}
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={3}
                className="fill-marble"
                opacity={0.45}
              />
              {/* rank numeral */}
              <text
                x={box.x + box.w / 2}
                y={box.y + box.h / 2 + 6}
                textAnchor="middle"
                className="fill-pitch-bg font-display"
                fontSize="20"
                fontWeight="700"
              >
                {rank}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {order.map((rank) => {
          const entry = byRank.get(rank);
          const delay = STEP_DELAY_MS[rank];
          return (
            <div
              key={rank}
              className="animate-fade-up"
              style={{ animationDelay: `${delay + 200}ms` }}
            >
              {rank === 1 && (
                <div className="mb-1 flex justify-center text-honor">
                  <LaurelWreath size={28} />
                </div>
              )}
              {rank !== 1 && (
                <div
                  className={`mb-1 flex justify-center ${
                    rank === 2 ? "text-honor-glow" : "text-honor-dark"
                  }`}
                  aria-hidden
                >
                  <svg width={10} height={10} viewBox="0 0 10 10">
                    <circle cx="5" cy="5" r="3" fill="currentColor" />
                  </svg>
                </div>
              )}
              <div className="text-sm font-bold text-white">
                {entry?.label ?? ""}
              </div>
              {entry?.sublabel && (
                <div className="text-xs text-muted">{entry.sublabel}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
