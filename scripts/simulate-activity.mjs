// Generates realistic on-chain trading flow across the deployed Kickoff markets (v2
// CATEGORICAL) to create genuine volume during the hackathon window. For each sim
// wallet it mints + approves MockUSDC, then runs randomized small buys/sells, each on
// a random outcome in [0, outcomeCount-1] of a random market, with slippage bounds.
// Sequential with small delays. Prints OKLink testnet tx links.
//
//   DRY_RUN=1 node simulate-activity.mjs   # plan only, no broadcast
//   node simulate-activity.mjs             # broadcast (needs SIM_PKS + addresses)
//
// Required env (broadcast): RPC_URL, CHAIN_ID, USDC, CONDITIONAL_TOKENS, SIM_PKS
// Optional: SIM_ROUNDS (default 6), SIM_MINT_USDC (default 500),
//           SIM_MIN_TRADE_USDC (default 2), SIM_MAX_TRADE_USDC (default 25),
//           SIM_DELAY_MS (default 1500)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseUnits, formatUnits } from 'viem';
import {
  getPublicClient,
  getWalletClient,
  envAddress,
  isDryRun,
  addressFromPk,
  normalizePk,
  txLink,
} from './lib/chain.mjs';
import { marketAbi, mockUsdcAbi, conditionalTokensAbi } from './lib/abis.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'data');

const DEC = 6;
const ROUNDS = Number(process.env.SIM_ROUNDS || 6);
const MINT_AMOUNT = parseUnits(process.env.SIM_MINT_USDC || '500', DEC);
const MIN_TRADE = parseUnits(process.env.SIM_MIN_TRADE_USDC || '2', DEC);
const MAX_TRADE = parseUnits(process.env.SIM_MAX_TRADE_USDC || '25', DEC);
const DELAY_MS = Number(process.env.SIM_DELAY_MS || 1500);
const SLIPPAGE_BPS = 500n; // 5% — sim wallets tolerate more slippage than the opening line

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Random USDC trade size in [MIN_TRADE, MAX_TRADE], in 0.1-USDC steps.
function randomTradeAmount() {
  const lo = Number(MIN_TRADE / 100000n);
  const hi = Number(MAX_TRADE / 100000n);
  const tenths = randInt(lo, hi);
  return BigInt(tenths) * 100000n;
}

function parseSimPks() {
  const raw = process.env.SIM_PKS || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean).map(normalizePk);
}

function loadDeployedMarkets() {
  const path = resolve(dataDir, 'deployed-markets.json');
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    const all = parsed.markets || [];
    const live = all.filter((m) => m.market && m.conditionId && Number(m.outcomeCount) >= 2);
    return { all, live };
  } catch {
    return { all: [], live: [] };
  }
}

// Outcome label for logs, falling back to the index when labels are missing.
function labelOf(m, idx) {
  return (Array.isArray(m.outcomeLabels) && m.outcomeLabels[idx]) || `#${idx}`;
}

async function main() {
  const dryRun = isDryRun();
  const opts = { dryRun };

  const usdc = envAddress('USDC', opts);
  const conditionalTokens = envAddress('CONDITIONAL_TOKENS', opts);
  const simPks = parseSimPks();
  const { all, live } = loadDeployedMarkets();

  console.log(`Mode: ${dryRun ? 'DRY RUN (no broadcast)' : 'BROADCAST'}`);
  console.log(`Sim wallets: ${simPks.length}`);
  console.log(`Markets available: ${all.length} (live with addresses: ${live.length})`);
  console.log(`Rounds/wallet: ${ROUNDS}, trade range: ${formatUnits(MIN_TRADE, DEC)}-${formatUnits(MAX_TRADE, DEC)} USDC, delay: ${DELAY_MS}ms\n`);

  if (simPks.length === 0) {
    console.log('No SIM_PKS set.' + (dryRun ? ' (dry-run: planning with 2 placeholder wallets)\n' : ''));
    if (!dryRun) throw new Error('Broadcast mode needs SIM_PKS (comma-separated private keys).');
  }

  const marketPool = dryRun && live.length === 0 ? all : live;
  if (marketPool.length === 0) {
    if (dryRun) {
      console.log('No markets in data/deployed-markets.json yet — run create-markets.mjs first.');
      console.log('[dry-run] Planning flow against a single 3-outcome placeholder market.\n');
    } else {
      throw new Error('No live markets in data/deployed-markets.json — run create-markets.mjs first.');
    }
  }

  const planPool = marketPool.length
    ? marketPool
    : [{ title: 'PLACEHOLDER 1X2', category: '1x2', outcomeCount: 3, outcomeLabels: ['Home', 'Draw', 'Away'], market: null, conditionId: null }];
  const walletList = simPks.length ? simPks : dryRun ? ['0x' + '1'.repeat(64), '0x' + '2'.repeat(64)] : [];

  const publicClient = dryRun ? null : getPublicClient();
  let txCount = 0;

  for (let w = 0; w < walletList.length; w++) {
    const pk = walletList[w];
    const addr = addressFromPk(pk);
    const wallet = dryRun ? null : getWalletClient(pk);
    console.log(`### Wallet ${w + 1}/${walletList.length}: ${addr}`);

    if (dryRun) {
      console.log(`  [dry-run] usdc.mint(${addr}, ${formatUnits(MINT_AMOUNT, DEC)})`);
      console.log(`  [dry-run] usdc.approve(<each market>, max) before buying`);
      console.log(`  [dry-run] ct.setApprovalForAll(<each market>, true) before selling`);
    } else {
      const mintHash = await wallet.writeContract({ address: usdc, abi: mockUsdcAbi, functionName: 'mint', args: [addr, MINT_AMOUNT] });
      await publicClient.waitForTransactionReceipt({ hash: mintHash });
      console.log(`  minted ${formatUnits(MINT_AMOUNT, DEC)} USDC: ${txLink(mintHash)}`);
      txCount++;
    }

    const approvedMarkets = new Set();
    const ctApproved = new Set();

    for (let round = 0; round < ROUNDS; round++) {
      const m = pick(planPool);
      const n = Math.max(2, Number(m.outcomeCount) || 2);
      const outcome = randInt(0, n - 1); // any outcome of a categorical market
      const side = Math.random() < 0.7 ? 'buy' : 'sell'; // mostly buys; some sells
      const amount = randomTradeAmount();
      const oLabel = labelOf(m, outcome);

      if (dryRun) {
        console.log(`  [dry-run] round ${round + 1}: ${side} "${oLabel}" (outcome ${outcome}/${n}) on ${m.title} for ${formatUnits(amount, DEC)} USDC (5% slippage)`);
        continue;
      }

      try {
        if (side === 'buy') {
          if (!approvedMarkets.has(m.market)) {
            const ah = await wallet.writeContract({ address: usdc, abi: mockUsdcAbi, functionName: 'approve', args: [m.market, MINT_AMOUNT] });
            await publicClient.waitForTransactionReceipt({ hash: ah });
            approvedMarkets.add(m.market);
            txCount++;
          }
          const expectedOut = await publicClient.readContract({ address: m.market, abi: marketAbi, functionName: 'calcBuyAmount', args: [outcome, amount] });
          const minOut = (expectedOut * (10000n - SLIPPAGE_BPS)) / 10000n;
          const h = await wallet.writeContract({ address: m.market, abi: marketAbi, functionName: 'buy', args: [outcome, amount, minOut] });
          await publicClient.waitForTransactionReceipt({ hash: h });
          console.log(`  round ${round + 1}: buy "${oLabel}" on ${m.title} ${formatUnits(amount, DEC)} USDC -> ${txLink(h)}`);
          txCount++;
        } else {
          // Sell `amount` USDC worth back. Needs the CT operator approval first.
          if (!ctApproved.has(m.market)) {
            const sh = await wallet.writeContract({ address: conditionalTokens, abi: conditionalTokensAbi, functionName: 'setApprovalForAll', args: [m.market, true] });
            await publicClient.waitForTransactionReceipt({ hash: sh });
            ctApproved.add(m.market);
            txCount++;
          }
          const maxIn = await publicClient.readContract({ address: m.market, abi: marketAbi, functionName: 'calcSellAmount', args: [outcome, amount] });
          const maxInBuffered = (maxIn * (10000n + SLIPPAGE_BPS)) / 10000n;
          const h = await wallet.writeContract({ address: m.market, abi: marketAbi, functionName: 'sell', args: [outcome, amount, maxInBuffered] });
          await publicClient.waitForTransactionReceipt({ hash: h });
          console.log(`  round ${round + 1}: sell "${oLabel}" on ${m.title} ${formatUnits(amount, DEC)} USDC -> ${txLink(h)}`);
          txCount++;
        }
      } catch (err) {
        // A sell can revert if the wallet holds no shares of that outcome yet — that's
        // expected noise in a random walk. Log and keep going.
        console.log(`  round ${round + 1}: ${side} "${oLabel}" on ${m.title} skipped (${err.shortMessage || err.message})`);
      }

      await sleep(DELAY_MS);
    }
    console.log('');
  }

  console.log(dryRun ? 'Dry run complete (no transactions sent).' : `Done. Broadcast ${txCount} transactions.`);
}

main().catch((err) => {
  console.error('simulate-activity failed:', err.shortMessage || err.message);
  process.exitCode = 1;
});
