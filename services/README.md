# Kickoff v2 — first-party AI agent services

Three small TypeScript Node services that back Kickoff's multi-agent Companion. Each
service runs as its own process, watches its agent's `Called(callId, agentId, caller, payload)`
events on `AgentRegistry` (X Layer testnet 1952), runs an LLM call, and replies via
`AgentRegistry.submitResult(callId, bytes result)` signed by the agent's wallet.

| Service | Purpose |
|---|---|
| [`match-analyst`](./match-analyst) | Pre-match preview: form, key stats, head-to-head. Reads openfootball CC0 data. |
| [`personal-stats`](./personal-stats) | Reads `FanRep` for the caller and returns XP trajectory + accuracy + recommended next quest. |
| [`highlights`](./highlights) | Post-match condensed plain-text summary. |

## Design constraint (non-negotiable)

These are **information** services. No betting logic, no payouts tied to outcomes, no
randomness with stakes. The fee charged at `AgentRegistry.callAgent` is fee-for-service
(see `KICKOFF-V2-DESIGN.md` §6.4 and §7).

## Quickstart (per service)

```bash
cd services/match-analyst        # or personal-stats / highlights
npm install
cp env-example .env              # fill in (never commit .env). The template
                                  # is named `env-example` because a pre-commit
                                  # hook blocks writing dotfiles named `.env*`.
# Demo without an LLM key — deterministic stub responses:
OFFLINE_MODE=1 npm start
# Type-check:
npm run typecheck
```

## What every service does (the lifecycle)

```
caller -> AgentRegistry.callAgent(agentId, payload) {value: priceWei}
                       │
                       ▼ emits Called(callId, agentId, caller, payload)
                       │
            ┌──────────┴──────────┐
            │  this service       │  watchContractEvent('Called') filtered by agentId
            │                     │
            │  decodes payload    │
            │  runLLM(prompt)     │  (or OFFLINE_MODE deterministic stub)
            │                     │
            │  signs as           │
            │  agentWallet        │
            └──────────┬──────────┘
                       │
                       ▼
            AgentRegistry.submitResult(callId, bytes result)
```

## Why each service is standalone

Per the design doc each service is its own deployable. A shared workspace package would
make ops harder (one bad release breaks all three) and these are tiny — three small files
each, the ABIs are interface-level. The repeated `lib/v2-abis.ts` is a deliberate trade.

## Environment

Every service uses the same env shape:

| Var | Required | Notes |
|---|---|---|
| `RPC_URL` | yes | `https://testrpc.xlayer.tech/terigon` for X Layer testnet. |
| `CHAIN_ID` | yes | `1952` for X Layer testnet. |
| `AGENT_REGISTRY` | yes | Deployed `AgentRegistry` address. |
| `AGENT_ID` | yes | `bytes32` agent id (e.g., `keccak256("kickoff.match-analyst.v1")`). |
| `AGENT_PK` | yes (live) | Private key for the agent wallet that signs `submitResult`. Never written to disk. |
| `LLM_API_KEY` | optional | Provider API key; consumed by `runLLM`. Omit to use a stub. |
| `LLM_MODEL` | optional | Model identifier. Default: provider-specific. |
| `OFFLINE_MODE` | optional | `1` to bypass the network call entirely and emit deterministic stubs (demo mode). |
| `FAN_REP` | personal-stats only | Deployed `FanRep` address (to read `score()`). |

## Notes

- All three services use `viem ^2.50` (matches the rest of the repo). No SDK dependencies.
- TypeScript with `tsc --noEmit` for type-checks. There is no build artifact required —
  each service runs with `node --experimental-strip-types` (Node ≥ 22.6).
- `AgentRegistry.sol` and `AgentLeague.sol` are **specified** in `docs/KICKOFF-V2-DESIGN.md`
  §6.4 and §6.5 but not yet implemented in `contracts/src/`. The ABIs in these services
  are hand-rolled from the design doc and will be regenerated from the Foundry artifacts
  once the contracts land.
