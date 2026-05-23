# Architecture

Kickoff is a general **Fixed-Product Market Maker (FPMM)** for **categorical (N-outcome) World Cup 2026 markets**, in the Gnosis / Polymarket lineage, deployed on X Layer. This document covers the categorical CPMM math, conditional-token mechanics, the bonded optimistic oracle, security posture, and the resolution/keeper design.

---

## 1. System components

```
                        OKX Wallet (OKB gas)
                                |
                        web/  (Next.js dApp)
                                |
          ┌─────────────────────┴─────────────────────┐
          |                                             |
 MarketMakerFactory ───clone (EIP-1167)──> FixedProductMarketMaker
          |                                             |
          └────────────────> ConditionalTokens <───────┘
                                |  (ERC-1155 outcome shares)
                            MockUSDC (collateral)
                                ^
                  OptimisticOracle (propose / dispute / settle — sole resolver)
                                ^
                keeper: openfootball (demo / CC0) · API-FOOTBALL (prod)
```

| Contract | Responsibility |
|---|---|
| `ConditionalTokens` | Holds collateral; mints/burns ERC-1155 outcome shares; prepares conditions; append-only result reporting; redemption |
| `MarketMakerFactory` | One transaction creates a condition + deploys a minimal-proxy AMM clone and seeds it |
| `FixedProductMarketMaker` | Per-market categorical constant-product AMM; `buy` / `sell` over N outcomes; array `getReserves()` / `prices()`; fee in bps |
| `OptimisticOracle` | Bonded propose / dispute / settle / resolveDispute / cancelProposal; the only path that resolves a condition |
| `MockUSDC` | 6-decimal open-faucet ERC-20, testnet collateral only |

The factory deploys each AMM as an **EIP-1167 minimal proxy** ("clone") pointing at a single implementation. One implementation, many cheap per-market instances — every World Cup market is its own pool with isolated reserves.

---

## 2. Conditional tokens (split / merge / redeem)

Each market is a **condition** with **N outcome slots** (2..16) for a categorical question. For example a 1X2 match-result market has three slots:

- slot 0 → `Home`
- slot 1 → `Draw`
- slot 2 → `Away`

A group-winner market has one slot per team; binary markets (outright winner, Golden Boot) are the N = 2 case.

The `IConditionalTokens` surface the AMM and factory rely on:

```solidity
function prepareCondition(address collateral, bytes32 questionId, uint8 outcomeSlotCount) returns (bytes32 conditionId);
function splitPosition(bytes32 conditionId, uint256 amount);
function mergePositions(bytes32 conditionId, uint256 amount);
function getPositionId(address collateral, bytes32 conditionId, uint8 outcomeIndex) pure returns (uint256);
function conditionStatus(bytes32 conditionId) view returns (uint8); // 0=None 1=Open 2=Resolved 3=Voided
function balanceOf(address account, uint256 id) view returns (uint256);
function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data);
```

### Split

`splitPosition(conditionId, amount)` pulls `amount` of collateral and mints `amount` of **every** outcome share to the caller. A "complete set" — one share of each of the N outcomes — is always backed 1:1 by one unit of collateral. Because shares are minted 1:1 from collateral, outcome shares carry **USDC's 6 decimals**.

```
collateral (amount)  →  outcome_0 (amount) + outcome_1 (amount) + … + outcome_{N-1} (amount)
```

### Merge

`mergePositions(conditionId, amount)` is the inverse: burn `amount` of every outcome share, return `amount` of collateral. This is what lets the AMM and arbitrageurs keep the complete-set invariant tight.

```
outcome_0 (amount) + … + outcome_{N-1} (amount)  →  collateral (amount)
```

### Redeem (after resolution)

Once the condition is `Resolved`, holders redeem winning shares against the on-chain payout vector. For an N-outcome market the payout vector has one entry per outcome (e.g. `[0, 0, 1]` for "Away won" in a 1X2 market); each winning share redeems for one unit of collateral and each losing share for zero. Position ids are deterministic via `getPositionId(collateral, conditionId, outcomeIndex)`, so the ERC-1155 id space is fully derivable off-chain for the UI.

---

## 3. Categorical FPMM math

Each `FixedProductMarketMaker` holds reserves of the outcome shares for one market. For an N-outcome market the AMM holds a reserve array `r[0..N-1]`. `getReserves()` returns this array; `prices()` returns the implied-probability array.

### Price = normalized inverse reserve

The instantaneous price (implied probability) of outcome `i` is its **inverse reserve** normalized over all outcomes:

```
price(i) = (1 / r[i]) / Σ_j (1 / r[j])
Σ_i price(i) = 1
```

`prices()` returns these as **1e18-scaled** values that **sum to ~1e18** (±rounding). Each price reads directly as the market's implied probability for that outcome — a 1X2 market showing `0.55 / 0.27 / 0.18` implies a 55% home win, 27% draw, 18% away win, summing to ~100%. The view uses a `1e36` reciprocal scale to avoid the overflow a naive product-of-reserves would hit at high outcome counts; trading math is exact and independent of this view.

### Constant-product trades

Trades preserve the constant product of the *post-trade* reserves (the standard Gnosis FPMM funding invariant), now over all N reserves. The `buy` / `sell` paths **loop over the N outcomes**:

- **Buying** outcome `i`: the trader sends collateral, which is split into a complete set; the AMM keeps the other `N-1` legs and returns extra `i` shares such that the product invariant holds. This **lowers** `r[i]` relative to the others, so `price(i)` rises — buying an outcome makes it more expensive, as expected.
- **Selling** outcome `i`: the trader returns `i` shares; the AMM gives back collateral by merging a complete set. `price(i)` falls.

The amount out solves the constant-product equation across the affected reserves; slippage grows with trade size relative to pool depth, which is why each market is seeded with its own liquidity. Both loops use `Math.mulDiv(..., Ceil)` (512-bit intermediates) so high-N buys and near-full-reserve sells revert cleanly rather than overflow-Panic, and intermediate products are bounded for the enforced **≤ 16 outcomes**.

### Fees (bps)

A trading fee is charged in **basis points** (`feeBps`, e.g. `100` = 1%). The fee is taken from the input on buys and accrues to liquidity providers proportional to their pool share. Fees never touch the complete-set / collateral invariant — they are a skim on flow, not on backing.

### Why an AMM (not an order book)

An AMM gives **continuous, always-on liquidity** with no counterparty matching. A trader can enter, exit, or flip a World Cup position at any second between now and the final, and the price moves smoothly with order flow. This is what makes Kickoff *live* and continuously tradeable — the key differentiator versus order-book venues.

---

## 4. Bonded optimistic oracle (sole resolution path)

Results are resolved by `OptimisticOracle`, a bonded optimistic design. There is no privileged "report the answer" call on the happy path — anyone can propose, anyone can dispute, anyone can settle.

### Lifecycle

1. **`propose(conditionId, payouts)`** — anyone proposes the winning payout vector and posts a **bond**. A liveness window opens. Each proposal **snapshots its bond and deadline**, so a later admin `setParams` change only affects *future* proposals, never a live one.
2. **`dispute(conditionId)`** — within the liveness window, anyone posts an **equal bond** to challenge the proposal, escalating it to the arbiter.
3. **`settle(conditionId)`** — after the window elapses **undisputed**, anyone settles: the oracle writes the proposed payouts to `ConditionalTokens` (append-only) and refunds the proposer's bond.
4. **`resolveDispute(conditionId, finalPayouts)`** — for a disputed proposal, the **arbiter** (a Safe in v1, `ARBITER_ROLE`) writes the final result. The bond winner is **derived** from whether `finalPayouts` equals the original proposal — the arbiter cannot write one side's result and pay the other. Bonds (proposer's + disputer's) go to whichever side the written result agrees with.
5. **`cancelProposal(conditionId)`** — an escape hatch: callable once the condition is no longer `Open` (resolved/voided out-of-band) or once `arbitrationWindow` (default 7d) has elapsed on a disputed proposal the arbiter never ruled on. It refunds all posted bonds and resets the proposal for re-proposal.

### Trust model

- **Happy path is permissionless and bonded** — propose → undisputed → settle never touches the arbiter.
- **The arbiter is the only privileged actor**, and only on disputes; in v1 it is a Safe/committee, with a roadmap to a decentralized dispute layer (UMA-style DVM / token-curated jurors) behind an identical interface.
- **Deployer resolver role revoked.** `Deploy.s.sol` **revokes the deployer's direct `ORACLE_ROLE` on `ConditionalTokens` by default** (opt-out `KEEP_ADMIN_ORACLE=1`), so the `OptimisticOracle` is the **sole** resolution path — no dual-path race where a key could front-run or override the oracle. This is verified on-chain on the hardened testnet deploy: only the oracle resolves conditions.

The `conditionStatus` enum (`0=None, 1=Open, 2=Resolved, 3=Voided`) is the single source of truth: trading is permitted while `Open`, redemption opens once `Resolved`, and `Voided` returns collateral to complete-set holders. Resolution is **append-only** — a condition resolves at most once and cannot be overwritten.

---

## 5. Security posture

- **Reentrancy guards.** External entry points that move value (`buy`, `sell`, `splitPosition`, `mergePositions`, redeem, and the oracle's propose/dispute/settle/cancel) are non-reentrant. ERC-1155 transfers invoke a receiver hook on the recipient, so guards plus CEI are mandatory, not optional.
- **Checks-Effects-Interactions.** Reserve/state updates are committed *before* token transfers in every value-moving function, so a malicious ERC-1155 receiver hook cannot observe or exploit stale state.
- **Collateral whitelist.** Markets accept only an approved collateral token. Fee-on-transfer / rebasing / malicious ERC-20s are rejected — they would break complete-set accounting and the bonded `2×` payout. FPMM additionally reads reserves from live ERC-1155 balances, so raw ERC-20 donations cannot move prices.
- **Bounded loops.** All iteration is bounded by `outcomeCount ≤ 16` (split / merge / redeem / buy / sell / prices). No loops over user-controlled-length arrays in hot paths, so no gas-griefing / out-of-gas DoS surface; `allMarkets` is never iterated on-chain.
- **Per-proposal snapshots.** The oracle snapshots each proposal's bond and deadline, so a mid-flight `setParams` cannot over-refund, strand escrow, or retroactively shorten a live dispute window.
- **Append-only resolution + single resolver.** Settled conditions are immutable (see §4), and the deployer's direct resolver role is revoked so the oracle is the only writer.
- **Pinned, vendored deps.** OpenZeppelin **v5.6.1** (`ERC20`, `AccessControl`, `Clones`/EIP-1167, reentrancy guard, `Math.mulDiv`), Solidity **0.8.26** with built-in checked arithmetic. Dependencies are **vendored** (committed in `contracts/lib/`), not floating submodules — the build is reproducible from a plain clone.
- **Testnet faucet is fenced.** `MockUSDC.mint` is open by design but is **testnet only**; mainnet uses real USDC and never deploys the faucet.

A full internal security review — including a second independent review of the v2 contracts with all findings fixed (43 Foundry tests green) — is in [`SECURITY.md`](SECURITY.md). The contracts are **not** third-party audited; an independent audit is a hard gate before mainnet (see [`ROADMAP.md`](ROADMAP.md)).

---

## 6. Resolution & keeper design

Two phases, matching the project's live-now / settle-later model:

### Phase A — live trading (now → match time)

Markets are `Open`. Traders buy/sell against the categorical AMM continuously. No oracle interaction. This is where the on-chain transaction volume — the metric OKX rewards — is generated.

### Phase B — settlement (result known)

1. The keeper polls the result source:
   - **Demo / pre-tournament:** `openfootball/worldcup.json` (CC0), via `data/results.json` in SIMULATED mode. The proposed result is **labeled "simulated"** in the UI so it is never confused with a real result.
   - **Production (Jun–Jul 2026):** API-FOOTBALL live fixtures/results (`league=1, season=2026`, key-gated PRODUCTION skeleton).
2. When a market's outcome is decided, the keeper **proposes** the payout vector to the `OptimisticOracle` and posts the bond. After the liveness window elapses undisputed, **anyone** (the keeper, in the demo) calls `settle`, writing the payouts to `ConditionalTokens`.
3. The dApp surfaces the resolution; winning-share holders **redeem** for collateral.

The keeper is **stateless and replaceable** — it only proposes; the trust anchor is the bonded optimistic oracle, not the keeper. Because resolution is append-only and the oracle is the sole resolver, a keeper bug cannot corrupt a settled market, only fail to propose one (recoverable by re-running, or via `cancelProposal` if a proposal needs unwinding).

### World Cup 2026 timeline (settlement windows)

| Event | Date |
|---|---|
| Group stage | Jun 11 – 27, 2026 |
| Final | Jul 19, 2026 |
| Hosts | USA · Canada · Mexico (16 cities, 48 teams, 104 matches) |

Match-result, Over/Under, Both-Teams-To-Score and group-winner markets settle as each fixture/group is decided; outright-winner and Golden-Boot markets settle after the final. The oracle resolves each market's payout vector once its question is decided.
