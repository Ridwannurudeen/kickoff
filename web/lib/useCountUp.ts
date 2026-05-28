"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated number counter — ticks from 0 (or `from`) up to `to` over `durationMs`.
 *
 * Pure CSS would be cheaper but doesn't give us a settled numeric value the
 * UI can format with thousands separators / decimals. This implementation
 * uses `requestAnimationFrame` with an `easeOutCubic` curve so the count
 * decelerates as it lands — feels punchier than linear.
 *
 * Pass a stable `to` (don't recompute it inline). When `to` changes the hook
 * re-runs the animation from the current displayed value.
 *
 * No external dependency; safe inside any client component.
 */
export function useCountUp(
  to: number,
  { durationMs = 1100, from = 0 }: { durationMs?: number; from?: number } = {},
): number {
  const [value, setValue] = useState<number>(from);
  const startedAt = useRef<number | null>(null);
  const start = useRef<number>(from);
  const target = useRef<number>(to);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Resume from the currently displayed value when target moves while
    // animating, so the count never jumps backward.
    start.current = value;
    target.current = to;
    startedAt.current = null;

    function tick(now: number): void {
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = now - startedAt.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = start.current + (target.current - start.current) * eased;
      setValue(next);
      if (t < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        setValue(target.current);
        rafId.current = null;
      }
    }

    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
    // We intentionally only re-run on `to` / `durationMs` change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, durationMs]);

  return value;
}
