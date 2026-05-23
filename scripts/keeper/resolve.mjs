// Kickoff resolution keeper — v2 OPTIMISTIC ORACLE flow.
//
// Resolution is two-phase:
//   ACTION=propose (default) — for each unresolved condition, approve the OO for its
//                              bondAmount (in the bond token == USDC collateral), then
//                              oo.propose(conditionId, payouts). Starts the liveness clock.
//   ACTION=settle            — after liveness, oo.settle(conditionId) for any Proposed +
//                              undisputed condition. settle writes payouts onto the CT.
//
// Two data modes:
//   MODE=simulated  (default) — read data/results.json (per conditionId: winningOutcome
//                               index + outcomeCount) and one-hot the payouts.
//   MODE=production           — skeleton that reads API-FOOTBALL (league=1, season=2026),
//                               derives 1X2 / OU2.5 / BTTS from final scores. Gated on
//                               APIFOOTBALL_KEY — refuses to call the API without it.
//
//   DRY_RUN=1 node keeper/resolve.mjs                      # propose, plan only
//   node keeper/resolve.mjs                                # propose (needs ORACLE_PK)
//   ACTION=settle node keeper/resolve.mjs                  # settle after liveness
//   MODE=production node keeper/resolve.mjs                # needs APIFOOTBALL_KEY
//
// Required env (broadcast): RPC_URL, CHAIN_ID, CONDITIONAL_TOKENS, OPTIMISTIC_ORACLE,
//                           USDC (bond token), ORACLE_PK
// Payout convention: payouts is a one-hot uint256[] of length outcomeCount — winning
//   index = 1, all others = 0. (1X2 [Home,Draw,Away]; OU2.5 [Over,Under]; BTTS [Yes,No];
//   group-winner one slot per team; outright/golden-boot [Yes,No].)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { formatUnits } from 'viem';
import {
  getPublicClient,
  getWalletClient,
  envAddress,
  isDryRun,
  addressFromPk,
  txLink,
} from '../lib/chain.mjs';
import { conditionalTokensAbi, optimisticOracleAbi, mockUsdcAbi } from '../lib/abis.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', '..', 'data');

// CT conditionStatus: 0=None, 1=Open, 2=Resolved, 3=Voided.
const CT_STATUS = { 0: 'None', 1: 'Open', 2: 'Resolved', 3: 'Voided' };
// OO proposal status: 0=None, 1=Proposed, 2=Disputed, 3=Settled.
const OO_STATUS = { 0: 'None', 1: 'Proposed', 2: 'Disputed', 3: 'Settled' };
const DEC = 6;

// One-hot payouts of length `n` with index `winner` = 1.
function oneHot(winner, n) {
  if (!(winner >= 0 && winner < n)) throw new Error(`winningOutcome ${winner} out of range for ${n} outcomes`);
  return Array.from({ length: n }, (_, i) => (i === winner ? 1n : 0n));
}

function loadResults() {
  const path = resolve(dataDir, 'results.json');
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(parsed.results)) throw new Error('results.json has no `results` array.');
  return parsed.results;
}

// Resolve outcomeCount for a result: prefer on-chain getOutcomeSlotCount, fall back to
// the count declared in results.json (needed in dry-run with no chain).
async function resolveOutcomeCount(publicClient, ct, r) {
  if (publicClient && ct) {
    const n = await publicClient.readContract({ address: ct, abi: conditionalTokensAbi, functionName: 'getOutcomeSlotCount', args: [r.conditionId] });
    if (Number(n) > 0) return Number(n);
  }
  if (Number(r.outcomeCount) >= 2) return Number(r.outcomeCount);
  throw new Error(`cannot determine outcomeCount for ${r.conditionId} (set outcomeCount in results.json or prepare the condition on-chain)`);
}

async function ensureBondApproval({ dryRun, publicClient, wallet, usdc, oo, oracle, bondAmount }) {
  if (dryRun) {
    console.log(`  [dry-run] usdc.approve(${oo}, ${formatUnits(bondAmount, DEC)}) for the OO bond`);
    return;
  }
  const allowance = await publicClient.readContract({ address: usdc, abi: mockUsdcAbi, functionName: 'allowance', args: [oracle, oo] });
  if (allowance >= bondAmount) return;
  const h = await wallet.writeContract({ address: usdc, abi: mockUsdcAbi, functionName: 'approve', args: [oo, bondAmount] });
  await publicClient.waitForTransactionReceipt({ hash: h });
  console.log(`  approved OO for bond ${formatUnits(bondAmount, DEC)} USDC: ${txLink(h)}`);
}

async function runPropose(dryRun) {
  const ct = envAddress('CONDITIONAL_TOKENS', { dryRun });
  const oo = envAddress('OPTIMISTIC_ORACLE', { dryRun });
  const usdc = envAddress('USDC', { dryRun });
  const oraclePk = process.env.ORACLE_PK || null;
  const oracle = addressFromPk(oraclePk);

  if (!dryRun && (!ct || !oo || !usdc || !oraclePk)) {
    throw new Error('Broadcast mode needs CONDITIONAL_TOKENS, OPTIMISTIC_ORACLE, USDC and ORACLE_PK in env.');
  }

  const results = loadResults();
  const publicClient = dryRun ? null : getPublicClient();
  const wallet = dryRun ? null : getWalletClient(oraclePk);

  let bondAmount = 0n;
  if (!dryRun) {
    bondAmount = await publicClient.readContract({ address: oo, abi: optimisticOracleAbi, functionName: 'bondAmount' });
  }

  console.log(`Action: propose  |  Mode: simulated  |  ${dryRun ? 'DRY RUN' : 'BROADCAST'}`);
  console.log(`CT: ${ct || '<unset>'}  OO: ${oo || '<unset>'}  Proposer: ${oracle || '<unset>'}`);
  if (!dryRun) console.log(`OO bond: ${formatUnits(bondAmount, DEC)} USDC (paid in the bond token == USDC)`);
  console.log(`Conditions to propose: ${results.length}\n`);

  let proposed = 0;
  for (const r of results) {
    const label = `${r.subject || r.title || ''} ${r.conditionId}`.trim();
    const n = await resolveOutcomeCount(publicClient, ct, r);
    const payouts = oneHot(r.winningOutcome, n);

    if (!dryRun) {
      const ctStatus = Number(await publicClient.readContract({ address: ct, abi: conditionalTokensAbi, functionName: 'conditionStatus', args: [r.conditionId] }));
      if (ctStatus === 2) { console.log(`  skip ${label}: condition already Resolved`); continue; }
      if (ctStatus === 0) { console.log(`  skip ${label}: condition status None (not prepared on-chain)`); continue; }
      const ooStatus = Number((await publicClient.readContract({ address: oo, abi: optimisticOracleAbi, functionName: 'getProposal', args: [r.conditionId] }))[3]);
      if (ooStatus !== 0) { console.log(`  skip ${label}: OO proposal already ${OO_STATUS[ooStatus]}`); continue; }
    }

    console.log(`  propose ${label}: winner index ${r.winningOutcome} of ${n} -> payouts=[${payouts.join(', ')}]`);
    if (dryRun) {
      await ensureBondApproval({ dryRun, bondAmount, oo: oo || '<OO>' });
      console.log(`    [dry-run] oo.propose(${r.conditionId}, [${payouts.join(', ')}])`);
      continue;
    }

    await ensureBondApproval({ dryRun, publicClient, wallet, usdc, oo, oracle, bondAmount });
    const hash = await wallet.writeContract({ address: oo, abi: optimisticOracleAbi, functionName: 'propose', args: [r.conditionId, payouts] });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`    proposed: ${txLink(hash)}`);
    proposed++;
  }

  console.log(`\n${dryRun ? 'Dry run complete.' : `Proposed ${proposed} condition(s). Run ACTION=settle after the OO liveness window.`}`);
}

async function runSettle(dryRun) {
  const ct = envAddress('CONDITIONAL_TOKENS', { dryRun });
  const oo = envAddress('OPTIMISTIC_ORACLE', { dryRun });
  const oraclePk = process.env.ORACLE_PK || null;
  const caller = addressFromPk(oraclePk);

  if (!dryRun && (!oo || !oraclePk)) {
    throw new Error('Settle mode needs OPTIMISTIC_ORACLE and ORACLE_PK in env.');
  }

  const results = loadResults();
  const publicClient = dryRun ? null : getPublicClient();
  const wallet = dryRun ? null : getWalletClient(oraclePk);

  let liveness = 0n;
  if (!dryRun) {
    liveness = await publicClient.readContract({ address: oo, abi: optimisticOracleAbi, functionName: 'liveness' });
  }

  console.log(`Action: settle  |  ${dryRun ? 'DRY RUN' : 'BROADCAST'}`);
  console.log(`OO: ${oo || '<unset>'}  Caller: ${caller || '<unset>'}`);
  if (!dryRun) console.log(`OO liveness: ${liveness}s`);
  console.log(`Conditions to check: ${results.length}\n`);

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  let settled = 0;
  for (const r of results) {
    const label = `${r.subject || r.title || ''} ${r.conditionId}`.trim();

    if (dryRun) {
      console.log(`  settle ${label}`);
      console.log(`    [dry-run] (if Proposed + undisputed + past liveness) oo.settle(${r.conditionId})`);
      continue;
    }

    const [, , proposedAt, statusRaw] = await publicClient.readContract({ address: oo, abi: optimisticOracleAbi, functionName: 'getProposal', args: [r.conditionId] });
    const status = Number(statusRaw);
    if (status !== 1) { console.log(`  skip ${label}: OO proposal status ${OO_STATUS[status] ?? status} (need Proposed)`); continue; }
    const readyAt = BigInt(proposedAt) + liveness;
    if (nowSec < readyAt) { console.log(`  skip ${label}: liveness not elapsed (${readyAt - nowSec}s remaining)`); continue; }

    const ctStatus = Number(await publicClient.readContract({ address: ct, abi: conditionalTokensAbi, functionName: 'conditionStatus', args: [r.conditionId] }));
    if (ctStatus === 2) { console.log(`  skip ${label}: condition already Resolved`); continue; }

    console.log(`  settle ${label}`);
    const hash = await wallet.writeContract({ address: oo, abi: optimisticOracleAbi, functionName: 'settle', args: [r.conditionId] });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`    settled: ${txLink(hash)}`);
    settled++;
  }

  console.log(`\n${dryRun ? 'Dry run complete.' : `Settled ${settled} condition(s).`}`);
}

// PRODUCTION skeleton — derives results from API-FOOTBALL final scores then hands the
// derived results[] to the same propose/settle path. The network call is gated on
// APIFOOTBALL_KEY so it never fires without an explicit key.
async function fetchApiFootballFixtures(apiKey) {
  // API-FOOTBALL v3: GET /fixtures?league=1&season=2026 (league 1 = World Cup).
  // Docs: https://www.api-football.com/documentation-v3#operation/get-fixtures
  const url = 'https://v3.football.api-sports.io/fixtures?league=1&season=2026';
  const res = await fetch(url, { headers: { 'x-apisports-key': apiKey, accept: 'application/json' } });
  if (!res.ok) throw new Error(`API-FOOTBALL responded ${res.status}`);
  const json = await res.json();
  return json.response || [];
}

// Derive 1X2 / OU2.5 / BTTS winning outcome indices from a finished fixture's score.
// (Kept here as the canonical mapping the production proposer would build results[] from.)
function deriveOutcomes(home, away) {
  const total = home + away;
  return {
    '1x2': home > away ? 0 : home === away ? 1 : 2, // [Home, Draw, Away]
    'over-under-2.5': total > 2.5 ? 0 : 1, // [Over, Under]
    btts: home > 0 && away > 0 ? 0 : 1, // [Yes, No]
  };
}

async function runProduction(dryRun) {
  const apiKey = process.env.APIFOOTBALL_KEY || null;
  console.log('Mode: production  (API-FOOTBALL league=1 season=2026)\n');

  if (!apiKey) {
    console.log('APIFOOTBALL_KEY not set — refusing to call the API without a key.');
    console.log('Set APIFOOTBALL_KEY in scripts/.env, then re-run.');
    console.log('This skeleton would:');
    console.log('  1. GET https://v3.football.api-sports.io/fixtures?league=1&season=2026');
    console.log('  2. Keep only fixtures with status.short === "FT" (full time).');
    console.log('  3. deriveOutcomes(homeGoals, awayGoals) -> 1X2 / OU2.5 / BTTS winning indices,');
    console.log('     then map each to its market conditionId (via data/deployed-markets.json).');
    console.log('  4. Build a results[] array and feed it to the same propose() / settle() path.');
    console.log('\n  NOTE: group-winner / outright / golden-boot resolve only after the relevant');
    console.log('        stage, so their fixture->winner mapping is a curated step you wire before');
    console.log('        going live; this skeleton stops short of auto-proposing those.');
    process.exitCode = dryRun ? 0 : 1;
    return;
  }

  const fixtures = await fetchApiFootballFixtures(apiKey);
  const finished = fixtures.filter((f) => f?.fixture?.status?.short === 'FT');
  console.log(`Fetched ${fixtures.length} fixtures, ${finished.length} finished (FT).`);
  console.log('Map each finished fixture to its market conditionIds (from data/deployed-markets.json),');
  console.log('use deriveOutcomes() to build a results[] array shaped like data/results.json, then run');
  console.log('the propose() / settle() path. Auto-proposing is left off pending your curated mapping review.');
}

async function main() {
  const dryRun = isDryRun();
  const mode = (process.env.MODE || 'simulated').toLowerCase();
  // Action via env (ACTION=settle) or CLI flag (--settle), so npm scripts stay cross-platform.
  const action = process.argv.includes('--settle') ? 'settle' : (process.env.ACTION || 'propose').toLowerCase();
  if (mode === 'production') return runProduction(dryRun);
  if (action === 'settle') return runSettle(dryRun);
  return runPropose(dryRun);
}

main().catch((err) => {
  console.error('resolve keeper failed:', err.shortMessage || err.message);
  process.exitCode = 1;
});
