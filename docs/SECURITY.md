# Kickoff v2 — Security Notes

**Scope:** the eight contracts that make up the live v2 system. Solidity `0.8.26`, OpenZeppelin v5, Foundry.

- v2 product contracts: `FanRep`, `QuestEngine`, `Trophy`, `AgentRegistry`, `AgentLeague`.
- Reused-from-v1 primitives kept in v2: `OptimisticOracle`, `ConditionalTokens`, `MockUSDC`.

**Status:** internal review by the project team. **No independent third-party audit has been performed.** A third-party audit is a hard gate before any mainnet deployment per [`ROADMAP.md`](ROADMAP.md). Mainnet (X Layer 196) is not deployed.

**Test coverage (verified this session):**

```
Ran 9 test suites in 96.57ms (370.90ms CPU time): 211 tests passed, 0 failed, 0 skipped (211 total tests)
```

The v1 (FPMM / MarketMakerFactory / ParlayBook) security writeup is preserved in [`ARCHITECTURE.md`](ARCHITECTURE.md) as the historical record. This document supersedes the prior `SECURITY.md` from this branch forward.

---

## 1. Threat model — what changed from v1

v1 was a categorical AMM betting product (FPMM, ParlayBook, conditional shares as wagering instruments). v2 has **no betting surface** by design: no entry fees against an outcome, no payouts tied to a prediction, no random-stake mints, no AMM. Every quest completion, league entry, and Companion call is either free (gas only) or *fee-for-service in OKB* (the agent operator's billable call price).

The practical consequence:

- **MEV on outcome prices, flash-loan-against-FPMM, arbitrage-on-FPMM, parlay duplicate-leg exploits, LP-share rounding, fee-pool-weight underflows** — these classes are **removed**, not mitigated. The code that produced them is no longer in the live system (FPMM/MarketMakerFactory/ParlayBook are still in git history but are not built or deployed by the v2 pipeline).
- **`ConditionalTokens` and `MockUSDC` are reused but de-purposed.** In v2, `ConditionalTokens` is used as a general-purpose result store (`conditionStatus` + `payoutNumerators`) so `QuestEngine` and `AgentLeague` can read OO-settled match outcomes. No collateral is split, no shares are traded, no payout is redeemed in the v2 product flow. `MockUSDC` is the OO bond token only, and the OO is deployed with `bondAmount = 0` (`script/DeployV2.s.sol:40`).

The new threat surface, in order of how load-bearing each is, is:

1. **Soulbound enforcement on FanRep.** The whole reputation primitive depends on a Fan ID not being transferable. Enforced in `FanRep._update`.
2. **Role-gated XP writes on FanRep.** Reputation is meaningful only if balances can't be forged. `recordXP` is gated to `XP_RECORDER_ROLE`, granted to `QuestEngine` at deploy.
3. **Commit-reveal on `PREDICTION` quests and on `AgentLeague`.** Predictions must be hash-committed before the quest's `endsAt`; the reveal is checked against both the commit and the OO-resolved condition.
4. **Payment flow in `AgentRegistry`.** `callAgent` is payable; the contract requires `msg.value == priceWei`, forwards the full amount to `agentWallet`, and takes zero protocol fee.
5. **`AgentLeague` no-money invariant.** `enterAgent`, `submitPrediction`, `scorePrediction`, `closeSeason` are all non-payable; the only "prize" is a non-purchasable `Trophy` minted via `operatorMint`.
6. **BYO agent operator trust.** Anyone may register an agent in `AgentRegistry`. The platform does not vet operators. Caller exposure is bounded to the OKB they spend per `callAgent`.
7. **OptimisticOracle is reused unchanged.** The OO contract is identical to the v1 contract; its threat story (proposer/disputer bonds, arbiter trust, liveness window) carries over. The deployer's direct `ORACLE_ROLE` on `ConditionalTokens` is revoked at deploy, so the OO is the sole resolution path.

---

## 2. Per-contract notes

### 2.1 `FanRep.sol` — soulbound ERC-721 with multi-dim reputation

- **Soulbound enforcement.** `_update` (lines 159–169) reverts with `Soulbound()` whenever `from != address(0) && to != address(0)`. That allows mint (`from == 0`) and burn-from-self (`to == 0`, auth-checked by ERC-721); every other movement reverts. OZ v5 routes mint/transfer/burn through `_update`, so there is no path that bypasses this check.
- **One Fan ID per wallet.** `mint()` (line 71) reverts with `AlreadyMinted` if `_fans[msg.sender].tokenId != 0`.
- **XP is role-gated and append-only.** `recordXP(user, dim, amount)` (line 96) requires `XP_RECORDER_ROLE`. The role is granted to `QuestEngine` in `DeployV2.s.sol:69` (`fanRep.grantRole(fanRep.XP_RECORDER_ROLE(), address(questEngine))`). Admins can register new dimensions (`registerDimension`, line 115) but cannot write user balances — there is no admin balance-override path in the contract.
- **Overflow guard.** Both per-dimension and total accumulators check for `uint64` wraparound (`XPOverflow`, lines 103, 106).
- **No money.** No payable functions, no token transfers, no allowances. The SBT is purely a reputation carrier.

### 2.2 `QuestEngine.sol` — quests + XP

- **Three quest types** in the `QuestType` enum (lines 28–32): `SELF_ATTEST`, `PREDICTION`, `EXTERNAL_PROOF`. Each has its own completion entrypoint and config decoder.
- **Window discipline.** `_requireWindowOpen` (line 180) rejects calls before `startsAt` or after `endsAt`. For `PREDICTION`, this means the commit must land while the window is open and *before* kickoff (the design convention is `endsAt < kickoff` for prediction quests so the commit is locked before the match starts).
- **Commit-reveal for predictions.**
  - `commitPrediction(questId, commit_)` (line 118) stores `commit = keccak256(abi.encode(predictedSlot, salt))`, rejects double-commits (`AlreadyCommitted`), and requires the caller to hold a Fan ID (`NoFanId`).
  - `settlePrediction(questId, user, predictedSlot, salt)` (line 133) verifies `keccak256(abi.encode(predictedSlot, salt)) == commit_` (line 140; revert `BadReveal`), then requires the underlying condition to be resolved (`conditionalTokens.conditionStatus(conditionId) != 2` ⇒ revert `ConditionNotResolved`, line 144), and only then awards XP scaled by the on-chain numerators (line 153). The completion flag is set before the external `recordXP` call (CEI; line 155 before line 157).
- **EXTERNAL_PROOF signature scheme.** `completeExternalProof` (line 164) recovers an Ethereum-signed message of `keccak256(abi.encode(address(this), block.chainid, questId, msg.sender))` (line 171). The chain id + contract address + caller + questId binding prevents replay across chains, contracts, users, or quests.
- **Append-only completion.** `completed[questId][user]` is set before any external call and never cleared. `settlePrediction` also sets the flag even when the award is zero (line 155), so a wrong reveal cannot be re-tried.
- **Admin scope.** `QUEST_REGISTRAR_ROLE` can only *register* quests (line 87). It cannot mark anyone completed, cannot move balances, cannot edit a registered quest.

### 2.3 `Trophy.sol` — ERC-1155 commemoratives

- **Deterministic mint rule.** `defineTrophy` (line 62) is admin-only (`TROPHY_REGISTRAR_ROLE`). The rule is append-only: `if (_rules[trophyId].exists) revert TrophyExists()` (line 68). A trophy's `requiredXP`, `windowEnd`, and `requiredQuestIds` are fixed at definition time.
- **No randomness, no mint fee.** `claim` (line 83) checks XP threshold, quest completions, optional window, Fan ID ownership, and mints exactly one. There is no RNG anywhere in the contract and the function is non-payable.
- **Operator mint path** (`operatorMint`, line 107). `TROPHY_REGISTRAR_ROLE` can mint a trophy directly to a verified winner address, used by `AgentLeague.closeSeason` for the AI Champion. `AgentLeague` is granted the role in `DeployV2.s.sol:70`. The function still respects "must be defined" and "one mint per wallet per trophyId" (line 110); it skips only the caller-driven XP/quest gating because the operator (the league contract) has already verified eligibility on-chain.
- **Honest scope note.** ERC-1155 transferability is left intact (the natspec at lines 22–23 calls this out). Trophies are non-purchasable in any first-party surface but the contract does not technically forbid a transfer call. The design constraint is "deterministic mint, no randomness, no fee at mint" — that is enforced. Discouraging secondary sale is a UX/branding concern, not a contract enforcement concern.

### 2.4 `AgentRegistry.sol` — permissionless agent layer

- **Reentrancy guards.** `callAgent` and `composeAgents` are `nonReentrant` (lines 94, 117). The contract inherits OZ `ReentrancyGuard` (line 4).
- **Strict payment match.** `callAgent` reverts unless `msg.value == a.priceWei` (line 99). `composeAgents` pre-sums every agent's `priceWei` and reverts unless `msg.value == totalPrice` (line 130). No refunds, no leftover dust; if the user overpays or underpays the call reverts and gas is the only loss.
- **CEI on payment.** Both `callAgent` and `composeAgents` write the `CallRecord` and emit `Called` *before* forwarding funds to the agent wallet (lines 102–103 → 107, lines 135–139 → 141). Combined with `nonReentrant`, this prevents a malicious recipient from re-entering and replaying call ids — the nonce is incremented inside `_mkCallId` (line 186) so each call gets a fresh `callId` regardless.
- **Funds flow caller → agent wallet directly.** Protocol fee is zero (line 13 natspec; verified at lines 107, 141 — no skim, no treasury).
- **Result signature scheme.** `submitResult` (line 149) recovers an Ethereum-signed message of `keccak256(abi.encode(address(this), block.chainid, callId, keccak256(result)))` (line 155) and checks it against the registered `agentWallet`. The digest binds contract address + chain id + callId + the *content* of the result, so a result cannot be replayed across chains, contracts, or other calls, and cannot be substituted.
- **Listing ownership.** `updateAgent` is gated to the original registrant (`a.owner != msg.sender` ⇒ `NotAgentOwner`, line 80). There is no admin override of listings.

### 2.5 `AgentLeague.sol` — bring-your-own-agent prediction tournament

- **No money in, no money out.** `enterAgent`, `submitPrediction`, `scorePrediction`, and `closeSeason` are all non-payable (lines 173, 195, 224, 271). The contract holds no balance, takes no fee, has no withdrawal function. The only "prize" is the AI Champion `Trophy` minted by `operatorMint`.
- **Sequential seasons.** `openSeason` (line 160) is admin-only and reverts with `SeasonOpenAlready` if `activeSeasonId != 0` (line 161). One season at a time.
- **Entry binding.** `enterAgent` (line 173) requires the caller to be the agent's registered `owner` in `AgentRegistry` (line 181); double-entries revert (`AlreadyEntered`, line 184).
- **Commit-reveal matches `QuestEngine`.** `submitPrediction` (line 195) requires the quest to be `PREDICTION`-type (line 210) and inside its window (lines 211–212), then stores `commit = keccak256(abi.encode(slot, salt))` (line 215). `scorePrediction` (line 224) verifies the reveal against the commit (line 235) and requires the OO to have resolved the condition (line 256, inside `_calcAward`).
- **Score derivation.** `_calcAward` (line 249) reads the quest's `xpReward` and the condition's `payoutNumerators` from `ConditionalTokens`, sums them as `den`, and returns `xpReward * nums[predictedSlot] / den` (line 264). Same "scaled by closeness" rule as `QuestEngine.settlePrediction`.
- **Idempotent scoring.** `scored[sid][agentId][questId]` is set before mutating the agent's running total (line 239 before line 243). The score accumulator checks for `uint64` overflow (line 242).
- **Close + winner mint.** `closeSeason` (line 271) is callable by anyone after `endsAt`; admin can force-close earlier (line 275). It iterates entered agents in enter order (deterministic tie-break: first-entered wins, lines 281–287), marks the season `Closed` (line 289), clears `activeSeasonId` if this was the active one (line 292), and calls `trophy.operatorMint(aiChampionTrophyId, winnerOwner)` (line 299). `Trophy.operatorMint` reverts on double-claim (`Trophy.sol:110`), so a previously-claimed AI Champion address fails closure loudly rather than silently.

### 2.6 `OptimisticOracle.sol` — reused from v1, unchanged

The OO contract bytecode in v2 is the same contract that passed the v1 internal review (see [`ARCHITECTURE.md`](ARCHITECTURE.md) for the historical writeup). Load-bearing properties for v2:

- **Snapshot-on-propose.** Each `Proposal` snapshots `bond` and `deadline` at propose time (lines 84, 87). `setParams` (line 180) cannot retroactively change a live proposal's bond or window.
- **Bond conservation across paths.** Undisputed `settle` refunds the proposer (line 121). `resolveDispute` (line 128) derives the winner from whether `finalPayouts == proposal.payouts` and pays `bond * 2` to that side (lines 137, 143). `cancelProposal` (line 151) refunds both bonds on the two cancel paths (condition resolved out-of-band, or arbiter timed out beyond `arbitrationWindow`).
- **Reentrancy.** `propose`, `dispute`, `settle`, `resolveDispute`, `cancelProposal` are all `nonReentrant` (lines 78, 97, 110, 130, 151). Bond moves use `SafeERC20`.
- **Sole-resolver invariant in v2.** `DeployV2.s.sol:48–50` grants `ORACLE_ROLE` on `ConditionalTokens` to the OO and revokes the deployer's role (unless `KEEP_ADMIN_ORACLE=1`). On the deployed testnet instance, the OO is the only path that can write `reportPayouts` / `voidCondition` — verifiable on OKLink.
- **v2-specific configuration.** Deployed with `bondAmount = 0` (`script/DeployV2.s.sol:40`). v2 has no monetary disputes; the OO is used purely to deliver a verified match result to `ConditionalTokens` so `QuestEngine` and `AgentLeague` can read it.

The known v1 trust assumption around `ARBITER_ROLE` (a Safe/committee in production) still applies. For v2 it matters less in practice — there is no money at stake on the OO's verdict — but a dishonest arbiter could still mis-resolve a `PREDICTION` quest and mis-credit XP. The v1 mitigation (multisig arbiter, every action is event-logged) is the v2 mitigation.

### 2.7 `ConditionalTokens.sol` — reused, used only as a result store in v2

In v2 the contract is never asked to split/merge/redeem — those entrypoints still exist (lines 73, 86, 133) but are not exercised by any v2 product flow. The v2 dependency is solely `prepareCondition` (line 56), `conditionStatus` (line 168), `getOutcomeSlotCount` (line 172), and `payoutNumerators` (line 180) — all read-only from the v2 product contracts' perspective, with the OO doing the single resolution write via `reportPayouts` (line 100).

- **Append-only resolution** (line 102: `require(c.status == Status.Open)`). A condition resolves at most once.
- **All-zero payouts rejected** (line 108: `require(den > 0)`).
- **Oracle role is the OO, not the deployer**, per the deploy-script wiring above.

`MockUSDC` is still the collateral parameter on `prepareCondition` because the constructor demands a non-zero collateral address, but no collateral is ever transferred under v2 product flows.

### 2.8 `MockUSDC.sol` — testnet faucet token

Open `mint(address, uint256)` (line 14). **Testnet only. Must never be deployed to mainnet.** v2 keeps it for the OO constructor's `bondToken_` argument (with `bondAmount = 0`, so it is never moved by the OO either).

---

## 3. Reentrancy + CEI

Every value-moving function is guarded:

- `AgentRegistry.callAgent` — `nonReentrant` (`AgentRegistry.sol:94`); writes `_calls[callId]` and emits `Called` before forwarding funds (lines 102–103 → 107).
- `AgentRegistry.composeAgents` — `nonReentrant` (`AgentRegistry.sol:117`); pre-sums prices before any forward (lines 122–130), writes each call record before each forward (lines 135–141).
- `OptimisticOracle.{propose,dispute,settle,resolveDispute,cancelProposal}` — all `nonReentrant` (`OptimisticOracle.sol:78, 97, 110, 130, 151`). Status is set before each `safeTransfer`.
- `ConditionalTokens.{splitPosition,mergePositions,redeemPositions}` — all `nonReentrant` (`ConditionalTokens.sol:73, 86, 133`), unused by v2 product flows but still guarded.

The XP/Trophy/QuestEngine path holds no value and makes only one external call each (to `FanRep.recordXP` from `QuestEngine`, to `Trophy._mint` from `Trophy.claim`/`operatorMint`). Completion/claim flags are written before those external calls in every case (`QuestEngine.sol:155 → 157`, `QuestEngine.sol:188 → 189`, `Trophy.sol:98 → 99`, `Trophy.sol:111 → 112`).

---

## 4. Test coverage

The 211-test suite breaks down across nine files in `contracts/test/`:

- `FanRep.t.sol` — Fan ID mint, soulbound transfer revert, dimension registry, role-gated `recordXP`, score view, overflow guard.
- `QuestEngine.t.sol` — registration, window enforcement, all three quest types, commit-reveal correctness (good reveal, bad reveal, double-commit), settle-against-unresolved-condition revert, signature-replay rejection.
- `Trophy.t.sol` — define rule, XP gating, quest gating, window expiry, double-claim revert, `operatorMint` path.
- `AgentRegistry.t.sol` — register/update, payment-match enforcement, `composeAgents` sum check, result signature recovery, replay rejection, reentrancy guard exercised.
- `AgentLeague.t.sol` — season lifecycle, only-owner entry, commit-reveal, scoring against resolved condition, leaderboard ordering, AI Champion mint on close, idempotency.
- `OptimisticOracle.t.sol` — propose/dispute/settle/resolveDispute/cancel matrix, bond snapshotting, params-don't-affect-live-proposals, arbiter-timeout cancel.
- `Kickoff.t.sol` — v1 FPMM/CT/MockUSDC integration tests retained as regression coverage for the reused primitives.
- `ParlayBook.t.sol` — v1 ParlayBook tests retained from the historical suite; ParlayBook is not deployed in v2.
- `V2EndToEnd.t.sol` — full v2 flow: mint Fan ID → register quests → commit/settle prediction → claim trophy → register agent → call agent → enter league → score prediction → close season → mint AI Champion.

Running `forge test` from `contracts/`:

```
Ran 9 test suites in 96.57ms (370.90ms CPU time): 211 tests passed, 0 failed, 0 skipped (211 total tests)
```

---

## 5. Acknowledged gaps / pre-mainnet checklist

These are documented, not blocking testnet, and explicitly gated before mainnet:

- **No independent third-party audit.** Hard gate before any mainnet deployment.
- **`EXTERNAL_PROOF` quests are admin-attested.** `QuestEngine.completeExternalProof` recovers a signature against an admin-registered signer per quest (config decoded at `QuestEngine.sol:199`). For v1 this is the operational reality of "share a post that tags us" / "watch our YouTube short" attestation flows; decentralisation paths (Worldcoin proofs, on-chain attestation registries) are roadmapped, not built.
- **BYO agent operators are not vetted.** `AgentRegistry.registerAgent` is permissionless. The platform's exposure is bounded to the OKB a caller pays per `callAgent` — a malicious operator can refuse to reply (the user loses their call fee, nothing else), or post a useless `submitResult` (the signature still has to be valid; the *content* is uncontested by the contract). Users should treat call fees the way they would treat any pay-per-API-call third-party endpoint.
- **`AgentRegistry` protocol fee is zero in v1 and is hard-coded, not configurable.** There is no admin function to skim from agent payments in the current contract; raising or lowering the protocol fee would require redeploying. Documented as a v1 simplification.
- **Arbiter is an EOA on testnet.** `DeployV2.s.sol:43` sets `arbiter = deployer`. Rotate to a Safe multisig before mainnet (same recommendation as v1).
- **`MockUSDC` must never be deployed to mainnet** — open mint, testnet only.
- **`OO_LIVENESS` defaults to 120 seconds** for the testnet demo (`DeployV2.s.sol:31`). Use a multi-hour value for mainnet so honest watchers have time to dispute.
- **Off-chain Companion services hold an `LLM_API_KEY`** in a 600-mode root-only EnvironmentFile on the VPS systemd unit. Operational discipline: rotate that key at the next convenient maintenance window (the most recent rotation key was shared over chat during a debugging session). The key has no on-chain authority — it only authenticates the service to the LLM provider — but rotating remains good hygiene.

---

## 6. Operational notes

- **`.env*` is gitignored from genesis.** The repo's root `.gitignore` excludes `.env`, `.env.*`, and per-package dotfiles. A pre-commit hook also blocks 64-hex literals being written through `Edit`/`Write`, which catches the most common shape of a leaked private key being pasted into source.
- **Deployer key lives in `contracts/.env`** (untracked) and is loaded via `vm.envUint("PRIVATE_KEY")` in `DeployV2.s.sol:26`. It is never read from or written to any tracked file.
- **Audit blob scan, verified clean as of 2026-05-28.** A repository-wide secret scan over 1099 blobs in the working tree and history surfaced zero secret patterns (no API keys, no private keys, no bearer tokens) in tracked content.
- **Deploy-time role hygiene** is performed by the script: the deployer's `ORACLE_ROLE` on `ConditionalTokens` is revoked unless `KEEP_ADMIN_ORACLE=1` is set (`DeployV2.s.sol:48–50`), so on a fresh deploy the OO is the sole resolver of conditions used by v2 quests.
- **VPS deployment hardening, applied 2026-05-28.** nginx for `kickoff.gudman.xyz` now sends `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, and `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`. The three Companion services (`kickoff-match-analyst`, `kickoff-personal-stats`, `kickoff-highlights`) run with systemd drop-in hardening at `/etc/systemd/system/<unit>.service.d/hardening.conf`: `MemoryMax=512M`, `NoNewPrivileges=true`, `PrivateTmp=true`, `ProtectSystem=strict` with `ReadWritePaths=/opt/kickoff/services`, `ProtectHome=true`. `kickoff-web` has `MemoryMax=1G` and `RestartSec=5` via `/etc/systemd/system/kickoff-web.service.d/restart.conf`. The Next.js web service still runs as `User=root`, pending a follow-up to run it under a dedicated unprivileged service account. Service EnvironmentFiles at `/opt/kickoff/services/<svc>/.env` are mode `600`, owner root.
- **ufw firewall is active.** Only `80/tcp`, `443/tcp`, and the SSH port are open externally for the Kickoff surface. The Next.js port (`3055`) listens on `0.0.0.0` but is not exposed to the public internet because it is not in the ufw allow-list; nginx proxies to it via `127.0.0.1:3055`.
