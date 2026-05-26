import { defineChain, type Chain } from "viem";
import { xLayer } from "viem/chains";

/**
 * Chain configuration for Kickoff v2. The v2 product runs on X Layer with
 * native OKB gas; defaults to testnet (chainId 1952) and reads NEXT_PUBLIC_*
 * env vars to target mainnet (196).
 *
 * Note on the default: the pre-OP-Stack testnet was chainId 195, but after
 * X Layer's migration in Dec 2025 the live testnet endpoint
 * https://testrpc.xlayer.tech serves chainId 1952. Hardcoding 195 here would
 * cause wallet_addEthereumChain to fail with a chainId/RPC mismatch (Rabby
 * and MetaMask both probe the RPC and reject the add).
 *
 * IMPORTANT: env vars below MUST be referenced with literal dot-notation
 * (process.env.NEXT_PUBLIC_X) — Next.js's webpack plugin only inlines
 * NEXT_PUBLIC_* values into the client bundle when accessed that way. A
 * dynamic helper like `process.env[name]` looks the same at the TS level
 * but compiles to a runtime lookup against an empty object in the browser,
 * silently dropping every override.
 *
 * Contract addresses live in `v2-addresses.ts`. The v1 trading addresses
 * (factory, conditionalTokens, parlayBook, USDC) were intentionally removed
 * — v2 has no betting surface.
 */

function nonEmpty(v: string | undefined): string | undefined {
  return v && v.length > 0 ? v : undefined;
}

export const CHAIN_ID = Number(
  nonEmpty(process.env.NEXT_PUBLIC_CHAIN_ID) ?? "1952",
);

export const RPC_URL =
  nonEmpty(process.env.NEXT_PUBLIC_RPC_URL) ??
  (CHAIN_ID === 196
    ? "https://rpc.xlayer.tech"
    : "https://testrpc.xlayer.tech");

export const EXPLORER_URL = (
  nonEmpty(process.env.NEXT_PUBLIC_EXPLORER_URL) ??
  (CHAIN_ID === 196
    ? "https://www.oklink.com/xlayer"
    : "https://www.oklink.com/xlayer-test")
).replace(/\/$/, "");

export const CHAIN_NAME =
  nonEmpty(process.env.NEXT_PUBLIC_CHAIN_NAME) ??
  (CHAIN_ID === 196 ? "X Layer" : "X Layer Testnet");

/** The viem Chain object for the configured network. Native OKB gas. */
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

/** Builds an OKLink explorer URL for a tx hash. */
export function txUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

/** Builds an OKLink explorer URL for an address. */
export function addressUrl(addr: string): string {
  return `${EXPLORER_URL}/address/${addr}`;
}
