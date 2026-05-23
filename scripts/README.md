# Kickoff — off-chain scripts

Data, market seeding, activity simulation, and the resolution keeper for **Kickoff**,
a live FIFA World Cup 2026 prediction/trading dApp on **X Layer** (OKX OP Stack L2).

All scripts are Node.js ESM + [viem](https://viem.sh). Token amounts are `bigint`
(USDC is 6 decimals). Everything is **env-driven** — nothing about the chain or
contracts is hardcoded. Every broadcasting script supports a **dry run** that prints
intended calldata without sending a transaction or needing real keys/RPC.

## Setup

```bash
npm install
cp env-example .env      # then fill in .env (it is gitignored)
```

> `env-example` is the template (named without a leading dot because a local commit
> hook blocks writing `.env*` files). Copy it to `.env` and fill it in.

### Environment variables (`.env`)

| Var | Used by | Notes |
|---|---|---|
| `RPC_URL` | all | Defaults to `https://rpc.xlayer.tech` (X Layer mainnet). v2 testnet: `https://testrpc.xlayer.tech/terigon`. |
| `CHAIN_ID` | all | `196` = X Layer mainnet. v2 testnet = `1952`. Never hardcoded. |
| `FACTORY` | create, simulate | MarketMakerFactory address. v3 testnet `0x08A349C2e18Fb76AE022995A69fBB89c22d1c248`. |
| `USDC` | create, simulate, resolve | MockUSDC (6-dec) address. Also the OptimisticOracle **bond token**. v3 testnet `0xd347711C142720D949c2D96C3DD486F2423cEAF1`. |
| `CONDITIONAL_TOKENS` | create, simulate, resolve | ConditionalTokens (ERC1155) address. v3 testnet `0x846AA1261148F2b96f1f9E8441c25CDA8D9fcF58`. |
| `OPTIMISTIC_ORACLE` | resolve | OptimisticOracle address (propose/settle). v3 testnet `0xA82075EBEcDBe9B8478a75e764B4A465d2403fF9`. |
| `DEPLOYER_PK` | create | Factory owner; creates markets + seeds opening lines. |
| `ORACLE_PK` | resolve | OO proposer/settler. Must hold USDC to post the OO bond (the keeper auto-approves the OO for `bondAmount`). |
| `SIM_PKS` | simulate | Comma-separated funded private keys. |
| `APIFOOTBALL_KEY` | resolve (production) | Without it, production mode refuses to run. |
| `MATCH_LIMIT` | gen:markets | How many matches get per-match markets (default 8). `0` = all 104. |
| `MATCH_MARKETS` | gen:markets | Which per-match markets to emit: `1x2,ou25,btts` (default all three). |
| `ACTION` | resolve | `propose` (default) or `settle`. Or pass `--settle`. |
| `DRY_RUN` | create, simulate, resolve | `1`/`true` disables broadcasting. Or pass `--dry-run`. |

Optional tuning vars (with defaults) are documented in `env-example`.

**Keys are never logged or echoed.** They are read from `.env` only.

## Run order

```
1. npm run fetch:worldcup    # save data/worldcup-2026.json + print groups (already present)
2. npm run gen:markets       # build data/markets.json from worldcup-2026.json (MATCH_LIMIT caps matches)
3. npm run create:markets    # create + seed markets -> data/deployed-markets.json
4. npm run simulate          # generate on-chain trading volume
5. npm run resolve           # propose results to the Optimistic Oracle
6. ACTION=settle node keeper/resolve.mjs   # settle proposed results after OO liveness
```

Add `:dry` to steps 3–5 to preview without broadcasting
(`create:markets:dry`, `simulate:dry`, `resolve:dry`).

## Scripts

### `lib/gen-markets.mjs` — `npm run gen:markets`
Regenerates `data/markets.json` from `data/worldcup-2026.json` (openfootball, CC0) for
the **v2 categorical contracts**. `questionId = keccak256(utf8(seed))`, so output is
deterministic and idempotent. Each market carries `outcomeSlotCount`, `outcomeLabels`,
`category`, `title`, `metadataURI`, and `openingDistribution` (target opening line per
outcome; uniform unless specified). Coverage:

- **Per match** (capped by `MATCH_LIMIT`, default 8; `0` = all 104):
  - **1X2** (3 outcomes `[Home, Draw, Away]`),
  - **Over/Under 2.5** (2 outcomes `[Over, Under]`),
  - **BTTS** (2 outcomes `[Yes, No]`).
- **Per group** (all 12, A–L): **group-winner**, one outcome per team in group order.
- **Outright** (binary `[Yes, No]`): Spain (~21%), France (~20%), England (~15%),
  Brazil (~12%), Argentina (~11%), Field (~21%).
- **Golden Boot** (binary `[Yes, No]`): Mbappe (~16%), Kane (~14%), Haaland (~8%),
  Messi (~9%), Yamal (~6%), Field (~47%).

Full coverage (`MATCH_LIMIT=0`) yields **336 markets**: 104×3 match + 12 group + 6
outright + 6 golden-boot. The default cap (8 matches → 48 markets) keeps seeding
affordable. Missing/short fields (e.g. a fixture without team names) are skipped and
reported, never invented.

### `fetch-worldcup.mjs` — `npm run fetch:worldcup`
Fetches the openfootball World Cup 2026 schedule (CC0, **no API key**), saves it to
`data/worldcup-2026.json`, and prints the groups. Probes a small ordered list of likely
URLs and reports which one worked; if all fail it writes nothing and exits non-zero
(never invents data). The working source is
`https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`
(104 matches, 12 groups).

### `create-markets.mjs` — `npm run create:markets` (`:dry`)
Reads `data/markets.json` + addresses from env, then for each market:
1. `factory.createMarket(USDC, questionId, outcomeSlotCount, metadataURI)` — reads the
   `market` + `conditionId` back from the `MarketCreated` event,
2. `addLiquidity(SEED_LIQUIDITY)`,
3. **opening-line buys**: splits `OPENING_BUY_USDC` across the outcomes by their target
   `openingDistribution` (uniform if none) and does one slippage-bounded (3%) `buy()`
   per outcome, nudging prices toward the target.

Writes `outcomeCount`, `outcomeLabels`, `market`, `conditionId` + tx hashes per market
to `data/deployed-markets.json` (and `optimisticOracle` from env). Tunable via
`SEED_LIQUIDITY_USDC` (default 1000) and `OPENING_BUY_USDC` (default 50). Set
`MINT_TEST_USDC=1` to mint MockUSDC to the deployer on testnet. Prints OKLink links.

### `simulate-activity.mjs` — `npm run simulate` (`:dry`)
Given `SIM_PKS`, generates realistic randomized buy/sell flow across the deployed
**categorical** markets to create genuine on-chain volume. For each wallet it first
mints + approves MockUSDC, then runs `SIM_ROUNDS` randomized trades — each on a random
outcome in `[0, outcomeCount-1]` (read from `deployed-markets.json`) of a random market,
mostly buys, small USDC sizes, 5% slippage bounds, sequentially with a delay between
trades. Sells that revert because the wallet holds no shares yet are logged and skipped
(expected in a random walk). Prints OKLink tx links. Tunable via `SIM_ROUNDS`,
`SIM_MINT_USDC`, `SIM_MIN_TRADE_USDC`, `SIM_MAX_TRADE_USDC`, `SIM_DELAY_MS`.

### `keeper/resolve.mjs` — `npm run resolve` (`:dry`)
The resolution keeper, on the **OptimisticOracle**. Resolution is two-phase:

1. **propose** (`ACTION=propose`, default): for each unresolved condition, approve the OO
   for its `bondAmount` (paid in the bond token == USDC collateral), then
   `oo.propose(conditionId, payouts)`. This starts the liveness clock.
2. **settle** (`ACTION=settle` or `--settle`): after liveness, `oo.settle(conditionId)`
   for any `Proposed` + undisputed condition (settle writes the payouts onto the CT).

Payouts are a **one-hot** `uint256[]` of length `outcomeCount` (winning index = 1).
Outcome count is read on-chain via `getOutcomeSlotCount` (falls back to `outcomeCount`
in `results.json` for dry-run).

- **`MODE=simulated`** (default): reads `data/results.json` (per condition:
  `conditionId`, `outcomeCount`, `winningOutcome` index) and one-hots the payouts. Skips
  conditions already `Resolved`, still `None`, or already proposed.
- **`MODE=production`**: skeleton that reads API-FOOTBALL fixtures
  (`league=1&season=2026`). The HTTP call is gated on `APIFOOTBALL_KEY` and will not fire
  without it. Final scores map to 1X2/OU2.5/BTTS winning indices via `deriveOutcomes()`;
  group-winner/outright/golden-boot need a curated mapping you wire before going live, so
  the skeleton stops short of auto-proposing those.

Example settle run: `ACTION=settle node keeper/resolve.mjs` (or `node keeper/resolve.mjs --settle`).

## Data files (`../data/`)

| File | Produced by | Purpose |
|---|---|---|
| `markets.json` | `gen-markets.mjs` | Seed market definitions: `outcomeSlotCount`, `outcomeLabels`, `category`, `openingDistribution` (committed). |
| `worldcup-2026.json` | `fetch-worldcup.mjs` | openfootball schedule snapshot (104 matches, 12 groups). |
| `deployed-markets.json` | `create-markets.mjs` | Per market: `outcomeCount`, `outcomeLabels`, `market`, `conditionId`, tx hashes (filled on broadcast). |
| `results.json` | hand-edited (demo provided) | Per condition: `conditionId`, `outcomeCount`, `winningOutcome` index for the simulated keeper. **Replace the conditionIds with the current ones from `deployed-markets.json` before resolving.** |
| `results.example.json` | committed template | Shape reference (1X2 / group-winner / outright examples). |

## Notes / assumptions

- ABIs in `lib/abis.mjs` are minimal hand-written stubs covering only the called
  functions, with signatures verified against the Foundry artifacts in
  `../contracts/out/*.sol/*.json` (the `abi` field).
- viem ships an `xLayer` chain (id 196) but its bundled RPC is `xlayerrpc.okx.com`;
  `lib/chain.mjs` always lets `RPC_URL` win and defaults to `rpc.xlayer.tech`.
- Liquidity seeding assumes `addLiquidity` opens a uniform AMM and the per-outcome
  opening buys move prices toward `openingDistribution`.
- The OO bond is paid in the **bond token == USDC collateral**; the proposer must hold
  and approve `bondAmount` USDC before proposing (the keeper auto-approves).

Validate all scripts parse: `npm run check`.
