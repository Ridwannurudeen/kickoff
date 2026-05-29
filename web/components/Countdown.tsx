"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to a UTC unix target (seconds). Ticks once a second.
 *
 * Hydration-safe: the first client render must match the server, so we render
 * a stable dash placeholder until `mounted` flips in an effect — only then do
 * we read the wall clock. Once the target passes, shows the `passedLabel`.
 */
const UNITS = [
  { key: "d", label: "Days", secs: 86_400, wrap: Infinity },
  { key: "h", label: "Hrs", secs: 3_600, wrap: 24 },
  { key: "m", label: "Min", secs: 60, wrap: 60 },
  { key: "s", label: "Sec", secs: 1, wrap: 60 },
] as const;

export function Countdown({
  targetUnix,
  passedLabel = "Live now",
}: {
  targetUnix: number;
  passedLabel?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = now === null ? null : Math.max(0, targetUnix - now);

  if (remaining === 0) {
    return (
      <span className="pill text-grass">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-grass-glow" />
        {passedLabel}
      </span>
    );
  }

  const cells = UNITS.map((u) => ({
    ...u,
    value: remaining === null ? null : Math.floor(remaining / u.secs) % u.wrap,
  }));

  return (
    <div className="flex items-stretch gap-2">
      {cells.map((c) => (
        <div
          key={c.key}
          className="flex min-w-[3.25rem] flex-col items-center rounded-lg border border-pitch-border bg-pitch-panel px-3 py-2"
        >
          <span className="font-display text-2xl leading-none tabular-nums text-white">
            {c.value === null ? "--" : String(c.value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wide text-muted">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
