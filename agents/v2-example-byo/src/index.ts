// Kickoff v2 — Bring-Your-Own-Agent (BYO) reference agent.
//
// ## What this does (and why)
//
// Kickoff v2 ships a free, fan-prediction tournament called `AgentLeague`
// (see docs/KICKOFF-V2-DESIGN.md §6.5). Anyone can deploy an AI agent and enter
// it into the league — agents compete on prediction accuracy across the World
// Cup 2026 PREDICTION-type quests. No money in, no money out: pure free-skill
// for reputation + a non-tradeable trophy.
//
// This file is the **reference implementation**. Fork the entire
// `agents/v2-example-byo/` directory, swap in your own pickSlot() strategy,
// and you're done. The interface is what matters; the strategy is yours.
//
// ## The commit-reveal scheme (carried over from QuestEngine + AgentLeague)
//
// To prevent agents from front-running each other on visible predictions, both
// QuestEngine and AgentLeague use the same 2-step protocol:
//
//   commit_hash = keccak256(abi.encode(uint8 predictedSlot, bytes32 salt))
//
//   step 1 (before kickoff):   submitPrediction(agentId, questId, commit_hash)
//   step 2 (after OO settles): scorePrediction(agentId, questId, predictedSlot, salt)
//
// We persist `(slot, salt)` per `questId` to a local JSON file so the agent can
// reveal across restarts. The salt is generated client-side from crypto.randomBytes
// and is never broadcast in plaintext until reveal.
//
// ## The lifecycle this agent runs
//
//   1. Watch QuestEngine.QuestRegistered events.
//   2. For each new PREDICTION-type quest (qType == 1):
//        a. read the conditionId from quest.config (ABI: bytes32)
//        b. read outcomeSlotCount from ConditionalTokens
//        c. pickSlot(questId, slots) — REPLACE THIS WITH YOUR STRATEGY
//        d. generate a 32-byte random salt
//        e. commit = keccak256(abi.encode(uint8 slot, bytes32 salt))
//        f. AgentLeague.submitPrediction(agentId, questId, commit)
//        g. persist (questId -> {slot, salt}) to COMMITS_FILE
//   3. Every REVEAL_POLL_INTERVAL_MS, for each committed-but-not-revealed quest:
//        - if ConditionalTokens.conditionStatus(conditionId) == 2 (Resolved):
//            AgentLeague.scorePrediction(agentId, questId, slot, salt)
//
// ## Design constraint
//
// No money is wagered on entry, no money is paid out on win. The prize is XP +
// the AI Champion ERC-1155 trophy (deterministic mint on closeSeason). This file
// has no token transfers, no betting logic.

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  toHex,
  type Hex,
  type Log,
} from "viem";
import {
  agentLeagueAbi,
  conditionalTokensAbi,
  questEngineAbi,
} from "./lib/v2-abis.ts";
import {
  addressFromPk,
  getPublicClient,
  getWalletClient,
  requireAddress,
  requireEnv,
} from "./lib/v2-chain.ts";

// ---------- env ----------

const QUEST_TYPE_PREDICTION = 1; // QuestEngine.QuestType.PREDICTION

const agentId = requireEnv("AGENT_ID") as Hex;
if (!/^0x[0-9a-fA-F]{64}$/.test(agentId)) {
  throw new Error("AGENT_ID must be 32-byte hex (0x + 64 hex chars)");
}

const pk = requireEnv("AGENT_PK");
const wallet = getWalletClient(pk);
if (!wallet) throw new Error("AGENT_PK is required (no offline mode here)");
const ownerAddress = addressFromPk(pk);

const league = requireAddress("AGENT_LEAGUE");
const questEngine = requireAddress("QUEST_ENGINE");
const conditionalTokens = requireAddress("CONDITIONAL_TOKENS");
const publicClient = getPublicClient();

const commitsFile = resolve(process.env.COMMITS_FILE || "./commits.json");
const pollMs = Number(process.env.REVEAL_POLL_INTERVAL_MS || "30000");

// ---------- commits store (questId -> { slot, salt, conditionId, revealed }) ----------

type CommitRecord = {
  questId: Hex;
  conditionId: Hex;
  slot: number;
  salt: Hex;
  committedTx: Hex | null;
  revealed: boolean;
  revealedTx: Hex | null;
};

type Store = { commits: CommitRecord[] };

function loadStore(): Store {
  if (!existsSync(commitsFile)) return { commits: [] };
  try {
    const parsed = JSON.parse(readFileSync(commitsFile, "utf8")) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as Store).commits)
    ) {
      return parsed as Store;
    }
  } catch (err) {
    console.warn(`[byo] could not parse ${commitsFile}, starting fresh:`, err);
  }
  return { commits: [] };
}

function saveStore(store: Store): void {
  writeFileSync(commitsFile, JSON.stringify(store, null, 2) + "\n");
}

function findCommit(store: Store, questId: Hex): CommitRecord | undefined {
  return store.commits.find(
    (c) => c.questId.toLowerCase() === questId.toLowerCase(),
  );
}

// ---------- strategy (replace this with your own) ----------

/**
 * Pick which outcome slot to predict for a given quest.
 *
 * The reference implementation is **trivially deterministic** —
 * `slot = keccak256(questId) mod slots`. This is enough to demonstrate the
 * interface end-to-end; it is NOT an attempt at being smart. Fork this file
 * and replace `pickSlot` with whatever model you want — an LLM, a stats API
 * pull, a Bayesian update, anything. The on-chain contract is agnostic.
 *
 * Constraint: must return an integer in [0, slots).
 */
function pickSlot(questId: Hex, slots: number): number {
  if (slots <= 0) throw new Error("slots must be > 0");
  // Trivial deterministic strategy. Replace me.
  const h = keccak256(questId);
  // Use the low byte of the keccak hash for diversity across questIds.
  // (We could also use bigint math; one byte is sufficient up to 256 slots.)
  const lastByte = parseInt(h.slice(-2), 16);
  return lastByte % slots;
}

// ---------- on-chain helpers ----------

function buildCommit(slot: number, salt: Hex): Hex {
  // Must EXACTLY match AgentLeague.submitPrediction / scorePrediction:
  //   commit = keccak256(abi.encode(uint8 slot, bytes32 salt))
  return keccak256(
    encodeAbiParameters([{ type: "uint8" }, { type: "bytes32" }], [slot, salt]),
  );
}

function fresh32(): Hex {
  return toHex(randomBytes(32));
}

async function readQuest(questId: Hex): Promise<{
  qType: number;
  startsAt: bigint;
  endsAt: bigint;
  xpReward: bigint;
  config: Hex;
  exists: boolean;
}> {
  const raw = (await publicClient.readContract({
    address: questEngine,
    abi: questEngineAbi,
    functionName: "getQuest",
    args: [questId],
  })) as readonly [number, bigint, bigint, bigint, Hex, Hex, boolean];
  return {
    qType: raw[0],
    startsAt: raw[1],
    endsAt: raw[2],
    xpReward: raw[3],
    config: raw[5],
    exists: raw[6],
  };
}

function decodePredictionConfig(config: Hex): Hex {
  // PREDICTION config is ABI(bytes32 conditionId) — see QuestEngine.sol §6.2 + 193-197.
  const [conditionId] = decodeAbiParameters([{ type: "bytes32" }], config) as [
    Hex,
  ];
  return conditionId;
}

async function isConditionResolved(conditionId: Hex): Promise<boolean> {
  // CT status: 0=None, 1=Open, 2=Resolved, 3=Voided (confirmed in scripts/lib/abis.mjs).
  const status = (await publicClient.readContract({
    address: conditionalTokens,
    abi: conditionalTokensAbi,
    functionName: "conditionStatus",
    args: [conditionId],
  })) as number;
  return Number(status) === 2;
}

async function getOutcomeSlotCount(conditionId: Hex): Promise<number> {
  const n = (await publicClient.readContract({
    address: conditionalTokens,
    abi: conditionalTokensAbi,
    functionName: "getOutcomeSlotCount",
    args: [conditionId],
  })) as number;
  return Number(n);
}

// ---------- actions ----------

async function commitForQuest(questId: Hex): Promise<void> {
  const store = loadStore();
  if (findCommit(store, questId)) {
    console.log(`[byo] already committed for ${questId}, skipping`);
    return;
  }

  const q = await readQuest(questId);
  if (!q.exists) {
    console.log(`[byo] quest ${questId} not found on chain, skipping`);
    return;
  }
  if (q.qType !== QUEST_TYPE_PREDICTION) {
    // not our type — silently ignore
    return;
  }
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now > q.endsAt) {
    console.log(`[byo] quest ${questId} commit window already closed`);
    return;
  }
  if (now < q.startsAt) {
    // not yet open — we could schedule, but the simplest thing is to wait for
    // the next event poll. AgentLeague will reject early commits anyway.
    console.log(`[byo] quest ${questId} not yet open, deferring`);
    return;
  }

  const conditionId = decodePredictionConfig(q.config);
  const slots = await getOutcomeSlotCount(conditionId);
  if (slots <= 0) {
    console.log(
      `[byo] condition ${conditionId} has no slots prepared yet, deferring`,
    );
    return;
  }
  const slot = pickSlot(questId, slots);
  const salt = fresh32();
  const commit = buildCommit(slot, salt);

  console.log(`[byo] committing for quest ${questId}`);
  console.log(`        conditionId: ${conditionId}`);
  console.log(`        slots:       ${slots}`);
  console.log(`        picked slot: ${slot}`);
  console.log(`        commit hash: ${commit}`);

  // Save BEFORE broadcasting — losing the salt after a successful commit means
  // we can never reveal. Conservative: persist, then send. If the tx reverts
  // we'll just have a dangling record (harmless; reveal will be a no-op).
  store.commits.push({
    questId,
    conditionId,
    slot,
    salt,
    committedTx: null,
    revealed: false,
    revealedTx: null,
  });
  saveStore(store);

  try {
    const hash = await wallet!.writeContract({
      account: wallet!.account!,
      chain: wallet!.chain!,
      address: league,
      abi: agentLeagueAbi,
      functionName: "submitPrediction",
      args: [agentId, questId, commit],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const after = loadStore();
    const rec = findCommit(after, questId);
    if (rec) {
      rec.committedTx = hash;
      saveStore(after);
    }
    console.log(`[byo] committed: tx ${hash}`);
  } catch (err) {
    console.error(
      `[byo] submitPrediction failed for ${questId}:`,
      (err as { shortMessage?: string })?.shortMessage ?? err,
    );
  }
}

async function tryReveal(rec: CommitRecord): Promise<void> {
  if (rec.revealed) return;
  const resolved = await isConditionResolved(rec.conditionId);
  if (!resolved) return;

  console.log(
    `[byo] condition resolved for quest ${rec.questId} — revealing slot=${rec.slot}`,
  );
  try {
    const hash = await wallet!.writeContract({
      account: wallet!.account!,
      chain: wallet!.chain!,
      address: league,
      abi: agentLeagueAbi,
      functionName: "scorePrediction",
      args: [agentId, rec.questId, rec.slot, rec.salt],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const store = loadStore();
    const found = findCommit(store, rec.questId);
    if (found) {
      found.revealed = true;
      found.revealedTx = hash;
      saveStore(store);
    }
    console.log(`[byo] revealed + scored: tx ${hash}`);
  } catch (err) {
    console.error(
      `[byo] scorePrediction failed for ${rec.questId}:`,
      (err as { shortMessage?: string })?.shortMessage ?? err,
    );
  }
}

async function revealPass(): Promise<void> {
  const store = loadStore();
  for (const rec of store.commits) {
    if (rec.revealed) continue;
    await tryReveal(rec);
  }
}

// ---------- main loop ----------

async function main(): Promise<void> {
  console.log(`[byo] starting`);
  console.log(`        chainId       : ${publicClient.chain?.id}`);
  console.log(`        agentId       : ${agentId}`);
  console.log(`        owner+wallet  : ${ownerAddress}`);
  console.log(`        league        : ${league}`);
  console.log(`        questEngine   : ${questEngine}`);
  console.log(`        commitsFile   : ${commitsFile}`);
  console.log(`        revealEvery   : ${pollMs}ms`);

  // 1) Watch QuestRegistered. The event has questId indexed; viem decodes args
  //    against the ABI. We dispatch every new quest into commitForQuest, which
  //    no-ops on non-PREDICTION types.
  const unwatch = publicClient.watchContractEvent({
    address: questEngine,
    abi: questEngineAbi,
    eventName: "QuestRegistered",
    onLogs: (logs: Log[]) => {
      for (const log of logs) {
        const args = (
          log as unknown as { args: { questId: Hex; qType: number } }
        ).args;
        if (!args?.questId) continue;
        if (Number(args.qType) !== QUEST_TYPE_PREDICTION) continue;
        void commitForQuest(args.questId).catch((err) => {
          console.error(`[byo] commitForQuest threw:`, err);
        });
      }
    },
    onError: (err) => {
      console.error(`[byo] QuestRegistered watcher error:`, err);
    },
  });

  // 2) Periodically try to reveal any committed-but-not-revealed quests.
  const interval = setInterval(() => {
    void revealPass().catch((err) => {
      console.error(`[byo] revealPass threw:`, err);
    });
  }, pollMs);

  // 3) Cold-start: run one reveal pass immediately so a restarted agent picks
  //    up any conditions resolved during downtime.
  void revealPass();

  // Graceful shutdown.
  const stop = (): void => {
    console.log(`[byo] stopping`);
    clearInterval(interval);
    unwatch();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error("[byo] fatal:", err?.shortMessage || err);
  process.exitCode = 1;
});
