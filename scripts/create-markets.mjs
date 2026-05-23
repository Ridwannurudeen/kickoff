// Creates the Kickoff seed markets on X Layer from data/markets.json (v2 CATEGORICAL
// contracts), then seeds each one with initial liquidity and runs opening-line buys
// per outcome to nudge it toward its target distribution. Writes the results to
// data/deployed-markets.json.
//
//   DRY_RUN=1 node create-markets.mjs   # log calldata only, no broadcast
//   node create-markets.mjs             # broadcast (needs DEPLOYER_PK + addresses)
//
// Required env (broadcast): RPC_URL, CHAIN_ID, FACTORY, USDC, CONDITIONAL_TOKENS, DEPLOYER_PK
// Optional: SEED_LIQUIDITY_USDC (default 1000), OPENING_BUY_USDC (default 50, total
//           opening budget per market split across outcomes by target distribution),
//           MINT_TEST_USDC (1 to mint MockUSDC to the deployer on testnet)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseUnits, formatUnits, parseEventLogs } from 'viem';
import {
  getPublicClient,
  getWalletClient,
  envAddress,
  isDryRun,
  addressFromPk,
  txLink,
  addressLink,
} from './lib/chain.mjs';
import { factoryAbi, marketAbi, mockUsdcAbi } from './lib/abis.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'data');

const DEC = 6;
const SEED_LIQUIDITY = parseUnits(process.env.SEED_LIQUIDITY_USDC || '1000', DEC);
const OPENING_BUY = parseUnits(process.env.OPENING_BUY_USDC || '50', DEC);
const SLIPPAGE_BPS = 300n; // 3% slippage tolerance on the opening buys

function loadMarkets() {
  const raw = JSON.parse(readFileSync(resolve(dataDir, 'markets.json'), 'utf8'));
  if (!Array.isArray(raw.markets)) throw new Error('markets.json has no `markets` array — run gen:markets first.');
  return raw.markets;
}

// Split OPENING_BUY across outcomes by the target distribution (uniform if none).
// Returns a uint256[] of per-outcome USDC budgets (6-dec), summing <= OPENING_BUY.
function openingBudgets(m) {
  const n = m.outcomeSlotCount;
  const dist =
    Array.isArray(m.openingDistribution) && m.openingDistribution.length === n
      ? m.openingDistribution
      : Array.from({ length: n }, () => 1 / n);
  const sum = dist.reduce((a, b) => a + b, 0) || 1;
  return dist.map((w) => (OPENING_BUY * BigInt(Math.round((w / sum) * 1_000_000))) / 1_000_000n);
}

async function main() {
  const dryRun = isDryRun();
  const opts = { dryRun };

  const factory = envAddress('FACTORY', opts);
  const usdc = envAddress('USDC', opts);
  const conditionalTokens = envAddress('CONDITIONAL_TOKENS', opts);
  const deployerPk = process.env.DEPLOYER_PK || null;
  const deployer = addressFromPk(deployerPk);

  if (!dryRun && (!factory || !usdc || !conditionalTokens || !deployerPk)) {
    throw new Error('Broadcast mode needs FACTORY, USDC, CONDITIONAL_TOKENS and DEPLOYER_PK in env.');
  }

  const markets = loadMarkets();

  console.log(`Mode: ${dryRun ? 'DRY RUN (no broadcast)' : 'BROADCAST'}`);
  console.log(`Factory: ${factory || '<unset>'}`);
  console.log(`USDC:    ${usdc || '<unset>'}`);
  console.log(`CT:      ${conditionalTokens || '<unset>'}`);
  console.log(`Deployer:${deployer ? ' ' + deployer : ' <unset>'}`);
  console.log(`Markets to create: ${markets.length}`);
  console.log(`Seed liquidity / market: ${formatUnits(SEED_LIQUIDITY, DEC)} USDC`);
  console.log(`Opening buy budget / market: ${formatUnits(OPENING_BUY, DEC)} USDC (split across outcomes)\n`);

  const publicClient = dryRun ? null : getPublicClient();
  const wallet = dryRun ? null : getWalletClient(deployerPk);

  // Total collateral we'll spend: liquidity + opening buys per market.
  const totalSpend = (SEED_LIQUIDITY + OPENING_BUY) * BigInt(markets.length);

  // On testnet the collateral is MockUSDC (open faucet). Mint what the deployer needs.
  // On mainnet leave MINT_TEST_USDC unset — the deployer must already hold real USDC.
  const mintTest = process.env.MINT_TEST_USDC === '1' || process.env.MINT_TEST_USDC === 'true';
  if (!dryRun && mintTest) {
    console.log(`Minting ${formatUnits(totalSpend, DEC)} test USDC to the deployer...`);
    const mintHash = await wallet.writeContract({ address: usdc, abi: mockUsdcAbi, functionName: 'mint', args: [deployer, totalSpend] });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    console.log(`  minted: ${txLink(mintHash)}\n`);
  } else if (dryRun) {
    console.log(`[dry-run] (set MINT_TEST_USDC=1 to mint ${formatUnits(totalSpend, DEC)} test USDC to the deployer)\n`);
  }

  const deployed = [];
  for (const m of markets) {
    const budgets = openingBudgets(m);
    console.log(`--- ${m.title} (${m.category}, ${m.outcomeSlotCount} outcomes) ---`);
    console.log(`  questionId: ${m.questionId}`);
    console.log(`  outcomes: [${m.outcomeLabels.join(', ')}]`);
    console.log(`  opening buys: ${budgets.map((b, i) => `${m.outcomeLabels[i]}=${formatUnits(b, DEC)}`).join(', ')} USDC`);

    if (dryRun) {
      console.log(`  [dry-run] factory.createMarket(${usdc || '<USDC>'}, ${m.questionId}, ${m.outcomeSlotCount}, "${m.metadataURI}")`);
      console.log(`  [dry-run] then addLiquidity(${formatUnits(SEED_LIQUIDITY, DEC)} USDC), then buy() each outcome by its budget\n`);
      deployed.push({
        category: m.category,
        title: m.title,
        questionId: m.questionId,
        outcomeCount: m.outcomeSlotCount,
        outcomeLabels: m.outcomeLabels,
        openingDistribution: m.openingDistribution || null,
        market: null,
        conditionId: null,
        dryRun: true,
      });
      continue;
    }

    // 1) Create the market — read market + conditionId from the MarketCreated event.
    const createHash = await wallet.writeContract({
      address: factory,
      abi: factoryAbi,
      functionName: 'createMarket',
      args: [usdc, m.questionId, m.outcomeSlotCount, m.metadataURI],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
    const events = parseEventLogs({ abi: factoryAbi, eventName: 'MarketCreated', logs: receipt.logs });
    if (events.length === 0) throw new Error(`No MarketCreated event in tx ${createHash}`);
    const marketAddr = events[0].args.market;
    const conditionId = events[0].args.conditionId;
    console.log(`  created: ${txLink(createHash)}`);
    console.log(`  market: ${addressLink(marketAddr)}`);
    console.log(`  conditionId: ${conditionId}`);

    // 2) Approve the market for liquidity + all opening buys, then seed liquidity.
    //    addLiquidity opens a uniform AMM; the per-outcome buys then move the prices.
    const totalBudget = budgets.reduce((a, b) => a + b, 0n);
    const approveHash = await wallet.writeContract({
      address: usdc,
      abi: mockUsdcAbi,
      functionName: 'approve',
      args: [marketAddr, SEED_LIQUIDITY + totalBudget],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const addLiqHash = await wallet.writeContract({ address: marketAddr, abi: marketAbi, functionName: 'addLiquidity', args: [SEED_LIQUIDITY] });
    await publicClient.waitForTransactionReceipt({ hash: addLiqHash });
    console.log(`  liquidity: +${formatUnits(SEED_LIQUIDITY, DEC)} USDC`);

    // 3) Opening-line buys: one buy per outcome with a slippage-bounded minOut.
    const buyTxs = [];
    for (let i = 0; i < m.outcomeSlotCount; i++) {
      const amount = budgets[i];
      if (amount === 0n) continue;
      const expectedOut = await publicClient.readContract({ address: marketAddr, abi: marketAbi, functionName: 'calcBuyAmount', args: [i, amount] });
      const minOut = (expectedOut * (10000n - SLIPPAGE_BPS)) / 10000n;
      const buyHash = await wallet.writeContract({ address: marketAddr, abi: marketAbi, functionName: 'buy', args: [i, amount, minOut] });
      await publicClient.waitForTransactionReceipt({ hash: buyHash });
      buyTxs.push({ outcome: i, label: m.outcomeLabels[i], tx: buyHash });
      console.log(`    buy ${m.outcomeLabels[i]} ${formatUnits(amount, DEC)} USDC -> ${txLink(buyHash)}`);
    }
    console.log('');

    deployed.push({
      category: m.category,
      title: m.title,
      questionId: m.questionId,
      outcomeCount: m.outcomeSlotCount,
      outcomeLabels: m.outcomeLabels,
      openingDistribution: m.openingDistribution || null,
      market: marketAddr,
      conditionId,
      createTx: createHash,
      openingBuyTxs: buyTxs,
      dryRun: false,
    });
  }

  const out = {
    generatedAt: new Date().toISOString(),
    chainId: Number(process.env.CHAIN_ID || 196),
    factory,
    usdc,
    conditionalTokens,
    optimisticOracle: process.env.OPTIMISTIC_ORACLE || null,
    dryRun,
    markets: deployed,
  };
  const dest = resolve(dataDir, 'deployed-markets.json');
  writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${deployed.length} entries to ${dest}`);
  if (dryRun) console.log('(dry-run: market/conditionId fields are null until you broadcast)');
}

main().catch((err) => {
  console.error('create-markets failed:', err.shortMessage || err.message);
  process.exitCode = 1;
});
