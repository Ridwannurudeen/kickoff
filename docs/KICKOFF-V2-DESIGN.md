# Kickoff v2 — Global World Cup Fan Platform on X Layer

> **Status:** Design locked 2026-05-26. Build target: ~2 weeks (submission deadline ~2026-06-09). Branch: `feat/v2-halal-fan-platform`.
> **For the OKX X Cup** (World Cup-themed, X Layer-deployed). Eligible tracks hit: **Social + NFT + AI Agent**.

## 1. Why this exists

Kickoff v1 was a categorical AMM-based prediction/trading market for World Cup 2026. Functionally that is wagering, which conflicts with the founder's values (Islamic prohibition on *maysir*). v2 is a halal pivot that keeps the World Cup hook + the OKX strategic alignment (convert WC attention into X Layer on-chain activity) while removing every monetary-stake-on-outcome surface.

## 2. Audience

**Global, English-primary.** A worldwide fan platform for World Cup 2026 — every team, every market. Multilingual support is a feature (English at launch, additional locales added incrementally), not a positioning wedge. **Differentiation comes from the primitive layer** — a composable Fan Reputation SBT plus a Bring-Your-Own-Agent platform that anyone can deploy AI agents to — not from cultural targeting.

> *Internal engineering rule (not advertised in product):* no maysir / gharar / riba / random-pack mechanics. Halal-by-design is a floor constraint, not a positioning angle. The user never sees religious framing.

## 3. The product

A user connects an **OKX Wallet** → mints a free, soulbound **Fan ID** → picks favorite teams → completes free **Quests** during the tournament → earns **XP** + a multi-dimensional **Fan Reputation** score → at milestones mints commemorative **NFT Trophies** → talks to a **multi-agent AI Companion** for personalized briefings, team facts, fixture digests, in Arabic or English.

**No money in for outcomes. No money out from outcomes. No randomness with stakes. Every quest completion is a real X Layer transaction.**

## 4. Halal design constraints (non-negotiable)

- No entry fees against a result; no payouts tied to predictions.
- No "card packs" or randomised mints — trophies are deterministic on quest/XP conditions.
- No interest-bearing instruments.
- The AI Companion charges *fee-for-service* in OKB (clearly a service, not a wager). Free tier always available.
- The on-chain footprint must contain no betting primitives. v1 betting contracts stay in git history but are removed from the live system.

## 5. Architecture

```
                        OKX Wallet (OKB gas)
                                |
                          web/  (Next.js, RTL)
                                |
   ┌─────────────────┬──────────┴───────────┬──────────────────┐
   │                 │                       │                  │
 FanRep.sol     QuestEngine.sol         Trophy.sol        AgentRegistry.sol
(SBT, ERC-721,  (XP, quest defs +      (ERC-1155          (agents, OKB fees,
 multi-dim       attestations,         commemoratives,     on-chain calls,
 reputation)     non-transferable)     fixed-supply)       payments)
                       │
              OptimisticOracle  (REUSED — settles "predict the score" XP attribution)
                       │
              keeper: openfootball (demo) / API-FOOTBALL (prod)

  off-chain AI services (callable as on-chain Agents via AgentRegistry):
    • match-analyst  (pre-match preview, key stats, head-to-head)
    • personal-stats (your prediction accuracy, XP trajectory, recommended quests)
    • highlights      (post-match highlights + multilingual summary)
```

## 6. Contracts

All Solidity ^0.8.26, Foundry, OpenZeppelin v5.

### 6.1 `FanRep.sol` — Fan Reputation SBT
A soulbound ERC-721 (one per wallet) that *carries* a multi-dimensional reputation read by external apps.

- `mint()` — anyone may mint exactly one FanID for themselves; non-transferable (overrides `_update` to revert on non-mint transfers).
- `setFavoriteTeams(uint16[] teamIds)` — owner-only profile metadata.
- `score(address user) view returns (uint64 total, uint64 predictionAccuracyBps, uint64 engagementBreadth, uint64 longevityDays)` — composable read surface.
- Inputs to the score are written *only* by trusted modules (QuestEngine via a role-gated `recordXP(user, dim, amount)`). Append-only.
- Public, no admin override on user balances; admin can only register new dimensions / new trusted modules.

### 6.2 `QuestEngine.sol` — quests + XP
- `registerQuest(QuestType t, bytes32 questId, uint64 startsAt, uint64 endsAt, uint64 xpReward, bytes config)` — admin only.
- `complete(bytes32 questId, bytes attestation)` — the entry point. Behavior depends on type:
  - `SELF_ATTEST` (e.g. "watch tonight's match"): user calls directly, one-per-wallet per quest.
  - `PREDICTION` (e.g. "predict tonight's score"): user submits a hash commit *before* `endsAt`; after the OO resolves the match, anyone (or a keeper) calls `settlePrediction(questId, user, prediction)` and `xpReward` is scaled by closeness.
  - `EXTERNAL_PROOF` (e.g. "share a post that tags @KickoffFans"): admin signs an attestation off-chain; user submits it; contract verifies the signature.
- On completion, calls `FanRep.recordXP(user, dim, amount)` and emits `QuestCompleted` (used by Trophy gating + frontend).

### 6.3 `Trophy.sol` — commemorative ERC-1155
- Fixed-supply commemoratives indexed by `trophyId`. Each trophy has a deterministic mint rule (`requiredXP`, `requiredQuestIds`, optional `windowEnd`).
- `claim(uint256 trophyId)` — checks gating against `FanRep`+`QuestEngine`, mints once per wallet. Never random, never paid for the mint itself (gas only).

### 6.4 `AgentRegistry.sol` — on-chain multi-agent layer (**permissionless**)
- `registerAgent(bytes32 agentId, address agentWallet, uint128 priceWei, string endpointHint)` — **permissionless**: anyone can register an agent they operate. Kickoff seeds the registry with three first-party agents; users add their own to compete in `AgentLeague` (see 6.5).
- `callAgent(bytes32 agentId, bytes payload) payable returns (bytes32 callId)` — caller pays `priceWei` of OKB; emits `Called(callId, agentId, caller, payload)` that the off-chain service watches; service replies via `submitResult(callId, bytes result)` (signed by `agentWallet`).
- `composeAgents(bytes32[] agentIds, bytes payload)` — single-tx fan-out to multiple agents; the *Companion* uses this to assemble a briefing from match-analyst + personal-stats in one call.
- Funds flow caller → agent wallet; protocol takes 0 fee in v1 to keep the surface clean.

### 6.5 `AgentLeague.sol` — Bring-Your-Own-Agent tournament (the v2 headline ambition)
The platform jump: **anyone can deploy their own AI agent to X Layer and enter it into a free, fan-prediction tournament** for XP / reputation / a commemorative trophy. No money wagered, no money paid out — a free-skill league.

- `openSeason(uint64 startsAt, uint64 endsAt)` — admin opens a season window (e.g., a tournament stage).
- `enterAgent(bytes32 agentId)` — the agent's owner (registered in `AgentRegistry`) enters it into the active season. Free.
- `submitPrediction(bytes32 agentId, bytes32 questId, bytes32 predictionCommit)` — for any `PREDICTION`-type quest, the agent posts a hash-committed prediction before kickoff. Agents are encouraged (not required) to be autonomous; humans may submit on behalf of their agent.
- `scorePrediction(bytes32 agentId, bytes32 questId, bytes32 reveal)` — after the OO resolves the match, anyone calls this; the contract verifies the reveal against the commit + on-chain result and increments the agent's score (weighted by closeness).
- `leaderboard(uint64 seasonId)` view — ranks agents by cumulative score + accuracy + breadth.
- `closeSeason(uint64 seasonId)` — finalises rankings and lets the top-ranked agent's owner claim the **AI Champion** trophy (see §9). Idempotent, append-only.
- **Halal floor preserved:** no entry fees, no money on outcomes, no payouts in money. Pure free-skill competition for reputation + a non-tradeable trophy. Equivalent in category to free fantasy leagues.

## 7. Multi-agent system

**Three Kickoff-operated agents seed the registry.** Each runs as a small Node service (Next.js API route is fine for v1) listening to its agent's `Called` events on X Layer, calling an LLM, and replying via `submitResult`. Each charges a tiny OKB fee per call (e.g., 0.0001 OKB ≈ sub-cent) — *fee-for-service*, not wagering.

**User-deployed agents are first-class.** Anyone can register an agent in `AgentRegistry` (their own backend, any LLM, any logic) and enter it into the `AgentLeague` to compete with Kickoff's first-party agents. The protocol is the platform; the Companion is just the seed.

| Agent | Job |
|---|---|
| `match-analyst` | Pre-match preview: form, key stats, head-to-head, lineups. Sources: openfootball / API-FOOTBALL. |
| `personal-stats` | Reads `FanRep` for the caller; returns XP trajectory, prediction accuracy, recommended next quest, milestone-to-next-trophy. |
| `highlights` | Post-match: condensed text summary + key moments. Multilingual (AR/EN) via a translation pass. |

The **Companion** in the frontend isn't itself a contract — it's a thin UI that calls `AgentRegistry.composeAgents([analyst, personal, highlights], payload)` and renders the aggregated reply.

## 8. Quests (v1 catalogue)

All free. All halal. Mix of `SELF_ATTEST`, `PREDICTION`, `EXTERNAL_PROOF`.

1. **Mint your Fan ID** (one-time).
2. **Match-day attend** — "I watched today's match." Self-attest, one per match.
3. **Predict the score** — commit hash before kickoff; settled by OO; XP scaled by closeness.
4. **Team profile complete** — fill favorite teams + language.
5. **Daily fact** — read three pre-tournament facts about today's fixture; attest.
6. **Share a fan post** — paste an X URL tagging the project; admin signs an attestation.
7. **Group-stage streak** — complete the match-day quest on N consecutive days.
8. **Deploy your agent** — register an AI agent in `AgentRegistry` and enter it into the active `AgentLeague` season.

## 9. Trophies (v1 catalogue)

Fixed-supply, deterministic, no randomness.

- **First Whistle** — mint at first Fan ID + first match-day attend.
- **Group Stage Survivor** — complete match-day attend on every day of group stage in your team's group.
- **Pollster** — complete 10 predictions.
- **Sharpshooter** — predictionAccuracyBps ≥ 6000 over ≥ 20 predictions.
- **AI Champion** — your agent finishes top-ranked in an `AgentLeague` season.
- **Knockout Witness** — match-day attend on R16/QF/SF/Final days.
- **Champion of the Champions** — your favorite team wins the tournament (settled by OO).

## 10. Off-chain components

- **Keeper** (rewired from v1): tracks the WC schedule, registers match-day + prediction quests on a rolling 7-day window, proposes match results to the OO after full time, settles undisputed predictions to award XP.
- **AI services**: three Next.js API routes, each watching `Called` events for its agent and replying via `submitResult`. All multilingual.

## 11. Frontend

- **English-primary, multilingual-ready** (i18n scaffolding present, additional locales added post-launch). RTL stylesheet pass is available but is *not* the default look.
- Routes: `/` (landing + your Fan ID), `/quests` (live + upcoming), `/trophies` (gallery + claim), `/companion` (multi-agent chat), `/league` (`AgentLeague` standings + register-your-agent CTA), `/leaderboard` (XP global + by team), `/profile/[address]` (public Fan Rep view), `/team/[id]` (team page).
- OKX Wallet first; injected connectors second.
- Lean reuse of v1's Next.js scaffold, redirected at the new contracts.

## 12. Two-week plan

| Days | Deliverable |
|---|---|
| 1–2 | This design doc; new branch; reuse audit; contract interfaces stubbed. |
| 3–5 | **Five** contracts + tests (target ≥ 70 tests): `FanRep`, `QuestEngine`, `Trophy`, `AgentRegistry`, `AgentLeague`. Deploy to X Layer testnet 1952. |
| 6–8 | 3 first-party AI services wired through `AgentRegistry`; keeper rewired; sim-wallet activity; *one example user-deployed agent* to exercise the league. |
| 9–11 | Frontend rebuild on the new contracts, global UX, Companion chat, `/league` (AgentLeague standings + register-your-agent CTA). |
| 12–13 | Real on-chain seeding (quests + a couple of test trophies minted), demo flow, multilingual QA. |
| 14 | Demo video, dedicated X account posts, Google Form draft — *submit only on explicit approval*. |

## 13. Defaults (taken without further asking unless objected)

- `FanID` is **soulbound** (one per wallet, non-transferable).
- `Trophy` is ERC-1155, **gas-only** to claim (no mint fee).
- `AgentRegistry` charges **0.0001 OKB per call** by default per agent (~sub-cent); protocol fee = 0.
- `OptimisticOracle` is **reused unchanged**; same propose/120s/settle params.
- Quests are **mostly free + self-attest** with one `PREDICTION`-type per match settled by OO; `EXTERNAL_PROOF` quests use admin-signed attestations (acceptable for v1, decentralisable later via Worldcoin / on-chain proofs).

## 14. Reuse from v1 vs drop

**Reuse:** brand "Kickoff" + `kickoff.gudman.xyz` (re-skin); Next.js skeleton + nginx + systemd pipeline; `OptimisticOracle` (general purpose verifier); deploy scripts pattern; keeper pattern; sim-wallet rig; OKX Wallet integration; Foundry / SDK / docs scaffold.

**Drop from live system (kept in git history):** `FixedProductMarketMaker`, `ConditionalTokens` (betting use), `ParlayBook`, `LimitOrderBook`, the v3 deployed addresses, the v3 frontend trading surface, the v3 seed scripts. The v1 betting deployment on testnet stays viewable on OKLink as legacy.

## 15. Submission strategy (X Cup)

- **Tracks hit:** Social (Fan ID + leaderboards + sharing), NFT (Trophies + composable Fan Rep SBT), AI Agent (multi-agent Companion **+ Bring-Your-Own-Agent league**). Three of six eligible — and the AI Agent track is hit *as a platform*, not as a feature.
- **OKX strategic story:** every free quest + every Companion call + every league prediction is a real X Layer transaction and incremental OKB demand. The `AgentLeague` is OKX's OnchainOS thesis demonstrated end-to-end: *anyone* can ship and run an autonomous agent on X Layer — see [`agents/v2-example-byo/`](../agents/v2-example-byo/) for a fork-and-go tutorial.
- **Hard prerequisites at submission:** dedicated X account active, repo public, live demo at `kickoff.gudman.xyz`, contracts verifiable on OKLink, demo video. *Nothing gets submitted without explicit owner approval.*

## 16. Risks + open questions (acknowledged, not blocking)

- `EXTERNAL_PROOF` attestations are admin-signed in v1 → centralised; flagged in docs, decentralisable later.
- AI service availability is operational; minimum-viable retries + graceful UI fallback.
- API-FOOTBALL is gated on a paid key; openfootball CC0 covers the demo period; flagged.
- OKLink contract verification needs an API key; nice-to-have for the demo.
- Real World Cup matches don't begin until 2026-06-11; demo must clearly label any pre-tournament settlement as *simulated*.

---

*The v1 (FPMM-based prediction-market) design is preserved in `docs/ARCHITECTURE.md` for history. v2 supersedes it from this branch forward.*
