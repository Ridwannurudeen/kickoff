# Kickoff — Internal Security Review & Audit Prep

**Scope:** `ConditionalTokens`, `FixedProductMarketMaker` (categorical CPMM), `MarketMakerFactory`, `OptimisticOracle`, `MockUSDC` (testnet only). Solidity 0.8.26, OpenZeppelin v5.6.1, Foundry.

**Status:** internal review by the project team. **This is NOT a substitute for an independent third-party audit**, which is a hard gate before any mainnet deployment that holds real funds (see Phase 1 in [ROADMAP.md](ROADMAP.md)).

**Test coverage:** 40 Foundry tests green — categorical (2/3/N-outcome) lifecycle, fuzz no-free-money (binary + categorical), price bounds, solvency, access control, and the full optimistic-oracle propose/dispute/settle/resolve/cancel cycle.

---

## Methodology
Manual review against the standard EVM/DeFi threat model (reentrancy, rounding, solvency, access control, oracle trust, DoS, force-fed funds), plus property fuzzing for the AMM invariants. Findings are rated Critical / High / Medium / Low / Informational.

---

## Findings

### M-1 — Locked bonds if a condition is resolved/voided out-of-band — **FIXED**
If `ConditionalTokens.reportPayouts`/`voidCondition` was called directly (the deployer retains `ORACLE_ROLE`) while an `OptimisticOracle` proposal was live, `settle()` would revert forever (`reportPayouts` requires the condition Open) and the posted bond(s) would be stranded.
**Fix:** added `OptimisticOracle.cancelProposal(conditionId)` — permissionless, callable only once the condition is no longer Open; refunds the proposer (and disputer, if any). Covered by `test_cancelProposal_*`.
**Operational recommendation:** in production, **revoke the deployer's direct `ORACLE_ROLE`** so the oracle is the *only* resolution path, eliminating the dual-path race entirely.

### M-2 — Arbiter centralization in dispute resolution — **Accepted (v1), documented**
`resolveDispute` is gated to `ARBITER_ROLE`. In v1 this is a Safe/committee that is trusted to rule honestly on disputes. This is the documented v1 trust assumption; the happy path (propose → undisputed → settle) is permissionless and bonded.
**Mitigations:** multisig arbiter; every action emits events (auditable); the optimistic design means honest, undisputed results never touch the arbiter.
**Roadmap:** replace with a decentralized dispute layer (UMA-style DVM / token-curated jurors) — interface stays identical.

### M-3 — Optimistic finality assumes a watcher — **Accepted (inherent), documented**
An incorrect proposal that goes undisputed for the liveness window settles as truth. This is inherent to optimistic oracles and is bounded by (a) the proposer's bond, (b) an adequate liveness window, and (c) watchers/keepers who dispute.
**Mitigations:** size the bond meaningfully; set production liveness to hours, not the 120s used for the testnet demo (`setParams`/`OO_LIVENESS`); run a dispute watcher.

### L-1 — Privileged roles should be multisigs — **Recommendation**
`ConditionalTokens` `DEFAULT_ADMIN_ROLE`/`ORACLE_ROLE`, `MarketMakerFactory` owner, each `FixedProductMarketMaker` owner, and `OptimisticOracle` `DEFAULT_ADMIN_ROLE`/`ARBITER_ROLE` are EOAs in the demo. Move all to a Safe before mainnet; renounce/rotate as decentralization progresses.

### L-2 — Bond/collateral must be a standard ERC-20 — **Documented constraint**
Fee-on-transfer or rebasing tokens would break complete-set accounting (FPMM) and the `bondAmount * 2` payout (OO). The collateral/bond is fixed to USDC (mainnet `0x74b7…`) / MockUSDC (testnet); do not configure exotic tokens. FPMM additionally reads reserves from live ERC-1155 balances, so raw ERC-20 donations cannot move prices.

### L-3 — Master FPMM implementation left uninitialized — **Recommendation**
The clone implementation is never used directly (the factory clones + initializes atomically, and `initialize` is one-shot). For defense in depth, initialize-lock the master copy on deploy.

### I-1 — `block.timestamp` for the dispute window — **Informational**
The OO uses `block.timestamp` for liveness. A multi-hour production window is immune to second-level validator skew. (Foundry lint flags this; acceptable here.)

### I-2 — Categorical price view uses scaled reciprocals — **Informational**
`prices()` computes `P(i) = (1/r[i]) / Σ(1/r[j])` via a `1e36` reciprocal scale to avoid the overflow a naive product-of-reserves would hit at high outcome counts. Trading math (`calcBuy/SellAmount`) is exact and independent of this view. Intermediate products in the trade loop are bounded (≤ ~1e42 ≪ 2²⁵⁶) for the enforced ≤16 outcomes.

### I-3 — MockUSDC is testnet-only — **Hard rule**
`MockUSDC` has an open `mint`. It must **never** be deployed to mainnet; mainnet uses canonical USDC.

---

## Second independent review (2026-05-22) — additional findings, all addressed in code

A second reviewer audited the v2 contracts and surfaced issues the first pass missed; all are now fixed with regression tests (43 Foundry tests green):

- **H-1 (High) — mutable global bond broke bond conservation across proposals.** The oracle posted `bondAmount` at propose but refunded the *current* global at settle/resolve/cancel, so an admin `setParams` mid-flight could over-refund (draining another proposal's escrow) or strand funds. **Fixed:** each `Proposal` snapshots its `bond`; all refunds/payouts use the snapshot; `setParams` affects only future proposals. (`test_snapshot_bondNotAffectedBySetParams`)
- **H-2 (High) — `setParams` retroactively moved a live proposal's dispute window.** dispute/settle used the current global `liveness`. **Fixed:** each proposal snapshots its `deadline`. (`test_snapshot_windowNotShortenedBySetParams`)
- **M-A (Medium) — a disputed proposal locked both bonds forever if the arbiter never ruled.** **Fixed:** added `arbitrationWindow` (default 7d); after it, `cancelProposal` refunds both bonds and resets the proposal for re-proposal. (`test_cancelProposal_arbiterTimeout_refundsAndResets`)
- **M-B (Medium) — `resolveDispute` decoupled the bond award from the written result** (arbiter could write one side's result but pay the other). **Fixed:** removed the `proposerWon` flag; the winner is *derived* from whether `finalPayouts` equals the proposal — `resolveDispute(conditionId, finalPayouts)`.
- **M-C (Medium) — deployer's parallel direct `ORACLE_ROLE` could front-run/override the oracle.** **Addressed:** `Deploy.s.sol` now **revokes the deployer's `ORACLE_ROLE` by default** (opt-out `KEEP_ADMIN_ORACLE=1`), making the optimistic oracle the sole resolution path.
- **L-A (Low) — `calcSellAmount` could overflow-Panic on near-full-reserve sells at high N** (the earlier I-2 bound held for buys, not sells). **Fixed:** both AMM loops use `Math.mulDiv(..., Ceil)` (512-bit intermediate, clean revert).
- **L-B (Low) — sub-50-unit buys round the fee to zero.** Accepted: 49 base units = $0.000049; gas dwarfs the evaded fee.

Reconfirmed clean on second pass: reentrancy/CEI, complete-set solvency, redeem rounding, fee/reserve separation, clone-master safety, `prices()` reciprocal bounds, append-only resolution.

> The testnet v2 OptimisticOracle at `0x8056ef37…` was deployed *before* this hardening; the now-default-hardened `Deploy.s.sol` picks up all of the above on a fresh deploy. Re-deploy before any staging/mainnet use.

## LP / funding-mechanism review (2026-05-23) — flagged CRITICAL → false positive

A third independent review of the public-liquidity surface (funded FPMM: ERC-20 LP token, `addFunding`/`removeFunding`, `feePoolWeight`/`withdrawnFees`, `_update`) flagged a CRITICAL: "first-mint seeds `feePoolWeight` with deposit principal → `removeFunding`/`transfer` underflow, locking LP funds." **Investigated and determined a FALSE POSITIVE.**

- Reproduced the reviewer's exact scenarios as Foundry tests. The underflows were caused by **test-harness `msg.sender` errors** (a `vm.prank(x); fn(token.balanceOf(x))` footgun — the `balanceOf` argument consumes the prank, so `removeFunding`/`transfer` executed as the wrong caller, burning from an already-exited account), **not** the contract.
- Verified that **both** the canonical Gnosis `supply == 0 ? value` and the alternative `? 0` produce identical, correct, underflow-free behavior under correct callers: sole-LP exit-after-withdraw, two-LP withdraw-then-full-exit, and LP transfer after withdrawal all conserve fees and burn cleanly. The first-mint `value` offset cancels exactly via `withdrawnFees`.
- Kept the **canonical Gnosis `? value`** (matches the audited reference and the deployed v3) and added the corrected scenarios as permanent regression tests (`test_lp_soleFullExitAfterWithdraw`, `test_lp_twoLPsWithdrawThenFullExit`, `test_lp_transferAfterWithdraw`, `test_lp_feeSplit_betweenFunders`, `test_removeFunding_returnsSharesAndFees`).

Verified sound on this pass: `addFunding` proportional sendback + `mintAmount` rounding (LP-favorable, no free money), `removeFunding` pro-rata, clone safety (pinned `name`/`symbol`/`decimals`), `removeFunding` after `close()`. Carried INFO: `_update` performs an external collateral transfer (`withdrawFees`) before `super._update` — safe under the standard non-hook-collateral assumption (L-2).

## Parlays (ParlayBook) — design notes & residual risk

`ParlayBook` is a house-backed fixed-odds parlay over existing markets (2–8 legs; decimal odds snapshotted from each market's `prices()` at entry; all-or-nothing payout `stake x product(odds)` from an owner-funded house pool). Foundry tests cover win/lose/void/exposure-cap/unresolved/min-legs/locked-exposure.

Controls in place: per-parlay **exposure cap** (`maxExposureBps` of free liquidity); per-leg **max-odds guard** (`MIN_LEG_PRICE`, ≤1000x/leg — also bounds the odds product against overflow); **distinct conditions required per parlay** — rejecting correlated/duplicate legs on the same condition, which would otherwise inflate the odds product without inflating risk (a strictly +EV house drain: two identical legs pay `stake/p²` for a single event of probability `p`); `lockedExposure` tracking so `withdrawHouse` can never pull funds reserved against open parlays; append-only settlement (`settled` flag); reentrancy guards + CEI on every fund move; a voided leg refunds the stake. (Found + fixed proactively, `test_parlay_duplicateConditionReverts`.)

**Independent review (2026-05-23) — findings + fixes** (all addressed; 12 ParlayBook tests cover them). The on-chain ParlayBook deploy was deliberately **held pending this review, so nothing was ever at risk**:
- **C-1 (Critical) — unverified market address.** `placeParlay` trusted arbitrary `markets[]`, so a fabricated market returning 1000x odds drained the house for a dust stake. **FIXED:** legs must be **factory-deployed** — `MarketMakerFactory` is the authority on each leg's `conditionId` (`factory.marketCondition(market) != 0`); spoofed markets are rejected (`test_parlay_fakeMarketRejected`).
- **C-2 (Critical) — spot-odds manipulation is a risk-free arbitrage** (the manipulation shares hedge the loss branch). **MITIGATED:** factory-only legs + a per-leg **minimum-liquidity floor** (`minLiquidity`) make moving a leg's price costly, bounded further by the exposure cap. **Not eliminated** — production needs a TWAP/observation-window odds source (Phase-3). This is the key documented open risk.
- **H-3 (High) — a never-resolving leg locked house liquidity forever.** **FIXED:** `cancelStaleParlay(id)` refunds the stake + releases exposure after `STALE_TIMEOUT` (30d) (`test_parlay_staleCancelRefunds`).
- **M-4 (Medium) — partial-void refunded the stake even when a surviving leg lost.** **FIXED:** voided legs drop out; surviving legs settle on the product of their odds; a lost surviving leg means the house keeps the stake (`test_parlay_partialVoid_paysSurviving`, `test_parlay_partialVoid_lostLegHouseKeeps`).
- **L-5 (Low) — owner centralization** over free liquidity/params: documented v1 trust assumption; move to a multisig (see L-1).

Reviewer-verified clean: locked-exposure solvency (`lockedExposure <= balance` across concurrent placements), no double-settle (`settled` flag before transfers), house-favorable rounding throughout. The house pool is owner-funded in v1; a tokenized public house-LP with exposure-aware accounting is future work.

## Invariants verified (Foundry)
- **No free money:** for any outcome and amount, buying then quoting the sell-back to recover the same collateral requires ≥ the shares received (binary *and* categorical fuzz).
- **Price bounds:** every implied probability is in (0, 1) and the set sums to ~1e18 (±rounding) after arbitrary trades.
- **Solvency:** `ConditionalTokens` collateral always backs outstanding complete sets; a complete set redeems to exactly 1 collateral in every status; payouts sum to the denominator.
- **Append-only resolution:** a condition resolves at most once; `reportPayouts` rejects re-resolution and all-zero payouts.
- **Bond conservation (OO):** undisputed settle refunds the proposer; a resolved dispute pays both bonds to the correct side; cancel refunds all posted bonds.

## Reentrancy & CEI
Every value-moving function is `nonReentrant` and follows checks-effects-interactions (status/flags set before external calls; native none — all flows are ERC-20/ERC-1155). `FixedProductMarketMaker` is an `ERC1155Holder`; mint callbacks during `splitPosition` are guarded.

## DoS
All loops are bounded by `outcomeCount ≤ 16` (split/merge/redeem/buy/sell/prices). No iteration over attacker-growable sets; `allMarkets` is never iterated on-chain.

---

## Pre-mainnet audit-prep checklist
- [ ] Independent third-party audit (gate).
- [ ] Revoke deployer `ORACLE_ROLE`; oracle = only resolution path (M-1).
- [ ] All privileged roles → Safe multisig (L-1).
- [ ] Production `liveness` (hours) + meaningful bond (M-3).
- [ ] Initialize-lock the master FPMM implementation (L-3).
- [ ] Deploy against canonical USDC, never MockUSDC (I-3).
- [ ] Expand invariant/differential fuzzing (handler-based, multi-actor) and add an echidna/medusa campaign.
- [ ] Re-deploy the OptimisticOracle so the live instance includes `cancelProposal` (the testnet v2 OO at `0x8056…` was deployed minutes before M-1's fix landed in code).
