// kickoff-indexer: builds the global fan leaderboard FanRep can't serve itself.
//
// FanRep is a soulbound ERC-721 with no enumeration, and the X Layer testnet RPC
// caps eth_getLogs at 100 blocks/call. So we enumerate holders by scanning
// `FanMinted` logs in <=100-block windows from the deploy block (resumable via a
// JSON checkpoint), then periodically read each holder's on-chain `score()` — the
// source of truth — and serve a ranked snapshot over loopback HTTP for the web app.
//
// See docs/INDEXER-SCOPE.md.
import "dotenv/config";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
  parseAbiItem,
  type Hex,
  type PublicClient,
} from "viem";

// ── env ─────────────────────────────────────────────────────────────────────
function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env ${name}`);
  }
  return v;
}
const numEnv = (name: string, fallback: number): number =>
  Number(process.env[name] ?? fallback);

const RPC_URL = env("RPC_URL", "https://testrpc.xlayer.tech/terigon");
const CHAIN_ID = numEnv("CHAIN_ID", 1952);
const FAN_REP = getAddress(env("FAN_REP"));
const DEPLOY_BLOCK = BigInt(env("DEPLOY_BLOCK", "31343831"));
const PORT = numEnv("PORT", 3066);
// Hard cap: the RPC rejects ranges > 100 blocks.
const WINDOW = BigInt(Math.min(100, numEnv("BACKFILL_WINDOW", 100)));
// The RPC tolerates parallel getLogs — concurrency turns a ~40-min sequential
// backfill into ~1 min. Tune down if the provider rate-limits.
const BACKFILL_CONCURRENCY = numEnv("BACKFILL_CONCURRENCY", 20);
const TAIL_INTERVAL_MS = numEnv("TAIL_INTERVAL_MS", 30_000);
const SNAPSHOT_INTERVAL_MS = numEnv("SNAPSHOT_INTERVAL_MS", 60_000);
const CONFIRMATIONS = BigInt(numEnv("CONFIRMATIONS", 5));
const SCORE_CONCURRENCY = numEnv("SCORE_CONCURRENCY", 10);

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(HERE, "..", env("DATA_DIR", "data"));
const HOLDERS_FILE = resolve(DATA_DIR, "holders.json");
const LEADERBOARD_FILE = resolve(DATA_DIR, "leaderboard.json");

// ── chain + abi ───────────────────────────────────────────────────────────────
const chain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 196 ? "X Layer" : `X Layer (chain ${CHAIN_ID})`,
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  testnet: CHAIN_ID !== 196,
});
const client: PublicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

const FAN_MINTED = parseAbiItem(
  "event FanMinted(address indexed user, uint256 indexed tokenId)",
);
const FANREP_ABI = [
  {
    type: "function",
    name: "score",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "total", type: "uint64" },
      { name: "predictionAccuracyBps", type: "uint64" },
      { name: "engagementBreadth", type: "uint64" },
      { name: "longevityDays", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "favoriteTeamsOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint16[]" }],
  },
] as const;

// ── state ─────────────────────────────────────────────────────────────────────
type Row = {
  address: `0x${string}`;
  total: number;
  predictionAccuracyBps: number;
  engagementBreadth: number;
  longevityDays: number;
  favoriteTeams: number[];
};
const holders = new Set<`0x${string}`>();
let lastScannedBlock = DEPLOY_BLOCK - 1n;
let snapshot: { generatedAt: number; holderCount: number; rows: Row[] } = {
  generatedAt: 0,
  holderCount: 0,
  rows: [],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log("[indexer]", ...a);

// ── persistence ────────────────────────────────────────────────────────────────
function loadCheckpoint(): void {
  if (!existsSync(HOLDERS_FILE)) return;
  try {
    const j = JSON.parse(readFileSync(HOLDERS_FILE, "utf8")) as {
      lastScannedBlock: string;
      holders: string[];
    };
    lastScannedBlock = BigInt(j.lastScannedBlock);
    for (const h of j.holders) holders.add(getAddress(h));
    log(
      `resumed: ${holders.size} holders, lastScannedBlock ${lastScannedBlock}`,
    );
  } catch (e) {
    log("checkpoint unreadable, starting fresh:", (e as Error).message);
  }
}
function saveCheckpoint(): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(
    HOLDERS_FILE,
    JSON.stringify(
      { lastScannedBlock: lastScannedBlock.toString(), holders: [...holders] },
      null,
      0,
    ),
  );
}

// ── scanning ───────────────────────────────────────────────────────────────────
async function getLogsRetry(fromBlock: bigint, toBlock: bigint, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      return await client.getLogs({
        address: FAN_REP,
        event: FAN_MINTED,
        fromBlock,
        toBlock,
      });
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(250 * (i + 1));
    }
  }
  return [];
}

/** Scan [from, to] inclusive in ≤WINDOW chunks with bounded concurrency, adding
 *  holders. Advances the checkpoint to `to` only after the whole range is done
 *  (a crash re-scans from the prior checkpoint — fine, the scan is ~1 min and
 *  holder adds are idempotent). Returns new-holder count. */
async function scanRange(from: bigint, to: bigint): Promise<number> {
  const windows: Array<[bigint, bigint]> = [];
  for (let start = from; start <= to; start += WINDOW) {
    const end = start + WINDOW - 1n < to ? start + WINDOW - 1n : to;
    windows.push([start, end]);
  }
  let added = 0;
  let next = 0;
  async function worker(): Promise<void> {
    while (next < windows.length) {
      const [f, t] = windows[next++] as [bigint, bigint];
      const logs = await getLogsRetry(f, t);
      for (const l of logs) {
        const user = (l.args as { user?: `0x${string}` }).user;
        if (user && !holders.has(getAddress(user))) {
          holders.add(getAddress(user));
          added++;
        }
      }
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(BACKFILL_CONCURRENCY, windows.length) },
      worker,
    ),
  );
  lastScannedBlock = to;
  saveCheckpoint();
  return added;
}

// ── snapshot ─────────────────────────────────────────────────────────────────
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (t: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx] as T);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return out;
}

async function readScore(address: `0x${string}`): Promise<Row | null> {
  try {
    const [s, faves] = (await Promise.all([
      client.readContract({
        address: FAN_REP,
        abi: FANREP_ABI,
        functionName: "score",
        args: [address],
      }),
      client.readContract({
        address: FAN_REP,
        abi: FANREP_ABI,
        functionName: "favoriteTeamsOf",
        args: [address],
      }),
    ])) as [readonly [bigint, bigint, bigint, bigint], readonly number[]];
    return {
      address,
      total: Number(s[0]),
      predictionAccuracyBps: Number(s[1]),
      engagementBreadth: Number(s[2]),
      longevityDays: Number(s[3]),
      favoriteTeams: faves.map(Number),
    };
  } catch {
    return null;
  }
}

async function rebuildSnapshot(): Promise<void> {
  const addrs = [...holders];
  const rows = (await mapLimit(addrs, SCORE_CONCURRENCY, readScore))
    .filter((r): r is Row => r !== null)
    .sort((a, b) => b.total - a.total);
  snapshot = { generatedAt: Date.now(), holderCount: rows.length, rows };
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(LEADERBOARD_FILE, JSON.stringify(snapshot, null, 0));
  log(`snapshot: ${rows.length} ranked holders`);
}

// ── loops + server ─────────────────────────────────────────────────────────────
async function headBlock(): Promise<bigint> {
  return (await client.getBlockNumber()) - CONFIRMATIONS;
}

async function tail(): Promise<void> {
  try {
    const head = await headBlock();
    const from = lastScannedBlock + 1n - CONFIRMATIONS; // small overlap for reorgs
    const safeFrom = from < DEPLOY_BLOCK ? DEPLOY_BLOCK : from;
    if (head < safeFrom) return;
    const added = await scanRange(safeFrom, head);
    if (added > 0) log(`tail: +${added} holders (now ${holders.size})`);
  } catch (e) {
    log("tail error:", (e as Error).message);
  }
}

function serve(): void {
  createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          holders: holders.size,
          lastScannedBlock: lastScannedBlock.toString(),
          generatedAt: snapshot.generatedAt,
        }),
      );
      return;
    }
    if (req.url === "/leaderboard") {
      res.writeHead(200, {
        "content-type": "application/json",
        "cache-control": "public, max-age=15",
      });
      res.end(JSON.stringify(snapshot));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  }).listen(PORT, "127.0.0.1", () =>
    log(`serving on http://127.0.0.1:${PORT}`),
  );
}

async function main(): Promise<void> {
  log(`FanRep ${FAN_REP} on chain ${CHAIN_ID}; deploy block ${DEPLOY_BLOCK}`);
  loadCheckpoint();
  serve();
  const head = await headBlock();
  const from =
    lastScannedBlock + 1n < DEPLOY_BLOCK ? DEPLOY_BLOCK : lastScannedBlock + 1n;
  if (head >= from) {
    log(`backfill ${from} → ${head} (${head - from + 1n} blocks)`);
    const added = await scanRange(from, head);
    log(`backfill done: +${added} holders (total ${holders.size})`);
  }
  await rebuildSnapshot();
  setInterval(() => void tail(), TAIL_INTERVAL_MS);
  setInterval(() => void rebuildSnapshot(), SNAPSHOT_INTERVAL_MS);
}

void main();
