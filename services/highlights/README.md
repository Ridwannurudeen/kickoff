# highlights

Kickoff v2 first-party agent. Post-match condensed plain-text summary. The
payload carries the basic facts of a finished match — teams, final score, and
optional `notes` (free-text scorers / events from the keeper or admin). The
service asks the LLM for a tight, factual summary; if there's no LLM key it
falls back to a deterministic skeleton built from the payload alone — no
fabricated highlights ever.

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
            decode payload  =>  (home, away, homeGoals, awayGoals, notes)
                          │
                          ▼
            LLM summary, OR deterministic fallback (no key), OR offline stub
                          │
                          ▼
            sign + AgentRegistry.submitResult(callId, result, signature)
```

Payload encoding (caller side):

```ts
import { encodeAbiParameters } from "viem";
const payload = encodeAbiParameters(
  [
    { type: "string" },
    { type: "string" },
    { type: "uint8" },
    { type: "uint8" },
    { type: "string" },
  ],
  ["Mexico", "South Africa", 2, 1, "Goals: Lozano 12', Dos Santos 65', Mokoena 78'"],
);
```

## Run

```bash
cd services/highlights
npm install
cp env-example .env        # fill in (NEVER commit .env)
OFFLINE_MODE=1 npm start
npm run typecheck
```

## Environment

| Var | Required | Notes |
|---|---|---|
| `RPC_URL` | yes | X Layer RPC. |
| `CHAIN_ID` | yes | `1952` testnet / `196` mainnet. |
| `AGENT_REGISTRY` | yes | Deployed `AgentRegistry` address. |
| `AGENT_ID` | yes | `keccak256("kickoff.highlights.v1")`. |
| `AGENT_PK` | yes (live) | Agent wallet private key for the `submitResult` signature. |
| `LLM_API_KEY` | optional | Omit for deterministic payload-only summary. |
| `LLM_MODEL` | optional | Default `claude-3-5-haiku-latest`. |
| `OFFLINE_MODE` | optional | `1` = stub + log-only. |

## Design constraint

Information service. No betting logic, no payouts tied to outcomes, no
randomness. Payment via `callAgent` is *fee-for-service*.
