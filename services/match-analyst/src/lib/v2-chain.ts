// Shared viem helpers for the v2 agent services.
//
// Everything is env-driven; nothing about the chain is hardcoded. Defaults target
// X Layer testnet (chainId 1952, RPC https://testrpc.xlayer.tech/terigon) per the
// service brief.
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const DEFAULT_CHAIN_ID = 1952;
const DEFAULT_RPC = "https://testrpc.xlayer.tech/terigon";

export function getChain() {
  const chainId = Number(process.env.CHAIN_ID || DEFAULT_CHAIN_ID);
  const rpcUrl = process.env.RPC_URL || DEFAULT_RPC;
  const isMainnet = chainId === 196;
  return defineChain({
    id: chainId,
    name: isMainnet ? "X Layer" : `X Layer (chain ${chainId})`,
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: {
      default: {
        name: "OKLink",
        url: isMainnet
          ? "https://www.oklink.com/xlayer"
          : "https://www.oklink.com/xlayer-test",
      },
    },
    testnet: !isMainnet,
  });
}

export function getPublicClient(): PublicClient {
  const chain = getChain();
  return createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  });
}

function normalizePk(pk: string): Hex {
  const trimmed = pk.trim();
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
}

export function getWalletClient(pk: string | undefined): WalletClient | null {
  if (!pk) return null;
  const chain = getChain();
  const account = privateKeyToAccount(normalizePk(pk));
  return createWalletClient({
    account,
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  });
}

export function addressFromPk(pk: string | undefined): `0x${string}` | null {
  if (!pk) return null;
  return privateKeyToAccount(normalizePk(pk)).address;
}

export function requireAddress(name: string): `0x${string}` {
  const raw = process.env[name];
  if (!raw) throw new Error(`Missing required env ${name}`);
  return getAddress(raw);
}

export function requireEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) throw new Error(`Missing required env ${name}`);
  return raw;
}

export function isOffline(): boolean {
  return (
    process.env.OFFLINE_MODE === "1" || process.env.OFFLINE_MODE === "true"
  );
}
