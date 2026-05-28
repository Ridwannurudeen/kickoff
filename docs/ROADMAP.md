# Kickoff — Roadmap

Kickoff is the global World Cup 2026 fan platform on X Layer. The roadmap is phase-named, not date-locked: each phase is gated by an event (the X Cup submission deadline, an audit completing, the WC group stage opening, the final whistle) rather than a calendar quarter we cannot guarantee.

The single source of truth for design decisions is [`docs/KICKOFF-V2-DESIGN.md`](KICKOFF-V2-DESIGN.md). This roadmap describes what is shipped, what is in the submission window, and what remains gated.

---

## Where we are today — v2 shipped to X Layer testnet

Live and verifiable on **X Layer testnet (chain 1952)**:

- **Five new v2 contracts deployed and unit-tested.** `FanRep` (soulbound ERC-721 reputation), `QuestEngine` (`SELF_ATTEST` / `PREDICTION` / `EXTERNAL_PROOF`), `Trophy` (ERC-1155 commemoratives), `AgentRegistry` (permissionless agent layer), `AgentLeague` (BYO seasons + commit/reveal). Addresses are in the root [`README.md`](../README.md) and on OKLink.
- **Three contracts kept from v1 with no betting role.** `OptimisticOracle` is reused unchanged (propose → 120s liveness → settle) as the sole resolution path. `ConditionalTokens` is reused as a generic result store for match outcomes — no `FixedProductMarketMaker`, no `ParlayBook`, no `LimitOrderBook` in the live system. `MockUSDC` remains the collateral token referenced by `prepareCondition` only; it has no payout role in v2.
- **`forge test` runs 211 tests across 9 suites, all green.**
- **`AgentLeague` season 1 is open.** The BYO example agent at [`agents/v2-example-byo/`](../agents/v2-example-byo/) has run the full on-chain lifecycle: `registerAgent` → `enterAgent` → hashed `submitPrediction` before kickoff → `scorePrediction` after the OO settled → 1000 XP credited.
- **Three first-party Companion services are live on the VPS.** `match-analyst`, `personal-stats`, and `highlights` each run as a separate Node service, each is registered as its own on-chain agent with its own wallet, and each responds to `callAgent` within roughly 5 seconds, submitting real Claude Haiku 4.5 text back on-chain via `submitResult`.
- **Frontend live at https://kickoff.gudman.xyz**, reading the real testnet addresses through `web/.env.local`.
- **Repository public at https://github.com/Ridwannurudeen/kickoff**, plain `git clone` builds (deps vendored under `contracts/lib/`).
- **Dedicated X account live at [@kickoff_w2026](https://x.com/kickoff_w2026).**

The v1 betting design (FPMM + parlays + LP shares + categorical price-discovery) is preserved in `docs/ARCHITECTURE.md` for history and stays in git history; it is not part of the v2 live system.

---

## Phase 1 — Submission window

**Gate: the X Cup submission deadline (~2026-06-09).**

Everything that ships in this phase is already executable from the current main branch — no further smart-contract changes are planned in this window unless a bug surfaces.

- Post the cadenced X content from [`docs/X_CONTENT.md`](X_CONTENT.md) on `@kickoff_w2026`: Day-5 Fan Rep primitive, Day-7 first-party Companion agents, Day-9 AgentLeague season 1 BYO walk-through, Day-11 trophies + composable read surface, Day-13 fork-and-go BYO tutorial.
- Record the demo video per [`docs/DEMO_SCRIPT_V2.md`](DEMO_SCRIPT_V2.md): Fan ID mint → quest completion → Companion call → BYO agent committing and revealing a prediction → trophy claim.
- Submit the X Cup Google Form. **User-gated** — nothing is submitted without explicit owner approval.

Out of scope for this window: any contract redeploy, any mainnet step, any feature flag flip on `kickoff.gudman.xyz` beyond what is already wired.

---

## Phase 2 — Mainnet gate

**Gate: an independent third-party audit completing with no unresolved highs or criticals.**

Audit is a hard prerequisite. The v2 contracts are well-tested (211 forge tests, fuzz on commit/reveal, append-only role-gated XP writes) but they have not been reviewed by an external auditor, and no money is allowed on mainnet until that has happened.

Once the audit clears:

- Deploy the v2 contract set (`FanRep`, `QuestEngine`, `Trophy`, `AgentRegistry`, `AgentLeague`, plus the reused `OptimisticOracle` and `ConditionalTokens`) to **X Layer mainnet (chain 196)**.
- Swap `MockUSDC` for **real USDC** at `0x74b7F16337b8972027F6196A17a631aC6dE26d22` in the `prepareCondition` call. No payouts route through it — it is collateral metadata only — but the address must be the real one on mainnet.
- Swap the demo result feed (`data/openfootball/worldcup.json`, CC0) for **API-FOOTBALL** (`league=1`, `season=2026`) in the keeper. Openfootball is sufficient for the simulated-friendly demo window; live tournament results need the paid feed.
- Verify all eight contracts on OKLink.
- Flip `NEXT_PUBLIC_CHAIN_ID=196` on the live frontend and migrate `@kickoff_w2026` messaging to mainnet.

This phase is **gated, not dated.** Auditor availability and budget drive the timeline. We will not set a calendar target we cannot hold.

---

## Phase 3 — Live tournament

**Gate: World Cup 2026 group stage opens 2026-06-11; final 2026-07-19.**

The mechanism is the same one running on testnet today; the only difference is that match results come from real fixtures rather than simulated friendlies.

- The keeper rolls a 7-day window of `match-day` and `PREDICTION` quests across all 104 WC fixtures, proposes results to the `OptimisticOracle` at full time, and settles undisputed predictions.
- `PREDICTION` quests scale `xpReward` by closeness against the on-chain match result; `SELF_ATTEST` quests credit XP on a one-per-wallet basis; `EXTERNAL_PROOF` quests continue to use admin-signed attestations.
- `AgentLeague` runs a season per tournament stage — group, R16, QF, SF, final — opened and closed via `openSeason` / `closeSeason`. The top-ranked agent's owner mints the **AI Champion** trophy at season close.
- The first-party Companion (`match-analyst`, `personal-stats`, `highlights`) handles real fixtures the same way it handles simulated ones today; the on-screen "SIMULATED MATCH" banner is removed once the feed is live.
- BYO agents that registered during testnet can continue to compete on mainnet by re-registering against the mainnet `AgentRegistry`.

This phase ends with the final whistle on 2026-07-19.

---

## Phase 4 — Post-tournament expansion

**Gate: tournament concludes; product carries forward the wallets and reputations earned during the window.**

- **Multilingual UI rollout.** The i18n scaffolding is already in the frontend (English is the launch locale); Arabic, Spanish, and Portuguese are the first additions. RTL stylesheet pass is available and ships alongside Arabic.
- **Recurring `AgentLeague` seasons** tied to subsequent tournaments — Women's WC, AFCON, Copa, EURO, major club seasons. The contracts are stage-agnostic; only the keeper's fixture source and the season window change.
- **Additional first-party Companion agents.** Candidates: lineup predictor, Opta-style match-event summarizer, knockout-bracket simulator. Each is a new entry in `AgentRegistry`, not a new contract.
- **LLM-provider expansion.** Services already support `LLM_PROVIDER=anthropic|groq` via `services/<svc>/.env`; further providers slot into the same interface.
- **Account abstraction + fiat on-ramp.** ERC-4337 / OKX smart-account login and a fiat → USDC on-ramp are scoped here, not earlier, because they are mainstream-onboarding levers that only matter once we are on mainnet with a live audience.

---

## Phase 5 — Primitive lifetime

**Gate: other X Layer apps integrating `FanRep` and `AgentRegistry`.**

The end-state goal is not that Kickoff monopolizes the surface. It is that the primitives outlive the tournament product.

- `FanRep` is a portable on-chain reputation. Any X Layer app can call `score(address) returns (uint64 total, uint64 predictionAccuracyBps, uint64 engagementBreadth, uint64 longevityDays)` and build on it — gated content, reputation-weighted governance, recommendation surfaces, sybil resistance for other apps. XP writes stay role-gated to `QuestEngine`, so external apps consume reputation rather than mint it.
- `AgentRegistry` is a general-purpose agent-call layer. Any app can plug in: register an agent, charge OKB per call, get a deterministic on-chain `Called → submitResult` flow with no protocol fee skimmed. `composeAgents` fan-out works the same for third-party apps as it does for the Kickoff Companion.
- This is the OnchainOS thesis demonstrated end-to-end: a free-skill, free-entry agent league running on X Layer, with the reputation and the agent-call surface usable by anyone.

This phase has no end date. It is the steady state.

---

## Honest gating and risks

- **Audit timeline is gated on auditor availability and budget.** We will not commit to a date until an auditor is booked. Phase 2 does not begin without the report.
- **API-FOOTBALL is a paid key.** The keeper has the integration shape ready, but the production feed requires a funded subscription. The openfootball CC0 dataset covers the demo window and nothing more.
- **`EXTERNAL_PROOF` quests are admin-signed in v1.** This is centralized by design for the submission window; decentralization paths (Worldcoin attestation, on-chain proof verification) are tracked but not in scope until after the tournament.
- **`AgentRegistry` protocol fee is 0% in v1.** Raising it later is a governance question, not a unilateral decision. Per-agent `priceWei` is set by each agent operator; the protocol takes no cut today.
- **Platform-level risk from BYO agent operators** (faulty services, unresponsive endpoints, dishonest commits) is documented in [`docs/SECURITY.md`](SECURITY.md). The commit/reveal mechanism in `AgentLeague` and the role-gated XP writes in `FanRep` are the two structural mitigations; the rest is operator hygiene.
- **The real World Cup begins 2026-06-11.** Anything settled before that in the live demo is a simulated friendly and is labeled as such. The same oracle path handles live matches once the tournament starts.
