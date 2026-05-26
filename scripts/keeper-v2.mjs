// Kickoff v2 keeper.
//
// Replaces v1's market-resolver. Reads the FIFA World Cup 2026 schedule
// (openfootball CC0), and for each match drives the full v2 quest lifecycle on
// QuestEngine + OptimisticOracle:
//
//   1. PREPARE  — ConditionalTokens.prepareCondition(USDC, questionId, 3)
//                 for the 1X2 (Home / Draw / Away) outcomes.
//   2. REGISTER — QuestEngine.registerQuest twice per match:
//                    PREDICTION   ("predict the score") on (kickoff-86400 .. kickoff)
//                    SELF_ATTEST  ("watch tonight's match") on (kickoff .. kickoff+10800)
//   3. PROPOSE  — after full time, OptimisticOracle.propose(conditionId, oneHot).
//   4. SETTLE   — after liveness elapses (OO returns it), OptimisticOracle.settle.
//
// Per-user QuestEngine.settlePrediction(questId, user, slot, salt) is NOT the
// keeper's job — that's user-driven (each user holds their own salt). The
// keeper just makes sure the underlying condition gets resolved on time.
//
// ## SOURCE OF SCHEDULE DATA
//
// Primary source: openfootball/worldcup.json (CC0, no API key).
//   URL: https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
//   Verified: returns HTTP 200 at the time of writing (2026-05-26).
// Local cache: data/worldcup-2026.json (populated by `node scripts/fetch-worldcup.mjs`).
// Real-result fallback for --simulate: data/keeper-v2-fixtures.json (hand-curated
// 6-fixture sample with synthetic final scores — only used when --simulate is
// passed, since no real WC 2026 results exist yet).
//
// ## CLI
//
//   DRY_RUN=1 node scripts/keeper-v2.mjs --dry-run
//        Logs the intended on-chain calls. Runs cleanly with placeholder env.
//   node scripts/keeper-v2.mjs
//        Live run. Requires env: RPC_URL, CHAIN_ID, USDC, CONDITIONAL_TOKENS,
//        OPTIMISTIC_ORACLE, QUEST_ENGINE, ORACLE_PK.
//   node scripts/keeper-v2.mjs --simulate
//        Uses synthetic final scores from data/keeper-v2-fixtures.json so the
//        full lifecycle (propose → settle) can be exercised before the real
//        tournament starts on 2026-06-11. Pre-tournament settlements MUST be
//        clearly labelled as simulated when shown to users.
//
// Flags:
//   --dry-run           No broadcast; print intended calls.
//   --simulate          Use simulated results from data/keeper-v2-fixtures.json.
//   --register-only     Stop after step 2 (PREPARE+REGISTER); skip propose/settle.
//   --propose-only      Skip step 1+2; only propose results.
//   --settle-only       Skip everything except OO settle.
//   --upcoming-days=N   Only register quests for matches within the next N days
//                       (default: 7). Use 60 to seed everything for the tournament.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { encodeAbiParameters, keccak256, toBytes, toHex } from 'viem';
import {
  getPublicClient,
  getWalletClient,
  envAddress,
  isDryRun,
  addressFromPk,
  txLink,
} from './lib/chain.mjs';
import {
  conditionalTokensAbi,
  optimisticOracleAbi,
  mockUsdcAbi,
} from './lib/abis.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'data');

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
const LOCAL_SCHEDULE = resolve(dataDir, 'worldcup-2026.json');
const SIM_FIXTURES = resolve(dataDir, 'keeper-v2-fixtures.json');

// QuestType enum order from QuestEngine.sol:28-32.
const QUEST_TYPE = { SELF_ATTEST: 0, PREDICTION: 1, EXTERNAL_PROOF: 2 };

// FanRep dimension constants (FanRep.sol:17-21) — keccak256 of the labels.
const DIM = {
  PREDICTION_ACCURACY: keccak256(toBytes('PREDICTION_ACCURACY')),
  ENGAGEMENT_BREADTH: keccak256(toBytes('ENGAGEMENT_BREADTH')),
};

// 1X2 = 3 outcomes (Home, Draw, Away). Reused everywhere.
const OUTCOME_SLOT_COUNT = 3;

// OO status: 0=None, 1=Proposed, 2=Disputed, 3=Settled (lib/abis.mjs:55).
const OO_STATUS = { 0: 'None', 1: 'Proposed', 2: 'Disputed', 3: 'Settled' };
// CT status: 0=None, 1=Open, 2=Resolved, 3=Voided (lib/abis.mjs:20).
const CT_STATUS = { 0: 'None', 1: 'Open', 2: 'Resolved', 3: 'Voided' };

// QuestEngine ABI — only the entrypoints the keeper calls. Verified against
// contracts/src/QuestEngine.sol (lines 85-103, 132-160, 206-221).
const questEngineAbi = [
  { type: 'function', name: 'registerQuest', stateMutability: 'nonpayable', inputs: [
    { name: 'qType', type: 'uint8' },
    { name: 'questId', type: 'bytes32' },
    { name: 'startsAt', type: 'uint64' },
    { name: 'endsAt', type: 'uint64' },
    { name: 'xpReward', type: 'uint64' },
    { name: 'dim', type: 'bytes32' },
    { name: 'config', type: 'bytes' },
  ], outputs: [] },
  { type: 'function', name: 'getQuest', stateMutability: 'view', inputs: [
    { name: 'questId', type: 'bytes32' },
  ], outputs: [
    { name: 'qType', type: 'uint8' },
    { name: 'startsAt', type: 'uint64' },
    { name: 'endsAt', type: 'uint64' },
    { name: 'xpReward', type: 'uint64' },
    { name: 'dim', type: 'bytes32' },
    { name: 'config', type: 'bytes' },
    { name: 'exists', type: 'bool' },
  ] },
];

// --- args ---

function flag(name, fallback = false) {
  return process.argv.includes(`--${name}`) ? true : fallback;
}
function flagValue(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
}

const opts = {
  dryRun: isDryRun(),
  simulate: flag('simulate'),
  registerOnly: flag('register-only'),
  proposeOnly: flag('propose-only'),
  settleOnly: flag('settle-only'),
  upcomingDays: Number(flagValue('upcoming-days', '7')),
};

// --- schedule ---

async function loadSchedule() {
  // Prefer the local CC0 cache when present (offline + reproducible). Fall
  // back to a live fetch of the verified openfootball URL. Last resort: the
  // sim fixture file. We NEVER invent data.
  if (existsSync(LOCAL_SCHEDULE)) {
    const json = JSON.parse(readFileSync(LOCAL_SCHEDULE, 'utf8'));
    if (Array.isArray(json?.matches)) {
      console.log(`schedule: ${LOCAL_SCHEDULE} (${json.matches.length} matches, local cache)`);
      return json;
    }
  }
  try {
    const res = await fetch(OPENFOOTBALL_URL, { headers: { accept: 'application/json' } });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.matches)) {
        console.log(`schedule: ${OPENFOOTBALL_URL} (${json.matches.length} matches, live fetch)`);
        return json;
      }
    }
    console.warn(`schedule: openfootball returned HTTP ${res.status}; falling back to sim fixtures`);
  } catch (err) {
    console.warn(`schedule: openfootball fetch failed (${err.message}); falling back to sim fixtures`);
  }
  if (existsSync(SIM_FIXTURES)) {
    const json = JSON.parse(readFileSync(SIM_FIXTURES, 'utf8'));
    console.log(`schedule: ${SIM_FIXTURES} (${json.matches.length} matches, sim fallback)`);
    console.log('         *** USING SIM FIXTURES — output is for demo only ***');
    return json;
  }
  throw new Error(
    'No schedule available. Run `node scripts/fetch-worldcup.mjs` or create data/keeper-v2-fixtures.json.',
  );
}

function parseKickoff(date, time) {
  // openfootball time format: "HH:MM UTC±N" or "HH:MM" (assume UTC). Returns
  // unix seconds at kickoff. We do this manually rather than pull a date lib.
  if (!date) return null;
  const m = String(time || '').trim().match(/^(\d{1,2}):(\d{2})\s*(UTC([+-]\d{1,2}))?/i);
  const hh = m ? Number(m[1]) : 0;
  const mm = m ? Number(m[2]) : 0;
  const tzOffsetHours = m && m[4] ? Number(m[4]) : 0;
  // Local time = UTC + tzOffset; so UTC = local - tzOffset.
  const localMs = Date.parse(`${date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`);
  if (Number.isNaN(localMs)) return null;
  const utcMs = localMs - tzOffsetHours * 3_600_000;
  return Math.floor(utcMs / 1000);
}

// Stable bytes32 ids derived from match identity. Keeper-driven, no salt — we
// want re-runs to be idempotent (registerQuest reverts on duplicate, so we can
// skip already-registered ones cheaply).
function questionIdFor(match) {
  const key = `kickoff.v2.1x2|${match.date}|${match.team1}|${match.team2}`;
  return keccak256(toBytes(key));
}
function predictionQuestId(match) {
  const key = `kickoff.v2.quest.prediction|${match.date}|${match.team1}|${match.team2}`;
  return keccak256(toBytes(key));
}
function selfAttestQuestId(match) {
  const key = `kickoff.v2.quest.attend|${match.date}|${match.team1}|${match.team2}`;
  return keccak256(toBytes(key));
}

function conditionIdFor(usdc, oracle, questionId, slotCount) {
  // Matches the standard ConditionalTokens conditionId derivation. Verified
  // against contracts/src/ConditionalTokens.sol's _conditionId.
  // conditionId = keccak256(abi.encode(oracle, questionId, outcomeSlotCount))
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'bytes32' }, { type: 'uint8' }],
      [oracle, questionId, slotCount],
    ),
  );
}

function oneHot(winnerIndex, n) {
  if (!(winnerIndex >= 0 && winnerIndex < n)) {
    throw new Error(`winnerIndex ${winnerIndex} out of range for ${n} outcomes`);
  }
  return Array.from({ length: n }, (_, i) => (i === winnerIndex ? 1n : 0n));
}

// --- workflows ---

async function ensureSimFixtures() {
  if (existsSync(SIM_FIXTURES)) return;
  mkdirSync(dataDir, { recursive: true });
  // 6 group-stage fixtures, synthetic scores. Real-tournament scores will
  // replace this file's contents; for now this drives --simulate end-to-end.
  const matches = [
    { date: '2026-06-11', time: '13:00 UTC-6', team1: 'Mexico', team2: 'South Africa', group: 'Group A', simScore: [2, 1] },
    { date: '2026-06-11', time: '20:00 UTC-6', team1: 'South Korea', team2: 'Czech Republic', group: 'Group A', simScore: [1, 1] },
    { date: '2026-06-12', time: '13:00 UTC-7', team1: 'Canada', team2: 'Senegal', group: 'Group B', simScore: [0, 2] },
    { date: '2026-06-12', time: '16:00 UTC-6', team1: 'Switzerland', team2: 'Croatia', group: 'Group B', simScore: [1, 3] },
    { date: '2026-06-13', time: '12:00 UTC-5', team1: 'United States', team2: 'Egypt', group: 'Group C', simScore: [2, 2] },
    { date: '2026-06-13', time: '15:00 UTC-5', team1: 'Argentina', team2: 'Japan', group: 'Group C', simScore: [3, 0] },
  ];
  writeFileSync(SIM_FIXTURES, JSON.stringify({ name: 'Kickoff v2 sim fixtures', matches }, null, 2) + '\n');
  console.log(`Wrote sim fixtures to ${SIM_FIXTURES}`);
}

function deriveWinningSlot(simScore) {
  // 1X2 mapping: [Home, Draw, Away]
  const [h, a] = simScore;
  if (h > a) return 0;
  if (h === a) return 1;
  return 2;
}

async function runRegister({ schedule, ct, usdc, oo, oracle, questEngine, publicClient, wallet }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const horizonSec = nowSec + opts.upcomingDays * 86_400;

  const upcoming = [];
  for (const m of schedule.matches) {
    const kickoff = parseKickoff(m.date, m.time);
    if (!kickoff) {
      console.log(`  skip (no kickoff time): ${m.team1} vs ${m.team2} @ ${m.date} ${m.time}`);
      continue;
    }
    if (kickoff < nowSec) {
      // already started — registration window has closed; the propose/settle
      // pass will handle these.
      continue;
    }
    if (kickoff > horizonSec) continue;
    upcoming.push({ ...m, kickoff });
  }
  console.log(`upcoming within ${opts.upcomingDays}d: ${upcoming.length} match(es)`);

  for (const m of upcoming) {
    const questionId = questionIdFor(m);
    const condId = conditionIdFor(usdc, oo, questionId, OUTCOME_SLOT_COUNT);
    const predictionId = predictionQuestId(m);
    const attendId = selfAttestQuestId(m);

    const predictWindow = [m.kickoff - 86_400, m.kickoff]; // commit window: 24h before kickoff → kickoff
    const attendWindow = [m.kickoff, m.kickoff + 10_800]; // self-attest window: kickoff → +3h
    const xpPredict = 1000n;
    const xpAttend = 200n;

    // PREDICTION config is ABI(bytes32 conditionId); SELF_ATTEST config is empty bytes.
    const predictionConfig = encodeAbiParameters([{ type: 'bytes32' }], [condId]);
    const attendConfig = '0x';

    console.log(`\n--- ${m.team1} vs ${m.team2} (${m.date} ${m.time}) ---`);
    console.log(`  questionId       : ${questionId}`);
    console.log(`  conditionId      : ${condId}`);
    console.log(`  predictionQuestId: ${predictionId}`);
    console.log(`  attendQuestId    : ${attendId}`);

    if (opts.dryRun) {
      console.log(`  [dry-run] CT.prepareCondition(${usdc || '<USDC>'}, ${questionId}, ${OUTCOME_SLOT_COUNT})`);
      console.log(`  [dry-run] QE.registerQuest(PREDICTION, ${predictionId}, ${predictWindow[0]}, ${predictWindow[1]}, ${xpPredict}, DIM_PRED_ACC, <conditionId>)`);
      console.log(`  [dry-run] QE.registerQuest(SELF_ATTEST, ${attendId}, ${attendWindow[0]}, ${attendWindow[1]}, ${xpAttend}, DIM_ENGAGEMENT, 0x)`);
      continue;
    }

    // 1) prepare the CT condition (no-op if already prepared)
    const ctStatus = Number(await publicClient.readContract({
      address: ct, abi: conditionalTokensAbi, functionName: 'conditionStatus', args: [condId],
    }));
    if (ctStatus === 0) {
      const h = await wallet.writeContract({
        address: ct, abi: conditionalTokensAbi, functionName: 'prepareCondition',
        args: [usdc, questionId, OUTCOME_SLOT_COUNT],
      });
      await publicClient.waitForTransactionReceipt({ hash: h });
      console.log(`  prepared CT condition: ${txLink(h)}`);
    } else {
      console.log(`  CT condition already ${CT_STATUS[ctStatus] ?? ctStatus}`);
    }

    // 2a) register PREDICTION quest (skip if already exists)
    const existingPred = await publicClient.readContract({
      address: questEngine, abi: questEngineAbi, functionName: 'getQuest', args: [predictionId],
    });
    if (existingPred[6]) {
      console.log(`  prediction quest already registered`);
    } else {
      const h = await wallet.writeContract({
        address: questEngine, abi: questEngineAbi, functionName: 'registerQuest',
        args: [QUEST_TYPE.PREDICTION, predictionId, BigInt(predictWindow[0]), BigInt(predictWindow[1]), xpPredict, DIM.PREDICTION_ACCURACY, predictionConfig],
      });
      await publicClient.waitForTransactionReceipt({ hash: h });
      console.log(`  registered PREDICTION: ${txLink(h)}`);
    }

    // 2b) register SELF_ATTEST quest
    const existingAtt = await publicClient.readContract({
      address: questEngine, abi: questEngineAbi, functionName: 'getQuest', args: [attendId],
    });
    if (existingAtt[6]) {
      console.log(`  self-attest quest already registered`);
    } else {
      const h = await wallet.writeContract({
        address: questEngine, abi: questEngineAbi, functionName: 'registerQuest',
        args: [QUEST_TYPE.SELF_ATTEST, attendId, BigInt(attendWindow[0]), BigInt(attendWindow[1]), xpAttend, DIM.ENGAGEMENT_BREADTH, attendConfig],
      });
      await publicClient.waitForTransactionReceipt({ hash: h });
      console.log(`  registered SELF_ATTEST: ${txLink(h)}`);
    }
  }
}

async function runPropose({ schedule, ct, usdc, oo, oracle, publicClient, wallet }) {
  const nowSec = Math.floor(Date.now() / 1000);

  // Build the list of fixtures that have finished and have a known winner.
  // In --simulate mode we read simScore from the fixture file; in live mode
  // there's no source plumbed in yet (production source is API-FOOTBALL,
  // see scripts/keeper/resolve.mjs for that integration).
  const finished = [];
  for (const m of schedule.matches) {
    const kickoff = parseKickoff(m.date, m.time);
    if (!kickoff) continue;
    if (kickoff > nowSec) continue;
    if (opts.simulate) {
      if (!Array.isArray(m.simScore) || m.simScore.length !== 2) continue;
      finished.push({ ...m, kickoff, winnerSlot: deriveWinningSlot(m.simScore) });
    } else {
      // Live result source not wired into v2 yet. For real WC matches the
      // production source is API-FOOTBALL (see scripts/keeper/resolve.mjs).
      // Until that's wired, --simulate is the only path that proposes.
    }
  }
  console.log(`fixtures ready to propose: ${finished.length}`);

  if (!opts.dryRun) {
    var bondAmount = await publicClient.readContract({ address: oo, abi: optimisticOracleAbi, functionName: 'bondAmount' });
  }
  for (const m of finished) {
    const questionId = questionIdFor(m);
    const condId = conditionIdFor(usdc, oo, questionId, OUTCOME_SLOT_COUNT);
    const payouts = oneHot(m.winnerSlot, OUTCOME_SLOT_COUNT);
    console.log(`\n--- propose ${m.team1} ${m.simScore?.[0]}-${m.simScore?.[1]} ${m.team2} ---`);
    console.log(`  conditionId: ${condId}`);
    console.log(`  payouts    : [${payouts.join(', ')}] (winner slot ${m.winnerSlot})`);

    if (opts.dryRun) {
      console.log(`  [dry-run] usdc.approve(${oo || '<OO>'}, <bondAmount>)`);
      console.log(`  [dry-run] oo.propose(${condId}, [${payouts.join(', ')}])`);
      continue;
    }

    // pre-flight: CT prepared? OO already proposed?
    const ctStatus = Number(await publicClient.readContract({ address: ct, abi: conditionalTokensAbi, functionName: 'conditionStatus', args: [condId] }));
    if (ctStatus === 0) { console.log(`  skip: condition not prepared (run --register-only first)`); continue; }
    if (ctStatus === 2) { console.log(`  skip: condition already Resolved`); continue; }
    const ooStatusRaw = (await publicClient.readContract({ address: oo, abi: optimisticOracleAbi, functionName: 'getProposal', args: [condId] }))[3];
    const ooStatus = Number(ooStatusRaw);
    if (ooStatus !== 0) { console.log(`  skip: OO proposal already ${OO_STATUS[ooStatus]}`); continue; }

    // Approve OO for bond + propose
    const allowance = await publicClient.readContract({ address: usdc, abi: mockUsdcAbi, functionName: 'allowance', args: [oracle, oo] });
    if (allowance < bondAmount) {
      const h = await wallet.writeContract({ address: usdc, abi: mockUsdcAbi, functionName: 'approve', args: [oo, bondAmount] });
      await publicClient.waitForTransactionReceipt({ hash: h });
      console.log(`  approved OO bond: ${txLink(h)}`);
    }
    const h = await wallet.writeContract({ address: oo, abi: optimisticOracleAbi, functionName: 'propose', args: [condId, payouts] });
    await publicClient.waitForTransactionReceipt({ hash: h });
    console.log(`  proposed: ${txLink(h)}`);
  }
}

async function runSettle({ schedule, ct, oo, publicClient, wallet }) {
  const liveness = opts.dryRun
    ? 120n
    : await publicClient.readContract({ address: oo, abi: optimisticOracleAbi, functionName: 'liveness' });
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  // The candidate list is anything in --simulate mode that had a winner. In
  // live mode, after the propose pass is wired to a real result source, the
  // same iteration applies.
  const candidates = schedule.matches
    .filter((m) => parseKickoff(m.date, m.time))
    .filter((m) => !opts.simulate || (Array.isArray(m.simScore) && m.simScore.length === 2));

  console.log(`settle pass: liveness=${liveness}s, ${candidates.length} candidate(s)`);
  for (const m of candidates) {
    const questionId = questionIdFor(m);
    const condId = conditionIdFor(usdcAddr(), oo, questionId, OUTCOME_SLOT_COUNT);
    console.log(`\n--- settle ${m.team1} vs ${m.team2} ---`);
    console.log(`  conditionId: ${condId}`);

    if (opts.dryRun) {
      console.log(`  [dry-run] (if Proposed + undisputed + past ${liveness}s liveness) oo.settle(${condId})`);
      continue;
    }
    const prop = await publicClient.readContract({ address: oo, abi: optimisticOracleAbi, functionName: 'getProposal', args: [condId] });
    const status = Number(prop[3]);
    if (status !== 1) { console.log(`  skip: OO proposal status ${OO_STATUS[status] ?? status} (need Proposed)`); continue; }
    const readyAt = BigInt(prop[2]) + BigInt(liveness);
    if (nowSec < readyAt) { console.log(`  skip: liveness not elapsed (${readyAt - nowSec}s remaining)`); continue; }

    const h = await wallet.writeContract({ address: oo, abi: optimisticOracleAbi, functionName: 'settle', args: [condId] });
    await publicClient.waitForTransactionReceipt({ hash: h });
    console.log(`  settled: ${txLink(h)}`);
  }
}

// Internal helper; only used in runSettle (avoids reading USDC twice).
function usdcAddr() {
  // We don't strictly need USDC to settle, but conditionId depends on the
  // oracle address (OO) — not USDC. We pass a zero address here because the
  // conditionId derivation in this codebase is keccak256(oracle, questionId,
  // slotCount); USDC is the collateral, not part of the id. If your CT
  // version includes collateral in the conditionId, set USDC and update
  // conditionIdFor() to match.
  return process.env.USDC ?? '0x0000000000000000000000000000000000000000';
}

// --- main ---

async function main() {
  if (opts.simulate) await ensureSimFixtures();

  console.log(`Kickoff v2 keeper`);
  console.log(`  mode        : ${opts.dryRun ? 'DRY RUN' : 'BROADCAST'}${opts.simulate ? ' + simulate' : ''}`);
  console.log(`  steps       : ${[
    !opts.proposeOnly && !opts.settleOnly && 'register',
    !opts.registerOnly && !opts.settleOnly && 'propose',
    !opts.registerOnly && !opts.proposeOnly && 'settle',
  ].filter(Boolean).join(' -> ')}`);

  const schedule = opts.simulate
    ? JSON.parse(readFileSync(SIM_FIXTURES, 'utf8'))
    : await loadSchedule();

  const ct = envAddress('CONDITIONAL_TOKENS', { dryRun: opts.dryRun });
  const oo = envAddress('OPTIMISTIC_ORACLE', { dryRun: opts.dryRun });
  const usdc = envAddress('USDC', { dryRun: opts.dryRun });
  const questEngine = envAddress('QUEST_ENGINE', { dryRun: opts.dryRun });
  const oraclePk = process.env.ORACLE_PK || null;
  const oracle = addressFromPk(oraclePk);

  if (!opts.dryRun) {
    if (!ct || !oo || !usdc || !questEngine || !oraclePk) {
      throw new Error('Broadcast mode needs CONDITIONAL_TOKENS, OPTIMISTIC_ORACLE, USDC, QUEST_ENGINE and ORACLE_PK in env.');
    }
  }

  const publicClient = opts.dryRun ? null : getPublicClient();
  const wallet = opts.dryRun ? null : getWalletClient(oraclePk);

  console.log(`  CT          : ${ct ?? '<unset>'}`);
  console.log(`  OO          : ${oo ?? '<unset>'}`);
  console.log(`  USDC        : ${usdc ?? '<unset>'}`);
  console.log(`  QuestEngine : ${questEngine ?? '<unset>'}`);
  console.log(`  Oracle PK   : ${oracle ?? '<unset>'}`);

  const ctx = { schedule, ct, usdc, oo, oracle, questEngine, publicClient, wallet };

  if (!opts.proposeOnly && !opts.settleOnly) {
    console.log('\n=== register ===');
    await runRegister(ctx);
  }
  if (!opts.registerOnly && !opts.settleOnly) {
    console.log('\n=== propose ===');
    if (!opts.simulate) {
      console.log('  (live mode has no result source plumbed yet — run with --simulate to exercise propose/settle)');
    }
    await runPropose(ctx);
  }
  if (!opts.registerOnly && !opts.proposeOnly) {
    console.log('\n=== settle ===');
    await runSettle(ctx);
  }

  console.log('\nNote: per-user QuestEngine.settlePrediction(questId, user, slot, salt) is user-driven');
  console.log('      (the keeper does not hold user salts). Each user calls it themselves to credit XP.');
}

main().catch((err) => {
  console.error('keeper-v2 failed:', err?.shortMessage || err?.message || err);
  process.exitCode = 1;
});
