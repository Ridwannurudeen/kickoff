import { formatUnits, parseUnits } from "viem";

/** Format wei (18-dec OKB or similar) into a short human number. */
export function formatOkb(value: bigint, digits = 4): string {
  return Number(formatUnits(value, 18)).toFixed(digits);
}

/** Parse a human OKB string (e.g. "0.0001") into 18-decimal wei. */
export function parseOkb(value: string): bigint {
  if (!value || Number.isNaN(Number(value))) return 0n;
  return parseUnits(value as `${number}`, 18);
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function timeAgo(ts?: number): string {
  if (!ts) return "";
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Compact integer formatter — "12,345" style. */
export function fmtInt(n: number | bigint): string {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
