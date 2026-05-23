import { defineChain, type Chain } from "viem";
import { xLayer } from "viem/chains";

/**
 * All chain + contract configuration is driven by NEXT_PUBLIC_* env vars so the
 * app can target X Layer mainnet (196) or testnet (195/1952) without code edits.
 * Defaults to testnet for development.
 */

const ZERO = "0x0000000000000000000000000000000000000000" as const;

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const CHAIN_ID = Number(env("NEXT_PUBLIC_CHAIN_ID") ?? "195");

export const RPC_URL =
  env("NEXT_PUBLIC_RPC_URL") ??
  (CHAIN_ID === 196
    ? "https://rpc.xlayer.tech"
    : "https://testrpc.xlayer.tech");

export const EXPLORER_URL = (
  env("NEXT_PUBLIC_EXPLORER_URL") ??
  (CHAIN_ID === 196
    ? "https://www.oklink.com/xlayer"
    : "https://www.oklink.com/xlayer-test")
).replace(/\/$/, "");

export const CHAIN_NAME =
  env("NEXT_PUBLIC_CHAIN_NAME") ??
  (CHAIN_ID === 196 ? "X Layer" : "X Layer Testnet");

/** Returns true when an address env var is set to a real (non-zero) address. */
export function isConfigured(addr: string): addr is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(addr) && addr.toLowerCase() !== ZERO;
}

export const ADDRESSES = {
  usdc: (env("NEXT_PUBLIC_USDC_ADDRESS") ?? ZERO) as `0x${string}`,
  conditionalTokens: (env("NEXT_PUBLIC_CONDITIONAL_TOKENS") ??
    ZERO) as `0x${string}`,
  factory: (env("NEXT_PUBLIC_FACTORY") ?? ZERO) as `0x${string}`,
  oracle: (env("NEXT_PUBLIC_OPTIMISTIC_ORACLE") ?? ZERO) as `0x${string}`,
  parlayBook: (env("NEXT_PUBLIC_PARLAY_BOOK") ?? ZERO) as `0x${string}`,
} as const;

/** True when the on-chain market factory is deployed and we can read real data. */
export const FACTORY_CONFIGURED = isConfigured(ADDRESSES.factory);

/** True when the optimistic oracle is configured (resolution-state surface). */
export const ORACLE_CONFIGURED = isConfigured(ADDRESSES.oracle);

/** True when the ParlayBook is deployed; gates the parlay feature + nav link. */
export const PARLAY_CONFIGURED = isConfigured(ADDRESSES.parlayBook);

/** OKX Web3 fiat on-ramp — external link out for new users buying crypto. */
export const OKX_ONRAMP_URL = "https://web3.okx.com/";

/**
 * The viem Chain object for the configured network. Uses viem's built-in
 * `xLayer` (chainId 196) when on mainnet, otherwise builds one with defineChain.
 */
export const activeChain: Chain =
  CHAIN_ID === 196
    ? xLayer
    : defineChain({
        id: CHAIN_ID,
        name: CHAIN_NAME,
        nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
        rpcUrls: {
          default: { http: [RPC_URL] },
          public: { http: [RPC_URL] },
        },
        blockExplorers: {
          default: { name: "OKLink", url: EXPLORER_URL },
        },
        testnet: CHAIN_ID !== 196,
      });

/** USDC / collateral decimals (MockUSDC is 6-decimal). */
export const USDC_DECIMALS = 6;

/** Builds an OKLink explorer URL for a tx hash. */
export function txUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

/** Builds an OKLink explorer URL for an address. */
export function addressUrl(addr: string): string {
  return `${EXPLORER_URL}/address/${addr}`;
}
