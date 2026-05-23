# Kickoff

**Trade the beautiful game — live, on-chain.**

Kickoff is a live FIFA World Cup 2026 prediction & trading dApp on **X Layer**, OKX's OP Stack L2. It runs continuously-tradeable, World-Cup-native markets where anyone can take a position on tournament outcomes *right now* — months before the result is known — and exit, hedge, or scale that position at any time against a live automated market maker.

Markets are **categorical** (N-outcome): a 1X2 match-result market has three outcomes (Home / Draw / Away), a group-winner market has one outcome per team, and the implied probabilities across a market sum to ~100%. Markets settle on the **real** result when it happens (June–July 2026) through a **bonded optimistic oracle** — propose, dispute, settle, all on-chain. In the hackathon demo, the proposed result is a **clearly-labeled simulated resolution** so the full lifecycle (trade → propose → settle → redeem) is demonstrable today.

---

## Why Kickoff

- **World-Cup-native.** Not a general prediction market with a sports tab bolted on. Every market, the seed liquidity, and the resolution feed are built around WC 2026 (48 teams, 16 host cities across USA / Canada / Mexico, 104 matches, group stage Jun 11–27, final Jul 19).
- **The only live, continuously-tradeable WC market on X Layer.** Positions are priced by a categorical constant-product AMM, so they trade like a live order book without needing one — buy/sell any time, price moves with flow.
- **Trustless resolution.** No single key decides outcomes. A bonded optimistic oracle lets anyone propose a result and anyone dispute it; the deployment revokes the deployer's direct resolver role so the oracle is the *sole* settlement path.
- **Built for the metric OKX rewards.** The World Cup is one of the largest recurring traffic events on earth. Kickoff is a funnel that converts that attention into **on-chain transactions and new X Layer users** — every trade is a transaction, every trader is an OKX-ecosystem wallet.
- **OKX-ecosystem first.** OKX Wallet for connection, **OKB for gas**, sub-cent fees on X Layer, OKLink for verifiable on-chain proof, OKX on-ramp for fiat.

### How it differs from existing prediction markets

| | Kickoff | Polymarket | Azuro / Overtime / SX Bet |
|---|---|---|---|
| Chain | **X Layer (196)** | Polygon | Gnosis / Optimism / various |
| Mechanism | **Live categorical AMM (CPMM)** | Central order book | Pool / order-book hybrids |
| Focus | **World Cup 2026** | General | General sportsbook |
| Resolution | **Bonded optimistic oracle** | Centralized / UMA | Centralized feeds |
| Ecosystem | **OKX (Wallet, OKB gas)** | — | — |

---

## How it works

Kickoff is a general **Fixed-Product Market Maker (FPMM)** design in the lineage of Gnosis / Polymarket, generalized to **categorical (N-outcome) World Cup markets** (2..16 outcomes per market).

1. **Conditional tokens.** Each market is a question with **N outcome slots** — represented as ERC-1155 conditional token positions. Collateral (USDC) is **split** into a complete set (one share of *every* outcome) and **merged** back the same way; one complete set is always redeemable 1:1 for collateral. Shares are minted 1:1 from collateral, so they carry USDC's **6 decimals**.
2. **USDC collateral.** All markets are collateralized in USDC (`MockUSDC`, a 6-decimal open-faucet token, on testnet; real USDC on mainnet). Prices are 1e18-scaled implied probabilities.
3. **Live categorical AMM trading.** Each market has its own **minimal-proxy AMM clone** (a `FixedProductMarketMaker` deployed by `MarketMakerFactory`). Traders buy and sell outcome shares against the pool at any time. `getReserves()` and `prices()` return **arrays** over the N outcomes; `prices()` returns 1e18-scaled implied probabilities that **sum to ~1** (the market's implied probability for each outcome). A fee (in basis points) accrues to liquidity providers.
4. **Bonded optimistic resolution.** When the real-world result is known, **anyone** proposes the winning outcome on-chain and posts a **bond**; a liveness window opens. If undisputed, **anyone** settles it, writing the payouts on-chain (append-only). A disputer can post an equal bond, in which case an **arbiter** (a Safe in v1) resolves the dispute — bonds go to whichever side the written result agrees with. Holders of winning shares **redeem** for full collateral. The deployment **revokes the deployer's direct resolver role**, so the optimistic oracle is the only way a market resolves.

### Market types

| Type | Outcomes |
|---|---|
| 1X2 match result | 3 — Home / Draw / Away |
| Over/Under 2.5 goals | 2 |
| Both-Teams-To-Score | 2 |
| Group winner | one outcome per team in the group |
| Outright winner | binary Yes / No |
| Golden Boot | binary Yes / No |

Probabilities within a categorical market sum to ~100%.

> **What's real vs simulated.** *Trading is real, on-chain, and verifiable now* — every buy / sell / split / merge is a live transaction on X Layer with an OKLink link. The *result feed is simulated until the tournament* (demo data from `openfootball/worldcup.json`, CC0). The keeper **proposes** the simulated result to the optimistic oracle, the liveness window elapses, and the market is **settled** on-chain — an explicitly-labeled simulated settlement so the resolve→redeem path is fully demonstrable before a single match is played. Production resolution reads API-FOOTBALL (league=1, season=2026).

---

## Architecture overview

```
                    OKX Wallet (OKB gas)
                            |
                    web/  (Next.js dApp)
                            |
            ┌───────────────┴───────────────┐
            |                                 |
   MarketMakerFactory ──clones──> FixedProductMarketMaker (one per market, EIP-1167)
            |                                 |
            └──────────> ConditionalTokens <──┘  (ERC-1155 outcome shares)
                            |
                        MockUSDC (collateral, testnet)
                            ^
                    OptimisticOracle (propose / dispute / settle, sole resolver)
                            ^
                  keeper: openfootball (demo) / API-FOOTBALL (prod)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the categorical CPMM math, conditional-token mechanics, the optimistic-oracle lifecycle, and the resolution/keeper design. Security posture and roadmap are in [`docs/SECURITY.md`](docs/SECURITY.md) and [`docs/ROADMAP.md`](docs/ROADMAP.md).

### Contracts

| Contract | Role |
|---|---|
| `ConditionalTokens` | ERC-1155 outcome shares; split / merge / redeem; condition prepare & append-only resolution |
| `MarketMakerFactory` | Deploys one EIP-1167 minimal-proxy `FixedProductMarketMaker` clone per market |
| `FixedProductMarketMaker` | Per-market categorical CPMM; buy / sell over N outcomes, array `getReserves()` / `prices()`, fee in bps |
| `OptimisticOracle` | Bonded propose / dispute / settle / resolveDispute / cancelProposal; sole resolution path |
| `MockUSDC` | 6-decimal open-faucet stablecoin for testnet collateral |

Stack: **Solidity 0.8.26**, **OpenZeppelin v5.6.1**, **Foundry**. **43 Foundry tests** green — categorical lifecycle, fuzz no-free-money (binary + categorical), and the full optimistic-oracle propose/dispute/settle/resolve/cancel cycle.

### Seed markets

The off-chain generator (`scripts/`) produces categorical World Cup markets across all market types — 1X2 match result, Over/Under 2.5, Both-Teams-To-Score, group winner, outright winner, and Golden Boot. The default cap seeds **48 markets**; full coverage of all **104 matches** scales up to **336 markets**. The hardened testnet deploy is seeded with **9 categorical markets** (including a 1X2 3-way and a group-winner 4-way) for the demo.

---

## Monorepo layout

```
kickoff/
├── contracts/   Foundry project — Solidity contracts, tests, deploy scripts (deps vendored)
├── web/         Next.js dApp — OKX Wallet connect, categorical N-outcome UI, trade flow
├── scripts/     Market generator, simulate-activity volume tool, resolution keeper
├── data/        openfootball/worldcup.json (demo) + results.json (simulated keeper feed)
└── docs/        Architecture, security, roadmap, demo script, submission, X content
```

---

## Quickstart

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) (`forge`, `cast`, `anvil`)
- Node.js 18+ and npm
- An OKX Wallet (or any EVM wallet) with X Layer testnet OKB for gas

### Clone

```bash
git clone <REPO_URL> kickoff
cd kickoff
```

> **Dependencies are vendored** — `contracts/lib/` (forge-std, openzeppelin-contracts v5.6.1) is committed directly, **not** wired as git submodules. A plain `git clone` gives you everything; you do **not** need `git submodule update --init`.

### Contracts (Foundry)

```bash
cd contracts
forge build
forge test
```

### Web (dApp)

```bash
cd web
npm install
npm run dev
```

The dApp serves on `http://localhost:3000` by default and is env-driven against the hardened v2 testnet deployment (addresses below).

---

## Environment variables

Copy `.env.example` to `.env` in each package and fill in. Never commit `.env`.

**`contracts/.env`**

| Var | Description |
|---|---|
| `RPC_URL` | X Layer RPC, e.g. testnet `https://testrpc.xlayer.tech/terigon` |
| `PRIVATE_KEY` | Deployer key (testnet first; never a key with real funds in dev) |
| `OKLINK_API_KEY` | For contract verification on OKLink (optional) |

**`web/.env`**

| Var | Description |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `1952` for X Layer testnet, `196` for mainnet |
| `NEXT_PUBLIC_RPC_URL` | `https://testrpc.xlayer.tech/terigon` (testnet) |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Deployed `MarketMakerFactory` address |
| `NEXT_PUBLIC_CONDITIONAL_TOKENS_ADDRESS` | Deployed `ConditionalTokens` address |
| `NEXT_PUBLIC_ORACLE_ADDRESS` | Deployed `OptimisticOracle` address |
| `NEXT_PUBLIC_USDC_ADDRESS` | Collateral token address |

**`scripts/.env`** (keeper) — `API_FOOTBALL_KEY` gates the production resolution feed; without it the keeper runs in SIMULATED mode from `data/results.json`.

---

## X Layer deployment notes

X Layer is OKX's OP Stack L2. Gas is paid in **OKB**, not ETH.

| | Testnet | Mainnet |
|---|---|---|
| Chain ID | `1952` | `196` |
| RPC | `https://testrpc.xlayer.tech/terigon` | `https://rpc.xlayer.tech` |
| Explorer | [OKLink xLayer test](https://www.oklink.com/xlayer-test) | [OKLink xLayer](https://www.oklink.com/xlayer) |
| Gas token | OKB | OKB |
| Collateral | `MockUSDC` (open faucet) | real USDC `0x74b7F16337b8972027F6196A17a631aC6dE26d22` |

Deploy with the Foundry script (testnet first). The script **revokes the deployer's resolver role by default** so the optimistic oracle is the sole resolution path:

```bash
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

### Deployed addresses — v3 (funded LP + parlays, X Layer testnet, chain 1952)

| Contract | Address |
|---|---|
| `MarketMakerFactory` | `0x08A349C2e18Fb76AE022995A69fBB89c22d1c248` |
| `ConditionalTokens` | `0x846AA1261148F2b96f1f9E8441c25CDA8D9fcF58` |
| `OptimisticOracle` | `0xA82075EBEcDBe9B8478a75e764B4A465d2403fF9` |
| `ParlayBook` | `0xF323A948440aD9c851fD8d2846184175fB4ef44a` |
| `MockUSDC` | `0xd347711C142720D949c2D96C3DD486F2423cEAF1` |
| `FixedProductMarketMaker` (implementation) | `0x4d12be7950e24867F4F8c8ED399CD7B21b5A66C5` |

**On-chain proof (testnet):** 12 categorical markets seeded (incl. 1X2 3-way and group-winner 4-way), real trading volume from 7 distinct trader wallets, a full **propose → 120s liveness → settle** oracle cycle that resolved conditions, plus a public-LP funding lifecycle (add/remove liquidity, pro-rata fee accrual) and a house-backed parlay book. The deployer's resolver role is **revoked** — verified on-chain that only the oracle resolves. Browse on [OKLink xLayer test](https://www.oklink.com/xlayer-test).

**Mainnet (chain 196)** is supported by the same code against real USDC (`0x74b7F16337b8972027F6196A17a631aC6dE26d22`) but is **not yet deployed** — gated behind an independent third-party audit (see [`docs/ROADMAP.md`](docs/ROADMAP.md)).

---

## What's real vs simulated · what's gated (honest scope)

- **Real, on-chain, now (testnet):** market creation, USDC collateralization, split / merge, **live categorical AMM buy & sell**, fees, redemption, and the **bonded optimistic-oracle resolution cycle** (propose → liveness → settle) — all on X Layer, all verifiable on OKLink.
- **Simulated until the tournament:** the match-result feed. WC 2026 group stage starts Jun 11, 2026; final is Jul 19, 2026. The keeper **proposes** results from `openfootball/worldcup.json` (CC0) data, **labeled as simulated** in the UI. Production swaps in API-FOOTBALL (league=1, season=2026) for live results.
- **Gated (not yet live):** mainnet deployment, independent third-party audit, the API-FOOTBALL production key, ERC-4337 / OKX smart-account (account-abstraction) login, and fiat→USDC on-ramp at scale — all tracked in [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## License

See `LICENSE`. Resolution demo data from `openfootball/worldcup.json` (CC0).
