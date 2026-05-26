// Hand-rolled ABIs for the v2 contracts the off-chain services interact with.
//
// Verified against the on-chain sources in this repo:
//   contracts/src/AgentRegistry.sol  (lines 45-188)
//   contracts/src/AgentLeague.sol    (lines 105-365)
//   contracts/src/FanRep.sol         (lines 96-153)
//   contracts/src/QuestEngine.sol    (lines 56-221)
//   contracts/src/OptimisticOracle.sol
import type { Abi } from "viem";

export const agentRegistryAbi = [
  {
    type: "function",
    name: "registerAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "agentWallet", type: "address" },
      { name: "priceWei", type: "uint128" },
      { name: "endpointHint", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "agentWallet", type: "address" },
      { name: "priceWei", type: "uint128" },
      { name: "endpointHint", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "callAgent",
    stateMutability: "payable",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "payload", type: "bytes" },
    ],
    outputs: [{ name: "callId", type: "bytes32" }],
  },
  {
    // submitResult takes a signature binding the result to {address(this),
    // chainid, callId, keccak256(result)} — see AgentRegistry.sol:149-163.
    type: "function",
    name: "submitResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "callId", type: "bytes32" },
      { name: "result", type: "bytes" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "composeAgents",
    stateMutability: "payable",
    inputs: [
      { name: "agentIds", type: "bytes32[]" },
      { name: "payload", type: "bytes" },
    ],
    outputs: [{ name: "callIds", type: "bytes32[]" }],
  },
  {
    type: "function",
    name: "getAgent",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "bytes32" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "agentWallet", type: "address" },
      { name: "priceWei", type: "uint128" },
      { name: "endpointHint", type: "string" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getCall",
    stateMutability: "view",
    inputs: [{ name: "callId", type: "bytes32" }],
    outputs: [
      { name: "agentId", type: "bytes32" },
      { name: "caller", type: "address" },
      { name: "paid", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "callerNonce",
    stateMutability: "view",
    inputs: [{ name: "caller", type: "address" }],
    outputs: [{ type: "uint64" }],
  },
  {
    // Called(callId indexed, agentId indexed, caller indexed, paid, payload)
    // — five fields total, `paid` between `caller` and `payload`. See
    // AgentRegistry.sol:47.
    type: "event",
    name: "Called",
    inputs: [
      { name: "callId", type: "bytes32", indexed: true },
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "paid", type: "uint256", indexed: false },
      { name: "payload", type: "bytes", indexed: false },
    ],
  },
  {
    // AgentRegistry.sol:48 names this `Replied`, not `ResultSubmitted`.
    type: "event",
    name: "Replied",
    inputs: [
      { name: "callId", type: "bytes32", indexed: true },
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "result", type: "bytes", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "agentWallet", type: "address", indexed: false },
      { name: "priceWei", type: "uint128", indexed: false },
    ],
  },
] as const satisfies Abi;

export const agentLeagueAbi = [
  {
    type: "function",
    name: "openSeason",
    stateMutability: "nonpayable",
    inputs: [
      { name: "startsAt", type: "uint64" },
      { name: "endsAt", type: "uint64" },
    ],
    outputs: [{ name: "seasonId", type: "uint64" }],
  },
  {
    type: "function",
    name: "activeSeason",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "seasonId", type: "uint64" }],
  },
  {
    type: "function",
    name: "enterAgent",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "submitPrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "questId", type: "bytes32" },
      { name: "predictionCommit", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "scorePrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "questId", type: "bytes32" },
      { name: "predictedSlot", type: "uint8" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [{ name: "awarded", type: "uint64" }],
  },
  {
    // AgentLeague.sol returns 3 parallel arrays (agentIds, scores, owners).
    type: "function",
    name: "leaderboard",
    stateMutability: "view",
    inputs: [{ name: "seasonId", type: "uint64" }],
    outputs: [
      { name: "agentIds", type: "bytes32[]" },
      { name: "scores", type: "uint64[]" },
      { name: "owners", type: "address[]" },
    ],
  },
  {
    type: "function",
    name: "closeSeason",
    stateMutability: "nonpayable",
    inputs: [{ name: "seasonId", type: "uint64" }],
    outputs: [],
  },
  {
    type: "function",
    name: "activeSeasonId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "getSeason",
    stateMutability: "view",
    inputs: [{ name: "seasonId", type: "uint64" }],
    outputs: [
      { name: "startsAt", type: "uint64" },
      { name: "endsAt", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "winnerAgentId", type: "bytes32" },
      { name: "winnerScore", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "getEntry",
    stateMutability: "view",
    inputs: [
      { name: "seasonId", type: "uint64" },
      { name: "agentId", type: "bytes32" },
    ],
    outputs: [
      { name: "entered", type: "bool" },
      { name: "score", type: "uint64" },
      { name: "enterIndex", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "SeasonOpened",
    inputs: [
      { name: "seasonId", type: "uint64", indexed: true },
      { name: "startsAt", type: "uint64", indexed: false },
      { name: "endsAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AgentEntered",
    inputs: [
      { name: "seasonId", type: "uint64", indexed: true },
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const satisfies Abi;

// Verified against contracts/src/FanRep.sol (the `score` view is the canonical
// composable read surface — see FanRep.sol:125-137).
export const fanRepAbi = [
  {
    type: "function",
    name: "score",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "total", type: "uint64" },
      { name: "predictionAccuracyBps", type: "uint64" },
      { name: "engagementBreadth", type: "uint64" },
      { name: "longevityDays", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "xpOf",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "dim", type: "bytes32" },
    ],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "hasFanId",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "fanIdOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "mintedAt",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint64" }],
  },
] as const satisfies Abi;

// Verified against contracts/src/QuestEngine.sol (lines 56-127).
export const questEngineAbi = [
  {
    type: "function",
    name: "registerQuest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "qType", type: "uint8" },
      { name: "questId", type: "bytes32" },
      { name: "startsAt", type: "uint64" },
      { name: "endsAt", type: "uint64" },
      { name: "xpReward", type: "uint64" },
      { name: "dim", type: "bytes32" },
      { name: "config", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "commitPrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "questId", type: "bytes32" },
      { name: "commit_", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "settlePrediction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "questId", type: "bytes32" },
      { name: "user", type: "address" },
      { name: "predictedSlot", type: "uint8" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "completeSelfAttest",
    stateMutability: "nonpayable",
    inputs: [{ name: "questId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "completeExternalProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "questId", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "completed",
    stateMutability: "view",
    inputs: [
      { name: "questId", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "predictionCommit",
    stateMutability: "view",
    inputs: [
      { name: "questId", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "getQuest",
    stateMutability: "view",
    inputs: [{ name: "questId", type: "bytes32" }],
    outputs: [
      { name: "qType", type: "uint8" },
      { name: "startsAt", type: "uint64" },
      { name: "endsAt", type: "uint64" },
      { name: "xpReward", type: "uint64" },
      { name: "dim", type: "bytes32" },
      { name: "config", type: "bytes" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "QuestRegistered",
    inputs: [
      { name: "questId", type: "bytes32", indexed: true },
      { name: "qType", type: "uint8", indexed: false },
      { name: "startsAt", type: "uint64", indexed: false },
      { name: "endsAt", type: "uint64", indexed: false },
      { name: "xpReward", type: "uint64", indexed: false },
      { name: "dim", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PredictionCommitted",
    inputs: [
      { name: "questId", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "commit", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "QuestCompleted",
    inputs: [
      { name: "questId", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "xpAwarded", type: "uint64", indexed: false },
    ],
  },
] as const satisfies Abi;

// OptimisticOracle ABI verified against contracts/src/OptimisticOracle.sol.
export const optimisticOracleAbi = [
  {
    type: "function",
    name: "propose",
    stateMutability: "nonpayable",
    inputs: [
      { name: "conditionId", type: "bytes32" },
      { name: "payouts", type: "uint256[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [
      { name: "proposer", type: "address" },
      { name: "disputer", type: "address" },
      { name: "proposedAt", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "payouts", type: "uint256[]" },
    ],
  },
  {
    type: "function",
    name: "bondAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "liveness",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "bondToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const satisfies Abi;

export const conditionalTokensAbi = [
  {
    type: "function",
    name: "conditionStatus",
    stateMutability: "view",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "getOutcomeSlotCount",
    stateMutability: "view",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "payoutNumerators",
    stateMutability: "view",
    inputs: [{ name: "conditionId", type: "bytes32" }],
    outputs: [{ type: "uint256[]" }],
  },
] as const satisfies Abi;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const satisfies Abi;
