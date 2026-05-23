import { formatUnits, parseUnits } from "viem";
import { USDC_DECIMALS } from "./config";

/** Parse a human USDC string (e.g. "12.5") into 6-decimal base units. */
export function parseUsdc(value: string): bigint {
  if (!value || Number.isNaN(Number(value))) return 0n;
  return parseUnits(value as `${number}`, USDC_DECIMALS);
}

/** Format 6-decimal USDC base units into a human number. */
export function formatUsdc(value: bigint): number {
  return Number(formatUnits(value, USDC_DECIMALS));
}

/** Outcome shares are minted 1:1 from collateral, so they carry USDC's 6 decimals. */
export function formatShares(value: bigint): number {
  return Number(formatUnits(value, USDC_DECIMALS));
}

export function parseShares(value: string): bigint {
  if (!value || Number.isNaN(Number(value))) return 0n;
  return parseUnits(value as `${number}`, USDC_DECIMALS);
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function fmtUsd(n: number): string {
  return usd.format(n);
}

export function fmtUsdCompact(n: number): string {
  return usdCompact.format(n);
}

export function fmtPct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}

export function fmtShares(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
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
