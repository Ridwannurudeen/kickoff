/**
 * Typed ABI fragments for the Kickoff v2 contracts. Signatures mirror the
 * design doc (docs/KICKOFF-V2-DESIGN.md §6) and the in-tree Solidity sources
 * (FanRep.sol, QuestEngine.sol). The Trophy / AgentRegistry / AgentLeague
 * ABIs follow the doc literally; the main thread will regenerate them from
 * the Foundry artifacts once the contracts land.
 *
 * `as const` is preserved so wagmi/viem can infer function arg + return types.
 */

// ─── FanRep ───────────────────────────────────────────────────────────────
//
// Soulbound ERC-721; one Fan ID per wallet. Composable, multi-dim reputation
// surface read via `score(user)`. `recordXP` is gated to trusted modules.

export const fanRepAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setFavoriteTeams",
    stateMutability: "nonpayable",
    inputs: [{ name: "teamIds", type: "uint16[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "favoriteTeamsOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint16[]" }],
  },
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
    name: "hasFanId",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "fanIdOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mintedAt",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "xpOf",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "dim", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "event",
    name: "FanMinted",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "XPRecorded",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "dim", type: "bytes32", indexed: true },
      { name: "amount", type: "uint64", indexed: false },
      { name: "newDimTotal", type: "uint64", indexed: false },
      { name: "newGrandTotal", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FavoriteTeamsSet",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "teamIds", type: "uint16[]", indexed: false },
    ],
  },
] as const;

// ─── QuestEngine ──────────────────────────────────────────────────────────
//
// SELF_ATTEST, PREDICTION, EXTERNAL_PROOF. XP is credited to a FanRep
// dimension on success.

export const questEngineAbi = [
  {
    type: "function",
    name: "completeSelfAttest",
    stateMutability: "nonpayable",
    inputs: [{ name: "questId", type: "bytes32" }],
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
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "predictionCommit",
    stateMutability: "view",
    inputs: [
      { name: "questId", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
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
    name: "QuestCompleted",
    inputs: [
      { name: "questId", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "xpAwarded", type: "uint64", indexed: false },
    ],
  },
] as const;

// ─── Trophy ───────────────────────────────────────────────────────────────
//
// ERC-1155 commemoratives. Deterministic claim conditions; never random,
// never paid (gas-only).

export const trophyAbi = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "trophyId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimable",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "trophyId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "trophyInfo",
    stateMutability: "view",
    inputs: [{ name: "trophyId", type: "uint256" }],
    outputs: [
      { name: "requiredXP", type: "uint64" },
      { name: "windowEnd", type: "uint64" },
      { name: "maxSupply", type: "uint64" },
      { name: "minted", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "uri",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "event",
    name: "TrophyClaimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "trophyId", type: "uint256", indexed: true },
    ],
  },
] as const;

// ─── AgentRegistry ────────────────────────────────────────────────────────
//
// Permissionless registry of fee-for-service agents. Caller pays OKB,
// off-chain service replies via submitResult.

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
    name: "callAgent",
    stateMutability: "payable",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "payload", type: "bytes" },
    ],
    outputs: [{ name: "callId", type: "bytes32" }],
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
    name: "submitResult",
    stateMutability: "nonpayable",
    inputs: [
      { name: "callId", type: "bytes32" },
      { name: "result", type: "bytes" },
    ],
    outputs: [],
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
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "agentWallet", type: "address", indexed: true },
      { name: "priceWei", type: "uint128", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Called",
    inputs: [
      { name: "callId", type: "bytes32", indexed: true },
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "payload", type: "bytes", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ResultSubmitted",
    inputs: [
      { name: "callId", type: "bytes32", indexed: true },
      { name: "result", type: "bytes", indexed: false },
    ],
  },
] as const;

// ─── AgentLeague ──────────────────────────────────────────────────────────
//
// Free-skill tournament for AI agents. Anyone may enter their registered
// agent into the active season; the contract scores predictions vs OO-
// resolved results.

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
    outputs: [],
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
    name: "activeSeason",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "seasonId", type: "uint64" },
      { name: "startsAt", type: "uint64" },
      { name: "endsAt", type: "uint64" },
      { name: "open", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "agentScore",
    stateMutability: "view",
    inputs: [
      { name: "seasonId", type: "uint64" },
      { name: "agentId", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint64" }],
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
    ],
  },
  {
    type: "event",
    name: "PredictionScored",
    inputs: [
      { name: "seasonId", type: "uint64", indexed: true },
      { name: "agentId", type: "bytes32", indexed: true },
      { name: "questId", type: "bytes32", indexed: true },
      { name: "weight", type: "uint64", indexed: false },
    ],
  },
] as const;
