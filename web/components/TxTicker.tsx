/**
 * TxTicker — horizontally-scrolling ticker of recent on-chain transactions.
 *
 * Uses the Tailwind `animate-ticker` keyframe (translateX 0 → -50%). The
 * caller passes already-abbreviated tx hashes (e.g. `0xa9b6…61c1a`) — this
 * component never receives or renders a full 64-hex hash. Defaults to
 * `text-muted`; parents may override with `text-honor` for highlight rows.
 */
type TickerItem = {
  label: string;
  abbreviated: string;
  href: string;
};

type TxTickerProps = {
  items: TickerItem[];
  className?: string;
  pauseOnHover?: boolean;
};

export function TxTicker({
  items,
  className,
  pauseOnHover = true,
}: TxTickerProps): JSX.Element {
  // Render items twice so the -50% translate loop seams cleanly.
  const looped = [...items, ...items];
  const pauseClass = pauseOnHover ? "hover:[animation-play-state:paused]" : "";
  return (
    <div
      className={`overflow-hidden text-muted ${className ?? ""}`}
      role="marquee"
      aria-label="Recent transactions"
    >
      <div
        className={`flex w-max gap-8 whitespace-nowrap animate-ticker ${pauseClass}`}
      >
        {looped.map((item, idx) => (
          <a
            key={`${item.href}-${idx}`}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs hover:text-honor"
          >
            <span className="opacity-70">{item.label}</span>
            <span className="font-mono">{item.abbreviated}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
