// scripts/seed-v2.mjs
//
// One-off Kickoff v2 platform seeding:
//   1. evergreen quests (the catalogue that doesn't depend on a specific match)
//   2. first-party agents in AgentRegistry (match-analyst, personal-stats, highlights)
//   3. user-claimable trophies in Trophy (First Whistle, Pollster)
//
// What this script DOES NOT touch:
//   - Match-day attend + predict-score quests — those are per-match and owned by
//     scripts/keeper-v2.mjs which registers them on a rolling window as the WC
//     unfolds.
//   - AI Champion trophy (id 1) — that's operator-minted by AgentLeague.closeSeason,
//     so it doesn't need a `defineTrophy` rule. Reserving id 1 for it.
//
// Idempotency:
//   Each item is checked before write — already-registered items are skipped
//   without spending gas. Safe to re-run.
//
// CLI:
//   DRY_RUN=1 node scripts/seed-v2.mjs       # log intended calls, no writes
//   node scripts/seed-v2.mjs                  # live run
//
// Env (loaded via dotenv; see scripts/env-example):
//   PRIVATE_KEY        deployer key (has QUEST_REGISTRAR_ROLE + TROPHY_REGISTRAR_ROLE)
//   RPC_URL, CHAIN_ID  X Layer testnet (1952) or mainnet (196)
//   QUEST_ENGINE       deployed QuestEngine address
//   TROPHY             deployed Trophy address
//   AGENT_REGISTRY     deployed AgentRegistry address
//
//   QUEST_WINDOW_END   optional uint64; default 1788960000 (2026-08-10 UTC).
//                      Must outlast every quest registered here.
//   AGENT_PRICE_WEI    optional; per-call OKB price for first-party agents.
//                      Default 100000000000000 (0.0001 OKB ≈ sub-cent).
//   AGENT_WALLET       optional; the on-chain agent wallet that signs submitResult.
//                      Defaults to the deployer (single-key demo). Override per-
//                      agent with AGENT_WALLET_MATCH_ANALYST etc. for prod.

import 'dotenv/config';
import { encodeAbiParameters, keccak256, toBytes } from 'viem';
import {
  getPublicClient,
  getWalletClient,
  envAddress,
  isDryRun,
  addressFromPk,
  txLink,
} from './lib/chain.mjs';

const QUEST_TYPE = { SELF_ATTEST: 0, PREDICTION: 1, EXTERNAL_PROOF: 2 };

// Match FanRep.sol DIM_* constants (FanRep.sol:17-21).
const DIM_PRED = keccak256(toBytes('PREDICTION_ACCURACY'));
const DIM_ENG = keccak256(toBytes('ENGAGEMENT_BREADTH'));

// QuestEngine ABI fragment — only the entrypoints this seeder calls.
const questEngineAbi = [
  {
    type: 'function',
    name: 'registerQuest',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'qType', type: 'uint8' },
      { name: 'questId', type: 'bytes32' },
      { name: 'startsAt', type: 'uint64' },
      { name: 'endsAt', type: 'uint64' },
      { name: 'xpReward', type: 'uint64' },
      { name: 'dim', type: 'bytes32' },
      { name: 'config', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getQuest',
    stateMutability: 'view',
    inputs: [{ name: 'questId', type: 'bytes32' }],
    outputs: [
      { name: 'qType', type: 'uint8' },
      { name: 'startsAt', type: 'uint64' },
      { name: 'endsAt', type: 'uint64' },
      { name: 'xpReward', type: 'uint64' },
      { name: 'dim', type: 'bytes32' },
      { name: 'config', type: 'bytes' },
      { name: 'exists', type: 'bool' },
    ],
  },
];

// Trophy ABI fragment.
const trophyAbi = [
  {
    type: 'function',
    name: 'defineTrophy',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'trophyId', type: 'uint256' },
      { name: 'requiredXP', type: 'uint64' },
      { name: 'windowEnd', type: 'uint64' },
      { name: 'requiredQuestIds', type: 'bytes32[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getRule',
    stateMutability: 'view',
    inputs: [{ name: 'trophyId', type: 'uint256' }],
    outputs: [
      { name: 'requiredXP', type: 'uint64' },
      { name: 'windowEnd', type: 'uint64' },
      { name: 'requiredQuestIds', type: 'bytes32[]' },
      { name: 'exists', type: 'bool' },
    ],
  },
];

// AgentRegistry ABI fragment.
const agentRegistryAbi = [
  {
    type: 'function',
    name: 'registerAgent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'agentWallet', type: 'address' },
      { name: 'priceWei', type: 'uint128' },
      { name: 'endpointHint', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getAgent',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'agentWallet', type: 'address' },
      { name: 'priceWei', type: 'uint128' },
      { name: 'endpointHint', type: 'string' },
      { name: 'exists', type: 'bool' },
    ],
  },
];

// ---------------------------------------------------------------------------

function agentIdOf(name) {
  return keccak256(toBytes(name));
}

function questIdOf(name) {
  return keccak256(toBytes(name));
}

function agentWalletFor(name, defaultAddr) {
  const key = `AGENT_WALLET_${name.toUpperCase().replace(/-/g, '_')}`;
  return process.env[key] || process.env.AGENT_WALLET || defaultAddr;
}

async function seedQuests(pub, wallet, qe, deployer, opts) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const end = BigInt(process.env.QUEST_WINDOW_END || '1788960000'); // 2026-08-10 UTC

  // EXTERNAL_PROOF config = abi.encode(address signer). Deployer signs share-post
  // attestations for the demo. Rotate to a dedicated signer in prod.
  const sharePostConfig = encodeAbiParameters(
    [{ type: 'address' }],
    [deployer],
  );

  const quests = [
    { name: 'fan-id', type: QUEST_TYPE.SELF_ATTEST, xp: 100n, dim: DIM_ENG, config: '0x' },
    { name: 'team-profile', type: QUEST_TYPE.SELF_ATTEST, xp: 100n, dim: DIM_ENG, config: '0x' },
    { name: 'daily-fact', type: QUEST_TYPE.SELF_ATTEST, xp: 50n, dim: DIM_ENG, config: '0x' },
    { name: 'share-post', type: QUEST_TYPE.EXTERNAL_PROOF, xp: 200n, dim: DIM_ENG, config: sharePostConfig },
    { name: 'group-stage-streak', type: QUEST_TYPE.SELF_ATTEST, xp: 500n, dim: DIM_ENG, config: '0x' },
    { name: 'deploy-your-agent', type: QUEST_TYPE.SELF_ATTEST, xp: 1000n, dim: DIM_ENG, config: '0x' },
  ];

  console.log(`\n--- quests (${quests.length}) ---`);
  for (const q of quests) {
    const qid = questIdOf(q.name);
    const existing = await pub.readContract({
      address: qe,
      abi: questEngineAbi,
      functionName: 'getQuest',
      args: [qid],
    });
    if (existing[6]) {
      console.log(`  [skip] ${q.name} (already registered)`);
      continue;
    }
    if (opts.dryRun) {
      console.log(
        `  [dry-run] registerQuest ${q.name} type=${q.type} xp=${q.xp} dim=engagement window=[${now}..${end}]`,
      );
      continue;
    }
    const hash = await wallet.writeContract({
      address: qe,
      abi: questEngineAbi,
      functionName: 'registerQuest',
      args: [q.type, qid, now, end, q.xp, q.dim, q.config],
    });
    await pub.waitForTransactionReceipt({ hash });
    console.log(`  [ok]   ${q.name} → ${txLink(hash)}`);
  }
}

async function seedAgents(pub, wallet, ar, deployer, opts) {
  const priceWei = BigInt(process.env.AGENT_PRICE_WEI || '100000000000000'); // 0.0001 OKB

  const agents = [
    { name: 'match-analyst', endpoint: '/api/agents/match-analyst' },
    { name: 'personal-stats', endpoint: '/api/agents/personal-stats' },
    { name: 'highlights', endpoint: '/api/agents/highlights' },
  ];

  console.log(`\n--- agents (${agents.length}) ---`);
  for (const a of agents) {
    const aid = agentIdOf(a.name);
    const existing = await pub.readContract({
      address: ar,
      abi: agentRegistryAbi,
      functionName: 'getAgent',
      args: [aid],
    });
    if (existing[4]) {
      console.log(`  [skip] ${a.name} (already registered, wallet=${existing[1]})`);
      continue;
    }
    const wallet_ = agentWalletFor(a.name, deployer);
    if (opts.dryRun) {
      console.log(
        `  [dry-run] registerAgent ${a.name} agentId=${aid} wallet=${wallet_} price=${priceWei} hint=${a.endpoint}`,
      );
      continue;
    }
    const hash = await wallet.writeContract({
      address: ar,
      abi: agentRegistryAbi,
      functionName: 'registerAgent',
      args: [aid, wallet_, priceWei, a.endpoint],
    });
    await pub.waitForTransactionReceipt({ hash });
    console.log(`  [ok]   ${a.name} → ${txLink(hash)}`);
  }
}

async function seedTrophies(pub, wallet, tr, opts) {
  // Trophy id 1 is reserved for AI Champion (operator-minted by AgentLeague —
  // no `defineTrophy` rule needed; the rule path is only for user `claim`).
  // We seed two user-claimable trophies here.
  const trophies = [
    { id: 2n, name: 'First Whistle', requiredXP: 100n, windowEnd: 0n, requiredQuestIds: [] },
    { id: 3n, name: 'Pollster', requiredXP: 1000n, windowEnd: 0n, requiredQuestIds: [] },
  ];

  console.log(`\n--- trophies (${trophies.length}) ---`);
  for (const t of trophies) {
    const rule = await pub.readContract({
      address: tr,
      abi: trophyAbi,
      functionName: 'getRule',
      args: [t.id],
    });
    if (rule[3]) {
      console.log(`  [skip] #${t.id} ${t.name} (already defined)`);
      continue;
    }
    if (opts.dryRun) {
      console.log(
        `  [dry-run] defineTrophy #${t.id} ${t.name} requiredXP=${t.requiredXP} windowEnd=${t.windowEnd} requiredQuestIds=[]`,
      );
      continue;
    }
    const hash = await wallet.writeContract({
      address: tr,
      abi: trophyAbi,
      functionName: 'defineTrophy',
      args: [t.id, t.requiredXP, t.windowEnd, t.requiredQuestIds],
    });
    await pub.waitForTransactionReceipt({ hash });
    console.log(`  [ok]   #${t.id} ${t.name} → ${txLink(hash)}`);
  }
}

async function main() {
  const dryRun = isDryRun();
  const pk = process.env.PRIVATE_KEY;
  if (!dryRun && !pk) {
    throw new Error('PRIVATE_KEY required for live run (set DRY_RUN=1 for a dry run)');
  }

  const qe = envAddress('QUEST_ENGINE');
  const tr = envAddress('TROPHY');
  const ar = envAddress('AGENT_REGISTRY');

  const pub = getPublicClient();
  const wallet = dryRun ? null : getWalletClient(pk);
  const deployer = pk ? addressFromPk(pk) : '0x0000000000000000000000000000000000000000';

  console.log(`Seed v2 (dryRun=${dryRun})`);
  console.log(`  QuestEngine   : ${qe}`);
  console.log(`  Trophy        : ${tr}`);
  console.log(`  AgentRegistry : ${ar}`);
  console.log(`  Deployer      : ${deployer}`);

  await seedQuests(pub, wallet, qe, deployer, { dryRun });
  await seedAgents(pub, wallet, ar, deployer, { dryRun });
  await seedTrophies(pub, wallet, tr, { dryRun });

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
