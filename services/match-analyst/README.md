# match-analyst

Kickoff v2 first-party agent. Pre-match preview: form, key stats, head-to-head.
Reads the openfootball CC0 World Cup 2026 schedule for context, calls an LLM,
and submits a signed result back on chain.

## On-chain lifecycle

```
caller -> AgentRegistry.callAgent(agentId, payload) { value: priceWei }
                          │
                          ▼
                  Called(callId, agentId, caller, paid, payload)
                          │
                          ▼
            this service watches Called for our agentId
                          │
                          ▼
            decode payload  =>  { home: string, away: string }
                          │
                          ▼
            fetch openfootball CC0 schedule (1h cached)
                          │
                          ▼
            prompt LLM (or OFFLINE_MODE stub)
                          │
                          ▼
            sign keccak256(abi.encode(registry, chainid, callId, keccak256(result)))
            with the agent wallet
                          │
                          ▼
            AgentRegistry.submitResult(callId, result, signature)
```

Payload encoding (caller side):

```ts
import { encodeAbiParameters } from "viem";
const payload = encodeAbiParameters(
  [{ type: "string" }, { type: "string" }],
  ["Mexico", "South Africa"],
);
```

Result encoding (this service): ABI-encoded `string` (one tuple of `string`).

## Run

```bash
cd services/match-analyst
npm install
cp env-example .env        # fill in (NEVER commit .env). The template is
                            # named `env-example` because a hook blocks `.env*` writes.
# demo without an LLM key + without a live chain submission:
OFFLINE_MODE=1 npm start
# type-check only:
npm run typecheck
```

## Environment

| Var | Required | Notes |
|---|---|---|
| `RPC_URL` | yes | X Layer RPC. Default `https://testrpc.xlayer.tech/terigon`. |
| `CHAIN_ID` | yes | `1952` for X Layer testnet (`196` for mainnet). |
| `AGENT_REGISTRY` | yes | Deployed `AgentRegistry` address. |
| `AGENT_ID` | yes | `bytes32` agent id (`keccak256("kickoff.match-analyst.v1")`). |
| `AGENT_PK` | yes (live) | Private key for the agent wallet that signs `submitResult`. Live mode only. |
| `LLM_API_KEY` | optional | Anthropic key. Omit to emit `[no-LLM-key]` stubs. |
| `LLM_MODEL` | optional | Model id. Default `claude-3-5-haiku-latest`. |
| `OFFLINE_MODE` | optional | `1` = deterministic stub + log-only (no chain tx). Demo mode. |

## Design constraint

This is an **information** service. No betting logic, no payouts tied to
outcomes, no randomness. `AgentRegistry.callAgent` payment is *fee-for-service*
(`KICKOFF-V2-DESIGN.md` §6.4).

## Notes

- `viem ^2.50` only; no SDK dependencies.
- Runs with `node --experimental-strip-types` (Node ≥ 22.6 required; verified on
  Node 24.x).
- ABIs are hand-rolled and verified against `contracts/src/*.sol`.
