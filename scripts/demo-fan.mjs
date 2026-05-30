// demo-fan.mjs — the fan side of a PREDICTION quest, for the --simulate demo
// cycle (the keeper does register/propose/settle; this does commit + reveal).
//
// Acts as a demo "fan" using ORACLE_PK as the wallet. Produces the on-chain
// PREDICTION commit + reveal artefact the submission wants, end to end and
// scriptable (the web UI only renders quests for the real bundled fixtures, so
// a clearly-simulated demo match is committed/revealed here instead).
//
// Usage (env: ORACLE_PK, RPC_URL, CHAIN_ID, QUEST_ENGINE, FAN_REP):
//   node demo-fan.mjs commit <questId> <slot>   # slot 0=Home 1=Draw 2=Away
//   node demo-fan.mjs reveal <questId>
//   node demo-fan.mjs status                    # print this wallet's FanRep score
// The salt is written to ./data/demo-salt-<questId>.json next to the schedule.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeAbiParameters, keccak256, toHex } from "viem";
import {
  getPublicClient,
  getWalletClient,
  envAddress,
  txLink,
} from "./lib/chain.mjs";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "data");
const saltPath = (q) => resolve(dataDir, `demo-salt-${q}.json`);

const FAN_REP = envAddress("FAN_REP");
const QUEST_ENGINE = envAddress("QUEST_ENGINE");

const fanRepAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "hasFanId", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "score", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ name: "total", type: "uint64" }, { name: "predictionAccuracyBps", type: "uint64" }, { name: "engagementBreadth", type: "uint64" }, { name: "longevityDays", type: "uint64" }] },
];
const questEngineAbi = [
  { type: "function", name: "commitPrediction", stateMutability: "nonpayable", inputs: [{ name: "questId", type: "bytes32" }, { name: "commit_", type: "bytes32" }], outputs: [] },
  { type: "function", name: "settlePrediction", stateMutability: "nonpayable", inputs: [{ name: "questId", type: "bytes32" }, { name: "user", type: "address" }, { name: "predictedSlot", type: "uint8" }, { name: "salt", type: "bytes32" }], outputs: [] },
];

const pc = getPublicClient();
const wc = getWalletClient(process.env.ORACLE_PK);
if (!wc) throw new Error("ORACLE_PK not set");
const me = wc.account.address;

async function send(label, req) {
  const hash = await wc.writeContract(req);
  await pc.waitForTransactionReceipt({ hash });
  console.log(`  ${label}: ${txLink(hash)}`);
  return hash;
}

async function ensureFanId() {
  const has = await pc.readContract({ address: FAN_REP, abi: fanRepAbi, functionName: "hasFanId", args: [me] });
  if (!has) {
    console.log("  no Fan ID — minting…");
    await send("mint Fan ID", { address: FAN_REP, abi: fanRepAbi, functionName: "mint", args: [] });
  }
}

async function commit(questId, slotStr) {
  const slot = Number(slotStr);
  if (![0, 1, 2].includes(slot)) throw new Error("slot must be 0|1|2");
  await ensureFanId();
  const salt = toHex(randomBytes(32));
  const commitHash = keccak256(encodeAbiParameters([{ type: "uint8" }, { type: "bytes32" }], [slot, salt]));
  writeFileSync(saltPath(questId), JSON.stringify({ slot, salt }));
  console.log(`  saved salt → ${saltPath(questId)}`);
  await send(`commit slot ${slot}`, { address: QUEST_ENGINE, abi: questEngineAbi, functionName: "commitPrediction", args: [questId, commitHash] });
  console.log("  committed.");
}

async function reveal(questId) {
  if (!existsSync(saltPath(questId))) throw new Error(`no saved salt at ${saltPath(questId)} — commit first`);
  const { slot, salt } = JSON.parse(readFileSync(saltPath(questId), "utf8"));
  await send(`reveal slot ${slot}`, { address: QUEST_ENGINE, abi: questEngineAbi, functionName: "settlePrediction", args: [questId, me, slot, salt] });
  await status();
}

async function status() {
  const s = await pc.readContract({ address: FAN_REP, abi: fanRepAbi, functionName: "score", args: [me] });
  console.log(`  score(${me}): total=${s[0]} predAccBps=${s[1]} breadth=${s[2]} longevityDays=${s[3]}`);
}

const [cmd, a, b] = process.argv.slice(2);
const run = cmd === "commit" ? commit(a, b) : cmd === "reveal" ? reveal(a) : cmd === "status" ? status() : Promise.reject(new Error("usage: commit <questId> <slot> | reveal <questId> | status"));
run.catch((e) => { console.error("ERROR:", e.shortMessage || e.message); process.exit(1); });
