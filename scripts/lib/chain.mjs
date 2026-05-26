// Shared chain + client helpers for Kickoff off-chain scripts.
// Everything is env-driven so the same code runs against X Layer mainnet (196),
// X Layer testnet (env-supplied id), or a local fork — never hardcode the testnet id.
import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  getAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { xLayer } from 'viem/chains';

// X Layer mainnet defaults (verified: chainId 196, native OKB, explorer oklink).
// viem's bundled `xLayer` points at xlayerrpc.okx.com; the hackathon uses
// rpc.xlayer.tech, so we always let RPC_URL win.
const MAINNET_ID = 196;
const DEFAULT_MAINNET_RPC = 'https://rpc.xlayer.tech';
const OKLINK_BASE = 'https://www.oklink.com/xlayer';

export function getChain() {
  const chainId = Number(process.env.CHAIN_ID || MAINNET_ID);
  const rpcUrl = process.env.RPC_URL || DEFAULT_MAINNET_RPC;

  if (chainId === MAINNET_ID) {
    // Reuse viem's definition but force our RPC + explorer.
    return defineChain({
      ...xLayer,
      rpcUrls: { default: { http: [rpcUrl] } },
      blockExplorers: { default: { name: 'OKLink', url: OKLINK_BASE } },
    });
  }

  // Testnet / custom: build it entirely from env (id is intentionally NOT hardcoded).
  return defineChain({
    id: chainId,
    name: `X Layer (chain ${chainId})`,
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer-test' } },
    testnet: true,
  });
}

export function getPublicClient() {
  const chain = getChain();
  return createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) });
}

// Build a wallet client from a raw private key. Returns null if the key is missing
// so dry-run callers never crash on absent env.
export function getWalletClient(pk) {
  if (!pk) return null;
  const chain = getChain();
  const account = privateKeyToAccount(normalizePk(pk));
  return createWalletClient({ account, chain, transport: http(chain.rpcUrls.default.http[0]) });
}

export function normalizePk(pk) {
  const trimmed = pk.trim();
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
}

// Derive the account address from a PK without building a client (handy for dry-run logs).
export function addressFromPk(pk) {
  if (!pk) return null;
  return privateKeyToAccount(normalizePk(pk)).address;
}

// OKLink has separate mainnet / testnet explorers — pick by the active chain.
function explorerBase() {
  return Number(process.env.CHAIN_ID || MAINNET_ID) === MAINNET_ID
    ? OKLINK_BASE
    : 'https://www.oklink.com/xlayer-test';
}

export function txLink(hash) {
  return `${explorerBase()}/tx/${hash}`;
}

export function addressLink(addr) {
  return `${explorerBase()}/address/${addr}`;
}

// Read + checksum a required contract address from env. In dry-run we tolerate a
// placeholder so the script can still print intended calldata.
export function envAddress(name, { dryRun = false } = {}) {
  const raw = process.env[name];
  if (!raw) {
    // Dry-run: return the zero-address sentinel so address-typed ABI encoding
    // (e.g. the keccak-derived conditionId in keeper-v2) works without env.
    // Live contract calls are gated separately by the dry-run flag and don't
    // reach the chain.
    if (dryRun) return "0x0000000000000000000000000000000000000000";
    throw new Error(`Missing required env ${name} (set it in scripts/.env)`);
  }
  return getAddress(raw);
}

export function isDryRun() {
  return (
    process.env.DRY_RUN === '1' ||
    process.env.DRY_RUN === 'true' ||
    process.argv.includes('--dry-run')
  );
}
