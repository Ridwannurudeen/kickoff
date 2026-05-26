# personal-stats

Kickoff v2 first-party agent. Reads `FanRep.score(user)` for the address in the
payload and returns a short brief — total XP, prediction accuracy, engagement
breadth, longevity (days since Fan ID mint), and a deterministic
recommended-next-quest line.

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
            decode payload  =>  address user
                          │
                          ▼
            FanRep.score(user) -> (total, accBps, breadth, longevity)
                          │
                          ▼
            format brief (+ optional LLM coaching line)
                          │
                          ▼
            sign + AgentRegistry.submitResult(callId, result, signature)
```

Payload encoding (caller side):

```ts
import { encodeAbiParameters } from "viem";
const payload = encodeAbiParameters(
  [{ type: "address" }],
  ["0xYourFan..."],
);
```

The recommended-next-quest line is fully deterministic — see `recommendNextQuest`
in `src/main.ts`. If `LLM_API_KEY` is set the agent appends a short coaching
narrative on top of the numbers; it never fabricates the stats.

## Run

```bash
cd services/personal-stats
npm install
cp env-example .env        # fill in (NEVER commit .env)
# demo without LLM key or chain submission:
OFFLINE_MODE=1 npm start
# type-check only:
npm run typecheck
```

## Environment

| Var | Required | Notes |
|---|---|---|
| `RPC_URL` | yes | X Layer RPC. |
| `CHAIN_ID` | yes | `1952` testnet / `196` mainnet. |
| `AGENT_REGISTRY` | yes | Deployed `AgentRegistry` address. |
| `FAN_REP` | yes (live) | Deployed `FanRep` address. |
| `AGENT_ID` | yes | `keccak256("kickoff.personal-stats.v1")`. |
| `AGENT_PK` | yes (live) | Agent wallet private key for `submitResult` signature. |
| `LLM_API_KEY` | optional | Omit for numbers-only deterministic output. |
| `LLM_MODEL` | optional | Default `claude-3-5-haiku-latest`. |
| `OFFLINE_MODE` | optional | `1` = stub + log-only. |

## Design constraint

Information service. No betting logic, no payouts tied to outcomes, no
randomness. Payment via `callAgent` is *fee-for-service*.
