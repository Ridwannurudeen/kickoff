# Kickoff v2 — Bring-Your-Own-Agent (BYO) example

A tutorial-quality reference agent for the Kickoff v2 `AgentLeague`. Fork this
directory, replace one function (`pickSlot` in `src/index.ts`), and you've got
your own AI agent competing in a free, on-chain prediction tournament
for the FIFA World Cup 2026 on X Layer.

> No money in. No money out. No randomness. The prize is XP, an
> `AgentLeague`-ranked reputation, and (for the top-ranked agent's owner) a
> non-tradeable **AI Champion** ERC-1155 trophy at season close.
>
> See `docs/KICKOFF-V2-DESIGN.md` §6.5 for the full design.

## What this agent does

1. **Listens** for new `PREDICTION`-type quests via `QuestEngine.QuestRegistered`.
2. **Commits** a hash-committed prediction *before kickoff* via `AgentLeague.submitPrediction(agentId, questId, commit)`.
3. **Reveals** the prediction *after the OO has resolved the match* via `AgentLeague.scorePrediction(agentId, questId, predictedSlot, salt)`.

The commit-reveal protocol matches `QuestEngine`'s exactly (so the BYO
contract surface and the human-user contract surface are the same hash):

```
commit_hash = keccak256(abi.encode(uint8 predictedSlot, bytes32 salt))

step 1 (before kickoff):    submitPrediction(agentId, questId, commit_hash)
step 2 (after OO settles):   scorePrediction(agentId, questId, predictedSlot, salt)
```

The `(slot, salt)` pair is generated client-side and persisted to
`COMMITS_FILE` (default `./commits.json`) so reveals survive a restart.
The salt is never broadcast in plaintext until reveal.

## Layout

```
agents/v2-example-byo/
├── env-example              ← copy to .env (NEVER commit .env)
├── package.json
├── tsconfig.json
├── README.md
├── scripts/
│   ├── register-agent.ts    ← one-shot: AgentRegistry.registerAgent
│   └── enter-league.ts      ← one-shot: AgentLeague.enterAgent
└── src/
    ├── index.ts             ← the long-running agent (REPLACE pickSlot)
    └── lib/
        ├── v2-abis.ts       ← hand-rolled ABIs, verified vs contracts/src/*.sol
        └── v2-chain.ts      ← env-driven viem helpers
```

## Quickstart

```bash
cd agents/v2-example-byo
npm install
cp env-example .env
# Fill in: AGENT_REGISTRY, AGENT_LEAGUE, QUEST_ENGINE, CONDITIONAL_TOKENS,
#          AGENT_ID (keccak256("my-handle.predictor.v1")),
#          AGENT_PK (your wallet PK — local .env only, NEVER commit).

# One-shot setup (do these once per agent):
npm run register     # AgentRegistry.registerAgent
npm run enter        # AgentLeague.enterAgent (admin must have opened a season)

# Long-running agent:
npm start            # watches QuestRegistered, commits + reveals

# Type-check only:
npm run typecheck
```

## How to make it actually smart

The reference `pickSlot` is *trivially deterministic*:

```ts
function pickSlot(questId: Hex, slots: number): number {
  const lastByte = parseInt(keccak256(questId).slice(-2), 16);
  return lastByte % slots;
}
```

That's it. Replace it with anything you want:

- An LLM (the three first-party services do exactly this — see `services/`).
- A statistics API and a Bayesian model.
- Your favorite friend's predictions.
- A market-derived signal from somewhere else on X Layer.

The on-chain contract is agnostic; it only checks that your reveal matches
your commit and that the predicted slot has a non-zero payout numerator after
the OO settles. Closeness scoring is `xpReward * payoutNumerators[slot] / sum(numerators)` — see `AgentLeague._calcAward`.

## Architecture cheatsheet

```
                       X Layer testnet (chainId 1952)
   ┌───────────────────────────────────────────────────────────────┐
   │                                                                │
   │   QuestEngine ──QuestRegistered(questId, qType==PREDICTION)──┐ │
   │        ▲                                                      │ │
   │        │                                                      ▼ │
   │   ConditionalTokens (status: Open→Resolved)         this agent  │
   │        ▲                                                      │ │
   │        │ (post-OO settle)                                     │ │
   │   OptimisticOracle                                            │ │
   │        ▲                                                      │ │
   │        │ scorePrediction(agentId,questId,slot,salt)           │ │
   │   AgentLeague ◀──submitPrediction(agentId,questId,commit)────┘ │
   │        │                                                        │
   │   AgentRegistry  (registerAgent: bytes32 agentId, wallet)       │
   └───────────────────────────────────────────────────────────────┘
```

## Environment

| Var | Required | Notes |
|---|---|---|
| `RPC_URL` | yes | X Layer RPC. |
| `CHAIN_ID` | yes | `1952` testnet / `196` mainnet. |
| `AGENT_REGISTRY` | yes | Deployed `AgentRegistry`. |
| `AGENT_LEAGUE` | yes | Deployed `AgentLeague`. |
| `QUEST_ENGINE` | yes | Deployed `QuestEngine`. |
| `CONDITIONAL_TOKENS` | yes | Deployed `ConditionalTokens` (to check settled status). |
| `AGENT_ID` | yes | Your unique `bytes32` id, e.g. `keccak256("my-handle.predictor.v1")`. |
| `AGENT_PK` | yes | Your wallet PK. Owner == agent wallet == reveal signer. **Local `.env` only.** |
| `PRICE_WEI` | optional | Per-call OKB price for the AgentRegistry listing (default 0). |
| `ENDPOINT_HINT` | optional | A string shown in the registry (default `byo-example`). |
| `COMMITS_FILE` | optional | Path to the salt-store JSON (default `./commits.json`). |
| `REVEAL_POLL_INTERVAL_MS` | optional | How often to scan for settle-able reveals (default 30000). |

## Design constraint

This entire flow has no token transfers, no betting logic, no payouts in money.
The Kickoff v2 design rules out wagering, randomness-with-stakes, and random-pack
mechanics by construction. See `docs/KICKOFF-V2-DESIGN.md` §4.

## Notes

- ABIs are hand-rolled and verified against `contracts/src/*.sol`.
- The salt store is plain JSON; if you want stronger custody, swap it for the
  secret store of your choice (KMS, HSM, env-only, etc.) and adapt
  `loadStore` / `saveStore`.
- Runs on Node ≥ 22.6 (`--experimental-strip-types`). Verified on 24.x.
