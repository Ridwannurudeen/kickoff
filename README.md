# Kickoff

**The global World Cup 2026 fan platform on X Layer.**

Kickoff is a free-to-play fan platform built around World Cup 2026, live on **X Layer**, OKX's OP Stack L2. A user connects an OKX Wallet → mints a free, soulbound **Fan ID** → picks favorite teams → completes free **Quests** during the tournament → earns **XP** + a multi-dimensional **Fan Reputation** score → claims commemorative **NFT Trophies** at milestones → talks to a **multi-agent AI Companion** for personalized briefings.

**No money in for outcomes. No money out from outcomes. No randomness with stakes.** Every quest completion, every Companion call, and every league prediction is a real on-chain transaction.

**Live:** https://kickoff.gudman.xyz · **X:** [@kickoff_w2026](https://x.com/kickoff_w2026) · **Built for** [#BuildX](https://x.com/hashtag/BuildX) on [@XLayerOfficial](https://x.com/XLayerOfficial).

---

## Why Kickoff

- **A composable Fan Reputation primitive, not just another app.** `FanRep` is a soulbound ERC-721 (one per wallet) that carries a multi-dimensional on-chain reputation — prediction accuracy, engagement breadth, longevity. Any X Layer app can read it via `score(address)` and build on top. The Fan ID is the *primitive*; Quests, Trophies, and the league are first-party consumers.
- **A permissionless AI Agent platform, not a single Companion.** `AgentRegistry` lets anyone register an autonomous agent (their backend, their LLM, their logic) and charge OKB per call. Kickoff seeds three first-party agents — `match-analyst`, `personal-stats`, `highlights` — but the registry itself is open.
- **Bring-Your-Own-Agent league — the OnchainOS thesis demonstrated end-to-end.** `AgentLeague` is a free-skill, free-entry prediction tournament for AI agents. Builders deploy an agent, register it, enter it, and compete with Kickoff's own agents for XP, reputation, and the AI Champion trophy. No money wagered, no money paid out. Fork [`agents/v2-example-byo/`](agents/v2-example-byo/) and ship your own.
- **Three OKX X Cup tracks hit by design.** Social (Fan ID + global/team leaderboards + shareable profiles), NFT (commemorative ERC-1155 Trophies + composable Fan Rep SBT), and AI Agent (multi-agent Companion + permissionless registry + BYO league).
- **OKX-native end to end.** OKX Wallet to connect, OKB for gas and for agent service fees, sub-cent costs, OKLink for verifiable proof.

---

## Architecture

```
                       OKX Wallet (OKB gas)
                              |
                        web/ (Next.js dApp)
                              |
      +-------------+---------+---------+----------------+
      |             |                   |                |
   FanRep.sol  QuestEngine.sol     Trophy.sol      AgentRegistry.sol
   (SBT, ERC-721,  (XP, quest defs,   (ERC-1155       (agents, OKB fees,
   multi-dim       commit/reveal       commemoratives, on-chain calls,
   reputation)     predictions,        deterministic   payments,
                   self-attest,        gating, no      composeAgents)
                   external-proof)     randomness)            |
                       |                                      |
              OptimisticOracle  (reused, settles match results)
                       |
              keeper (rolling 7d quest window + propose + settle)

                                                    AgentLeague.sol
                                                    (BYO seasons +
                                                     commit/reveal +
                                                     leaderboard +
                                                     AI Champion trophy)
                                                              |
              off-chain agent services (each watches its Called event):
                 - match-analyst   (pre-match preview)
                 - personal-stats  (XP trajectory + recommended quest)
                 - highlights      (post-match summary)
```

See [`docs/KICKOFF-V2-DESIGN.md`](docs/KICKOFF-V2-DESIGN.md) for the design rationale (single source of truth), [`docs/DEMO_SCRIPT_V2.md`](docs/DEMO_SCRIPT_V2.md) for the demo walkthrough, and [`docs/SUBMISSION.md`](docs/SUBMISSION.md) for the X Cup submission draft.

### Contracts (Solidity 0.8.26 · OpenZeppelin v5 · Foundry)

| Contract | Role |
|---|---|
| [`FanRep`](contracts/src/FanRep.sol) | Soulbound ERC-721 (one per wallet) carrying a multi-dim on-chain reputation. `score(address)` returns `(total, predictionAccuracyBps, engagementBreadth, longevityDays)` — the composable read surface. XP writes are role-gated to `QuestEngine`. |
| [`QuestEngine`](contracts/src/QuestEngine.sol) | Quest registry + completion. Three types: `SELF_ATTEST` (one-per-wallet), `PREDICTION` (commit-reveal scaled by OO-settled result), `EXTERNAL_PROOF` (admin-signed attestation). Emits `QuestCompleted`; calls `FanRep.recordXP`. |
| [`Trophy`](contracts/src/Trophy.sol) | ERC-1155 commemoratives. Each trophy has a deterministic mint rule (`requiredXP`, `requiredQuestIds`, optional `windowEnd`). Gas-only to claim. No randomness, no mint fee. |
| [`AgentRegistry`](contracts/src/AgentRegistry.sol) | Permissionless agent layer. `registerAgent` / `callAgent` (payable in OKB) / `composeAgents` (single-tx fan-out). Funds flow caller → agent wallet directly; protocol fee = 0. |
| [`AgentLeague`](contracts/src/AgentLeague.sol) | Bring-Your-Own-Agent seasons. `openSeason` → `enterAgent` (free) → `submitPrediction` (hash commit) → after OO settles, anyone calls `scorePrediction(slot, salt)` and the contract scales the score by the on-chain payouts. Top-ranked agent's owner mints the **AI Champion** trophy at `closeSeason`. |
| [`OptimisticOracle`](contracts/src/OptimisticOracle.sol) | **Reused from v1, unchanged.** Propose / 120s liveness / settle / dispute / cancel. The sole resolution path; the deployer's `ORACLE_ROLE` on `ConditionalTokens` is revoked at deploy time. |
| [`ConditionalTokens`](contracts/src/ConditionalTokens.sol) | **Reused from v1**, used here only as a general-purpose result store (`conditionStatus` + `payoutNumerators`) for match outcomes — no betting surface. |
| [`MockUSDC`](contracts/src/MockUSDC.sol) | 6-decimal collateral token referenced by `ConditionalTokens.prepareCondition`. Not used for any payout in v2. |

**Test coverage:** `forge test` runs **211 tests across 9 suites** — all green.

### Deployed addresses (X Layer testnet, chain 1952)

| Contract | Address |
|---|---|
| `FanRep` | [`0x133aD36f956A3550aee35D9126dE728FaF9d96C6`](https://www.oklink.com/xlayer-test/address/0x133aD36f956A3550aee35D9126dE728FaF9d96C6) |
| `QuestEngine` | [`0x58EB9041876583F1134A78728668aE53476a8897`](https://www.oklink.com/xlayer-test/address/0x58EB9041876583F1134A78728668aE53476a8897) |
| `Trophy` | [`0x2E87D0b20638e48B11FFe82fB323B6986B177a02`](https://www.oklink.com/xlayer-test/address/0x2E87D0b20638e48B11FFe82fB323B6986B177a02) |
| `AgentRegistry` | [`0xf442Fa60ad9f2faB35D5e17065FDC8F7f3EDceEF`](https://www.oklink.com/xlayer-test/address/0xf442Fa60ad9f2faB35D5e17065FDC8F7f3EDceEF) |
| `AgentLeague` | [`0x30e4Bb6eA75409abB1A29C4FB86bF13c85abA89e`](https://www.oklink.com/xlayer-test/address/0x30e4Bb6eA75409abB1A29C4FB86bF13c85abA89e) |
| `OptimisticOracle` | [`0x4bd1968a579B7799ed0E84996cB2011eDD504cC8`](https://www.oklink.com/xlayer-test/address/0x4bd1968a579B7799ed0E84996cB2011eDD504cC8) |
| `ConditionalTokens` | [`0xCB893c645F822667e0409942B6109f4590637A39`](https://www.oklink.com/xlayer-test/address/0xCB893c645F822667e0409942B6109f4590637A39) |
| `MockUSDC` | [`0x21dF7e14AeD79022fE1bcF2BFF3342Bc10E93D5A`](https://www.oklink.com/xlayer-test/address/0x21dF7e14AeD79022fE1bcF2BFF3342Bc10E93D5A) |

Mainnet (chain 196) is **not yet deployed** — gated on third-party audit per [`docs/ROADMAP.md`](docs/ROADMAP.md).

### Live on-chain artefacts (testnet)

- **AgentLeague season 1** is open. One BYO example agent has run the full cycle on-chain: registered → entered → committed a hashed prediction before kickoff → revealed after the OO settled → 1000 XP credited.
- **Three first-party Companion services** are live on the VPS, each registered as a separate on-chain agent with its own wallet. Calls land within ~5s and submit real Claude Haiku 4.5 responses on-chain via `submitResult`.
- **Honest scope:** the real World Cup begins 2026-06-11, after the submission window. Prediction quests in the demo settle against clearly-labeled simulated friendlies. The same oracle path handles live matches in June–July.

---

## Monorepo layout

```
kickoff/
+- contracts/                   Foundry — Solidity contracts, tests, deploy scripts (deps vendored)
+- web/                         Next.js dApp — OKX Wallet, /quests, /league, /companion, /trophies
+- scripts/                     Keeper (register + propose + settle), market generator, sim activity
+- services/
|   +- match-analyst/           Node service: pre-match preview agent
|   +- personal-stats/          Node service: XP + coaching agent
|   +- highlights/              Node service: post-match summary agent
+- agents/
|   +- v2-example-byo/          The fork-and-go BYO agent reference implementation
+- sdk/                         TS SDK for the v1 markets (kept; not used by v2 product)
+- data/                        keeper fixtures, openfootball/worldcup.json (CC0)
+- docs/                        Design (KICKOFF-V2-DESIGN), demo script, submission, X content
```

---

## Quickstart

### Prerequisites
- [Foundry](https://book.getfoundry.sh/) (`forge`, `cast`, `anvil`)
- Node.js >= 22.6 (uses `node --experimental-strip-types`)
- An OKX Wallet (or any EVM wallet) with X Layer testnet OKB for gas

### Clone

```bash
git clone https://github.com/Ridwannurudeen/kickoff.git
cd kickoff
```

Dependencies are vendored under `contracts/lib/` — plain `git clone` gives you forge-std + OpenZeppelin v5; no `git submodule update --init` step.

### Contracts (Foundry)

```bash
cd contracts
forge build
forge test       # 211 tests, all green
```

### Web dApp

```bash
cd web
cp .env.example .env.local      # fill addresses + RPC if pointing at a fresh deploy
npm install
npm run dev                     # http://localhost:3000
```

The dApp is env-driven; the live site at https://kickoff.gudman.xyz uses the `web/.env.local` shape (see `web/.env.example`). Default `NEXT_PUBLIC_CHAIN_ID=1952` matches the testnet RPC `https://testrpc.xlayer.tech/terigon`.

### Bring-Your-Own-Agent (the tutorial path)

```bash
cd agents/v2-example-byo
cp env-example .env             # fill RPC, AGENT_ID, AGENT_PK
npm install
npm run register                # one-shot: AgentRegistry.registerAgent
npm run enter                   # one-shot: AgentLeague.enterAgent (current season)
npm run start                   # long-running: watches Called + scores predictions
```

Replace `pickSlot()` in `src/index.ts` with your own model and ship. The on-chain interface is fixed; the strategy is yours.

---

## Environment variables

Copy each `.env.example` / `env-example` to `.env` (or `.env.local`) in its package and fill in. **Never commit `.env*`.** The repo gitignores them and a pre-commit hook blocks dotfile writes.

**`contracts/.env`**

| Var | Description |
|---|---|
| `RPC_URL` | X Layer RPC, e.g. testnet `https://testrpc.xlayer.tech/terigon` |
| `PRIVATE_KEY` | Deployer key (testnet first; never a key with real funds in dev) |

**`web/.env.local`**

| Var | Description |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `1952` for X Layer testnet, `196` for mainnet |
| `NEXT_PUBLIC_RPC_URL` | `https://testrpc.xlayer.tech/terigon` (testnet) |
| `NEXT_PUBLIC_FAN_REP` | Deployed `FanRep` address |
| `NEXT_PUBLIC_QUEST_ENGINE` | Deployed `QuestEngine` address |
| `NEXT_PUBLIC_TROPHY` | Deployed `Trophy` address |
| `NEXT_PUBLIC_AGENT_REGISTRY` | Deployed `AgentRegistry` address |
| `NEXT_PUBLIC_AGENT_LEAGUE` | Deployed `AgentLeague` address |
| `NEXT_PUBLIC_CONDITIONAL_TOKENS` | Deployed `ConditionalTokens` address |
| `NEXT_PUBLIC_OPTIMISTIC_ORACLE` | Deployed `OptimisticOracle` address |
| `NEXT_PUBLIC_MOCK_USDC` | Collateral token address |

> **Subtle gotcha** (already fixed): the env reader must use literal dot-notation `process.env.NEXT_PUBLIC_X` for Next.js to inline the value into the client bundle. Dynamic bracket access (`process.env[name]`) silently fails in the browser. See `web/lib/config.ts:18-23` for the explanation.

**`services/<svc>/.env`**

| Var | Description |
|---|---|
| `RPC_URL` / `CHAIN_ID` | X Layer testnet |
| `AGENT_REGISTRY` / `AGENT_ID` / `AGENT_PK` | Identity for the on-chain agent the service represents |
| `LLM_PROVIDER` | `anthropic` (default) or `groq` |
| `LLM_API_KEY` | API key. Omit to emit a labelled `[no-LLM-key]` stub. |
| `LLM_MODEL` | Default `claude-haiku-4-5-20251001` for Anthropic, `llama-3.3-70b-versatile` for Groq |
| `OFFLINE_MODE` | `1` = log Called events but skip `submitResult` |
| `FAN_REP` | `personal-stats` only — to read `score(address)` |

---

## What's real vs simulated (honest scope)

- **Real, on-chain, now (testnet):** Fan ID mint, the three quest types, XP credit, Trophy claim, multi-agent Companion calls, AgentLeague entries + commit/reveal predictions, the full propose → 120s liveness → settle oracle cycle, and the BYO example agent's full lifecycle.
- **Simulated until the tournament:** the match-result feed. WC 2026 group stage starts Jun 11, 2026. Prediction quests in the demo settle against clearly-labeled simulated friendlies; the on-screen "SIMULATED MATCH" banner is wired on the resolution panel.
- **Gated (not yet live):** mainnet deployment, independent third-party audit, the API-FOOTBALL production result feed — tracked in [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## License

See `LICENSE`. Demo schedule data from `openfootball/worldcup.json` (CC0).
